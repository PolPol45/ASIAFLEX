import { ethers } from "hardhat";
import { BASKETS, getBasketId, getBasketManager, requireAddressEnv } from "./basket-helpers";

async function main(): Promise<void> {
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🔄 Refreshing NAV for all registered baskets");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);

  const manager = await getBasketManager(managerAddress);

  for (const basket of BASKETS) {
    try {
      const basketId = await getBasketId(manager, basket);
      const state = await manager.basketState(basketId);
      if (state.token === ethers.ZeroAddress) {
        console.log(`\n⚠️  Basket ${basket.key} not yet registered, skipping.`);
        continue;
      }

      console.log(`\n📦 Basket ${basket.key} (${basket.label}) [id=${basketId}]`);
      const preview = await manager.refreshNAV.staticCall(basketId);
      console.log(
        `   🔍 Preview NAV: ${ethers.formatUnits(preview[0], 18)} (timestamp ${new Date(Number(preview[1]) * 1000).toISOString()})`
      );

      const tx = await manager.refreshNAV(basketId);
      console.log(`   📤 Tx hash: ${tx.hash}`);
      const receipt = await tx.wait();
      const navData = await manager.getNAV(basketId);
      console.log(
        `   ✅ NAV=${ethers.formatUnits(navData[0], 18)} updatedAt=${new Date(Number(navData[1]) * 1000).toISOString()} (block ${receipt?.blockNumber ?? "?"})`
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

export { main };
