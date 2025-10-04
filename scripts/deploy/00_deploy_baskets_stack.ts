import hre from "hardhat";
import { deployBaskets } from "./10_register_baskets";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Deployer: ${await deployer.getAddress()}`);

  const deployment = await deployBaskets();

  console.log("\n📦 Basket deployment summary:");
  console.log(`   Manager: ${deployment.manager}`);
  console.log(`   MedianOracle: ${deployment.medianOracle}`);
  console.log(`   NAVOracle: ${deployment.navOracle}`);
  console.log(`   Snapshot: ${deployment.snapshotPath}`);

  for (const basket of deployment.snapshot.baskets) {
    console.log(`   • ${basket.symbol} (${basket.name}) -> ${basket.tokenAddress}`);
  }

  console.log("\n✅ Basket-first stack deployed.");
}

main().catch((error) => {
  console.error("❌ Basket-first deployment failed", error);
  process.exitCode = 1;
});
