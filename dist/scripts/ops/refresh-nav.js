"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("./basket-helpers");
async function main() {
  const managerAddress = (0, basket_helpers_1.requireAddressEnv)("BASKET_MANAGER");
  const [signer] = await hardhat_1.ethers.getSigners();
  const network = await hardhat_1.ethers.provider.getNetwork();
  console.log("🔄 Refreshing NAV for all registered baskets");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  const manager = await (0, basket_helpers_1.getBasketManager)(managerAddress);
  for (const basket of basket_helpers_1.BASKETS) {
    try {
      const basketId = await (0, basket_helpers_1.getBasketId)(manager, basket);
      const state = await manager.basketState(basketId);
      if (state.token === hardhat_1.ethers.ZeroAddress) {
        console.log(`\n⚠️  Basket ${basket.key} not yet registered, skipping.`);
        continue;
      }
      console.log(`\n📦 Basket ${basket.key} (${basket.label}) [id=${basketId}]`);
      const preview = await manager.refreshNAV.staticCall(basketId);
      console.log(
        `   🔍 Preview NAV: ${hardhat_1.ethers.formatUnits(preview[0], 18)} (timestamp ${new Date(Number(preview[1]) * 1000).toISOString()})`
      );
      const tx = await manager.refreshNAV(basketId);
      console.log(`   📤 Tx hash: ${tx.hash}`);
      const receipt = await tx.wait();
      const navData = await manager.getNAV(basketId);
      console.log(
        `   ✅ NAV=${hardhat_1.ethers.formatUnits(navData[0], 18)} updatedAt=${new Date(Number(navData[1]) * 1000).toISOString()} (block ${receipt?.blockNumber ?? "?"})`
      );
    } catch (error) {
      console.error(`   ❌ Failed to refresh ${basket.key}:`, error);
    }
  }
  console.log("\n🎯 NAV refresh completed");
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}
