import { ethers } from "./hardhat-runtime";
import {
  BASKETS,
  BasketKey,
  getBasketDefinition,
  getBasketId,
  getBasketManager,
  logDryRunNotice,
  parseDryRunFlag,
  requireAddressEnv,
} from "./basket-helpers";
// basketIds available at scripts/ops/basketIds.ts if needed

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

type ExecutionConfig = {
  readonly basketKey: BasketKey;
  readonly amount: string;
  readonly minTokens: string;
  readonly beneficiary?: string;
  readonly proofHash?: string;
};

function readEnv(name: string): string | undefined {
  return process.env[name] ?? process.env[name.toUpperCase()];
}

function resolveConfig(): ExecutionConfig {
  const basketKeyInput = readEnv("MINT_BASKET_KEY") ?? readEnv("BASKET_KEY") ?? readEnv("BASKET") ?? "";
  const amount = readEnv("MINT_BASE_AMOUNT") ?? readEnv("BASE_AMOUNT");
  const minTokens = readEnv("MINT_MIN_TOKENS") ?? readEnv("MIN_TOKENS") ?? "0";
  const beneficiary = readEnv("MINT_BENEFICIARY") ?? readEnv("BENEFICIARY");
  const proofHash = readEnv("MINT_PROOF_HASH") ?? readEnv("PROOF_HASH");

  if (!basketKeyInput) {
    throw new Error(`Missing basket key. Set MINT_BASKET_KEY (one of ${BASKETS.map((item) => item.key).join(", ")}).`);
  }
  if (!amount) {
    throw new Error("Missing base amount. Set MINT_BASE_AMOUNT (human-readable units).");
  }

  const key = basketKeyInput.toUpperCase() as BasketKey;
  if (!BASKETS.some((item) => item.key === key)) {
    throw new Error(
      `Unknown basket key ${basketKeyInput}. Supported keys: ${BASKETS.map((item) => item.key).join(", ")}`
    );
  }

  return {
    basketKey: key,
    amount,
    minTokens,
    beneficiary,
    proofHash,
  };
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
  const { basketKey, amount, minTokens, beneficiary: beneficiaryInput, proofHash: proofHashInput } = resolveConfig();
  const basket = getBasketDefinition(basketKey);
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const tokenAddress = requireAddressEnv(basket.tokenEnv);
  const dryRun = parseDryRunFlag();

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const manager = await getBasketManager(managerAddress);
  const basketId = await getBasketId(manager, basket);
  const state = await manager.basketState(basketId);
  if (state.token === ethers.ZeroAddress) {
    throw new Error(`Basket ${basket.key} is not registered yet.`);
  }
  const onchainToken = state.token;
  if (onchainToken.toLowerCase() !== tokenAddress.toLowerCase()) {
    throw new Error(`BasketManager token mismatch for ${basket.key}: on-chain=${onchainToken} env=${tokenAddress}`);
  }

  // verify symbol
  const onchainSymbol = await (await ethers.getContractAt("BasketToken", onchainToken)).symbol();
  if (onchainSymbol.toUpperCase() !== basket.key) {
    console.warn(`⚠️  Registered token symbol ${onchainSymbol} does not match expected ${basket.key}`);
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

  console.log(`🪙 Minting ${basket.key} basket token`);
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  console.log(`💱 Base asset: ${baseAssetAddress} (decimals ${baseDecimals})`);
  console.log(`🎯 Beneficiary: ${beneficiary}`);
  console.log(`💵 Base amount: ${ethers.formatUnits(baseAmount, baseDecimals)}`);
  console.log(`🎯 Min tokens out: ${ethers.formatUnits(minTokensOut, tokenDecimals)}`);
  console.log(`🔏 Proof hash: ${proofHash}`);
  if (dryRun) {
    logDryRunNotice();
  }

  const balanceBefore = await baseAsset.balanceOf(signer.address);
  const tokenBalanceBefore = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance: ${ethers.formatUnits(balanceBefore, baseDecimals)}`);
  console.log(`🎟️  Beneficiary ${basket.key} balance: ${ethers.formatUnits(tokenBalanceBefore, tokenDecimals)}`);

  const allowance = await baseAsset.allowance(signer.address, managerAddress);
  if (allowance < baseAmount) {
    if (dryRun) {
      console.log(
        `[dry-run] Would approve ${ethers.formatUnits(baseAmount, baseDecimals)} base asset to BasketManager ${managerAddress}`
      );
    } else {
      console.log(`🔐 Granting allowance ${ethers.formatUnits(baseAmount, baseDecimals)} to BasketManager`);
      const approveTx = await baseAsset.approve(managerAddress, baseAmount);
      console.log(`   📤 Approve tx: ${approveTx.hash}`);
      await approveTx.wait();
    }
  }

  // final pre-checks
  const signerBaseBal = await baseAsset.balanceOf(signer.address);
  if (signerBaseBal < baseAmount) {
    throw new Error(
      `Insufficient base asset balance: have ${ethers.formatUnits(signerBaseBal, baseDecimals)}, need ${ethers.formatUnits(baseAmount, baseDecimals)}`
    );
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

  if (dryRun) {
    console.log(`[dry-run] Would call BasketManager.mint for ${basket.key}`);
    return;
  }

  const tx = await manager.mint(basket.region, basket.strategy, baseAmount, minTokensOut, beneficiary, proofHash);
  console.log(`🚀 Mint transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Mint confirmed in block ${receipt?.blockNumber ?? "unknown"}`);

  const balanceAfter = await baseAsset.balanceOf(signer.address);
  const tokenBalanceAfter = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance (post): ${ethers.formatUnits(balanceAfter, baseDecimals)}`);
  console.log(`🎟️  Beneficiary ${basket.key} balance (post): ${ethers.formatUnits(tokenBalanceAfter, tokenDecimals)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Mint failed:", error);
    process.exitCode = 1;
  });
}

export { main };
