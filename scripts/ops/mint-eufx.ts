import { ethers } from "hardhat";
import { getBasketDefinition, getBasketId, getBasketManager, requireAddressEnv } from "./basket-helpers";

const BASKET_KEY = "EUFX" as const;
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

function parseArgs(): {
  amount: string;
  minTokens: string;
  beneficiary?: string;
  proofHash?: string;
} {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (positional.length < 1) {
    console.log(
      "Usage: npx hardhat run scripts/ops/mint-eufx.ts -- <baseAmount> [minTokensOut] [beneficiary] [proofHash]"
    );
    console.log("Example: npx hardhat run scripts/ops/mint-eufx.ts -- 1000 0 0xYourAddress 0xproofhash");
    process.exit(1);
  }

  const [amount, minTokens = "0", beneficiary, proofHash] = positional;
  return { amount, minTokens, beneficiary, proofHash };
}

function ensureHex(hash: string | undefined): string {
  if (!hash) {
    return ethers.ZeroHash;
  }
  if (!ethers.isHexString(hash, 32)) {
    throw new Error(`proofHash must be 32-byte hex string, received: ${hash}`);
  }
  return hash;
}

async function main(): Promise<void> {
  const { amount, minTokens, beneficiary: beneficiaryInput, proofHash: proofHashInput } = parseArgs();
  const basket = getBasketDefinition(BASKET_KEY);
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const tokenAddress = requireAddressEnv(basket.tokenEnv);

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const manager = await getBasketManager(managerAddress);
  const basketId = await getBasketId(manager, basket);
  const state = await manager.basketState(basketId);
  if (state.token === ethers.ZeroAddress) {
    throw new Error(`Basket ${basket.key} is not registered yet.`);
  }
  if (state.token.toLowerCase() !== tokenAddress.toLowerCase()) {
    console.warn(`⚠️  BasketManager token ${state.token} differs from ${tokenAddress} (env ${basket.tokenEnv})`);
  }

  const baseAssetAddress: string = await manager.baseAsset();
  const baseAsset = new ethers.Contract(baseAssetAddress, ERC20_ABI, signer);
  const basketToken = await ethers.getContractAt("BasketToken", state.token);

  const baseDecimals: number = await baseAsset.decimals();
  const tokenDecimals = await basketToken.decimals();

  const baseAmount = ethers.parseUnits(amount, baseDecimals);
  const minTokensOut = ethers.parseUnits(minTokens, tokenDecimals);
  const beneficiary = beneficiaryInput ?? signer.address;
  const proofHash = ensureHex(proofHashInput);

  console.log("🪙 Minting EUFX basket token");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  console.log(`💱 Base asset: ${baseAssetAddress} (decimals ${baseDecimals})`);
  console.log(`🎯 Beneficiary: ${beneficiary}`);
  console.log(`💵 Base amount: ${ethers.formatUnits(baseAmount, baseDecimals)}`);
  console.log(`🎯 Min tokens out: ${ethers.formatUnits(minTokensOut, tokenDecimals)}`);
  console.log(`🔏 Proof hash: ${proofHash}`);

  const balanceBefore = await baseAsset.balanceOf(signer.address);
  const tokenBalanceBefore = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance: ${ethers.formatUnits(balanceBefore, baseDecimals)}`);
  console.log(`🎟️  Beneficiary EUFX balance: ${ethers.formatUnits(tokenBalanceBefore, tokenDecimals)}`);

  const allowance = await baseAsset.allowance(signer.address, managerAddress);
  if (allowance < baseAmount) {
    console.log(`🔐 Granting allowance ${ethers.formatUnits(baseAmount, baseDecimals)} to BasketManager`);
    const approveTx = await baseAsset.approve(managerAddress, baseAmount);
    console.log(`   📤 Approve tx: ${approveTx.hash}`);
    await approveTx.wait();
  }

  const preview = await manager.mint.staticCall(
    basket.region,
    basket.strategy,
    baseAmount,
    minTokensOut,
    beneficiary,
    proofHash
  );
  console.log(`🔍 Preview tokens out: ${ethers.formatUnits(preview, tokenDecimals)} (nav-driven estimate)`);

  const tx = await manager.mint(basket.region, basket.strategy, baseAmount, minTokensOut, beneficiary, proofHash);
  console.log(`🚀 Mint transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Mint confirmed in block ${receipt?.blockNumber ?? "unknown"}`);

  const balanceAfter = await baseAsset.balanceOf(signer.address);
  const tokenBalanceAfter = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance (post): ${ethers.formatUnits(balanceAfter, baseDecimals)}`);
  console.log(`🎟️  Beneficiary EUFX balance (post): ${ethers.formatUnits(tokenBalanceAfter, tokenDecimals)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Mint failed:", error);
    process.exitCode = 1;
  });
}

export { main };
