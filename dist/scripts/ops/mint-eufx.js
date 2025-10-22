"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("./basket-helpers");
const BASKET_KEY = "EUFX";
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
function parseArgs() {
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
function ensureHex(hash) {
  if (!hash) {
    return hardhat_1.ethers.ZeroHash;
  }
  if (!hardhat_1.ethers.isHexString(hash, 32)) {
    throw new Error(`proofHash must be 32-byte hex string, received: ${hash}`);
  }
  return hash;
}
async function main() {
  const { amount, minTokens, beneficiary: beneficiaryInput, proofHash: proofHashInput } = parseArgs();
  const basket = (0, basket_helpers_1.getBasketDefinition)(BASKET_KEY);
  const managerAddress = (0, basket_helpers_1.requireAddressEnv)("BASKET_MANAGER");
  const tokenAddress = (0, basket_helpers_1.requireAddressEnv)(basket.tokenEnv);
  const [signer] = await hardhat_1.ethers.getSigners();
  const network = await hardhat_1.ethers.provider.getNetwork();
  const manager = await (0, basket_helpers_1.getBasketManager)(managerAddress);
  const basketId = await (0, basket_helpers_1.getBasketId)(manager, basket);
  const state = await manager.basketState(basketId);
  if (state.token === hardhat_1.ethers.ZeroAddress) {
    throw new Error(`Basket ${basket.key} is not registered yet.`);
  }
  if (state.token.toLowerCase() !== tokenAddress.toLowerCase()) {
    console.warn(`⚠️  BasketManager token ${state.token} differs from ${tokenAddress} (env ${basket.tokenEnv})`);
  }
  const baseAssetAddress = await manager.baseAsset();
  const baseAsset = new hardhat_1.ethers.Contract(baseAssetAddress, ERC20_ABI, signer);
  const basketToken = await hardhat_1.ethers.getContractAt("BasketToken", state.token);
  const baseDecimals = await baseAsset.decimals();
  const tokenDecimals = await basketToken.decimals();
  const baseAmount = hardhat_1.ethers.parseUnits(amount, baseDecimals);
  const minTokensOut = hardhat_1.ethers.parseUnits(minTokens, tokenDecimals);
  const beneficiary = beneficiaryInput ?? signer.address;
  const proofHash = ensureHex(proofHashInput);
  console.log("🪙 Minting EUFX basket token");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  console.log(`💱 Base asset: ${baseAssetAddress} (decimals ${baseDecimals})`);
  console.log(`🎯 Beneficiary: ${beneficiary}`);
  console.log(`💵 Base amount: ${hardhat_1.ethers.formatUnits(baseAmount, baseDecimals)}`);
  console.log(`🎯 Min tokens out: ${hardhat_1.ethers.formatUnits(minTokensOut, tokenDecimals)}`);
  console.log(`🔏 Proof hash: ${proofHash}`);
  const balanceBefore = await baseAsset.balanceOf(signer.address);
  const tokenBalanceBefore = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance: ${hardhat_1.ethers.formatUnits(balanceBefore, baseDecimals)}`);
  console.log(`🎟️  Beneficiary EUFX balance: ${hardhat_1.ethers.formatUnits(tokenBalanceBefore, tokenDecimals)}`);
  const allowance = await baseAsset.allowance(signer.address, managerAddress);
  if (allowance < baseAmount) {
    console.log(`🔐 Granting allowance ${hardhat_1.ethers.formatUnits(baseAmount, baseDecimals)} to BasketManager`);
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
  console.log(`🔍 Preview tokens out: ${hardhat_1.ethers.formatUnits(preview, tokenDecimals)} (nav-driven estimate)`);
  const tx = await manager.mint(basket.region, basket.strategy, baseAmount, minTokensOut, beneficiary, proofHash);
  console.log(`🚀 Mint transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Mint confirmed in block ${receipt?.blockNumber ?? "unknown"}`);
  const balanceAfter = await baseAsset.balanceOf(signer.address);
  const tokenBalanceAfter = await basketToken.balanceOf(beneficiary);
  console.log(`💰 Signer base balance (post): ${hardhat_1.ethers.formatUnits(balanceAfter, baseDecimals)}`);
  console.log(`🎟️  Beneficiary EUFX balance (post): ${hardhat_1.ethers.formatUnits(tokenBalanceAfter, tokenDecimals)}`);
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Mint failed:", error);
    process.exitCode = 1;
  });
}
