import { ethers } from "../ops/hardhat-runtime";
import { MockERC20__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockERC20__factory";
import { MockMedianOracle__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockMedianOracle__factory";
import { BasketManager__factory } from "../../typechain-types/factories/artifacts/contracts/baskets/BasketManager__factory";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  const admin = deployer.address;
  const adminDelayEnv = process.env.ADMIN_DELAY_SECONDS ? Number(process.env.ADMIN_DELAY_SECONDS) : undefined;
  const adminDelay = adminDelayEnv && adminDelayEnv > 0 ? adminDelayEnv : 2 * 24 * 60 * 60; // default 2 days

  const baseAssetFactory = new MockERC20__factory(deployer);
  const baseAsset = await baseAssetFactory.deploy("Mock USD", "mUSD");
  await baseAsset.waitForDeployment();
  const baseAssetAddress = await baseAsset.getAddress();

  await (await baseAsset.mint(deployer.address, ethers.parseUnits("1000000", 18))).wait();

  const oracleFactory = new MockMedianOracle__factory(deployer);
  const oracle = await oracleFactory.deploy(admin);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();

  const managerFactory = new BasketManager__factory(deployer);
  const manager = await managerFactory.deploy(admin, adminDelay, baseAssetAddress, oracleAddress);
  await manager.waitForDeployment();
  const managerAddress = await manager.getAddress();

  const now = Math.floor(Date.now() / 1000);
  await (await oracle.setPrice(bytes32FromString("EURUSD"), ethers.parseUnits("1", 18), now, 18, false)).wait();

  console.log("BASKET_MANAGER=" + managerAddress);
  console.log("BASE_ASSET=" + baseAssetAddress);
  console.log("ORACLE=" + oracleAddress);
}

function bytes32FromString(value: string): string {
  return ethers.id(value).slice(0, 66);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });
}

export { main };
