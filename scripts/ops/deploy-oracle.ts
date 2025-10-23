import "dotenv/config";
import { ethers } from "./hardhat-runtime";
import { MockMedianOracle__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockMedianOracle__factory";
import type { MockMedianOracle } from "../../typechain-types/artifacts/contracts/mocks/MockMedianOracle";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ORACLE_ADMIN ?? deployer.address;

  console.log("Deploying MockMedianOracle with admin", admin);

  const oracleFactory = new MockMedianOracle__factory(deployer);
  const oracle: MockMedianOracle = await oracleFactory.deploy(admin);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();

  console.log(`ORACLE=${oracleAddress}`);
  console.log(`DEPLOYER=${deployer.address}`);

  const feedRole = await oracle.FEED_ROLE();
  const hasRole = await oracle.hasRole(feedRole, deployer.address);
  console.log(`Deployer has FEED_ROLE: ${hasRole}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("deploy-oracle failed:", error);
    process.exitCode = 1;
  });
}

export { main };
