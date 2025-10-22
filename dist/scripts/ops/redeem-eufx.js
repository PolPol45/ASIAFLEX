"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("./basket-helpers");
const BASKET_KEY = "EUFX";
const ERC20_ABI = ["function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"];
function parseArgs() {
  const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (positional.length < 1) {
    console.log("Usage: npx hardhat run scripts/ops/redeem-eufx.ts -- <tokenAmount> [minBaseAmount] [recipient]");
    console.log("Example: npx hardhat run scripts/ops/redeem-eufx.ts -- 10 900");
    process.exit(1);
  }
  const [tokens, minBase = "0", recipient] = positional;
  return { tokens, minBase, recipient };
}
async function main() {
  const { tokens, minBase, recipient: recipientInput } = parseArgs();
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
  const tokenAmount = hardhat_1.ethers.parseUnits(tokens, tokenDecimals);
  const minBaseAmount = hardhat_1.ethers.parseUnits(minBase, baseDecimals);
  const recipient = recipientInput ?? signer.address;
  console.log("♻️  Redeeming EUFX basket token");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  console.log(`🎯 Recipient: ${recipient}`);
  console.log(`🎟️  Token amount: ${hardhat_1.ethers.formatUnits(tokenAmount, tokenDecimals)}`);
  console.log(`💵 Min base amount: ${hardhat_1.ethers.formatUnits(minBaseAmount, baseDecimals)}`);
  const tokenBalanceBefore = await basketToken.balanceOf(signer.address);
  const baseBalanceBefore = await baseAsset.balanceOf(recipient);
  console.log(`🎟️  Signer EUFX balance: ${hardhat_1.ethers.formatUnits(tokenBalanceBefore, tokenDecimals)}`);
  console.log(`💰 Recipient base balance: ${hardhat_1.ethers.formatUnits(baseBalanceBefore, baseDecimals)}`);
  if (tokenBalanceBefore < tokenAmount) {
    throw new Error("Insufficient EUFX balance for redemption");
  }
  const preview = await manager.redeem.staticCall(
    basket.region,
    basket.strategy,
    tokenAmount,
    minBaseAmount,
    recipient
  );
  console.log(`🔍 Preview base out: ${hardhat_1.ethers.formatUnits(preview, baseDecimals)}`);
  const tx = await manager.redeem(basket.region, basket.strategy, tokenAmount, minBaseAmount, recipient);
  console.log(`🚀 Redeem transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Redeem confirmed in block ${receipt?.blockNumber ?? "unknown"}`);
  const tokenBalanceAfter = await basketToken.balanceOf(signer.address);
  const baseBalanceAfter = await baseAsset.balanceOf(recipient);
  console.log(`🎟️  Signer EUFX balance (post): ${hardhat_1.ethers.formatUnits(tokenBalanceAfter, tokenDecimals)}`);
  console.log(`💰 Recipient base balance (post): ${hardhat_1.ethers.formatUnits(baseBalanceAfter, baseDecimals)}`);
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Redeem failed:", error);
    process.exitCode = 1;
  });
}
