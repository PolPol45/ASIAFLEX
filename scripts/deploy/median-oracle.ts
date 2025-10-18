import hre from "hardhat";
import { saveAddress } from "../helpers/addresses";

const { ethers } = hre;

async function main() {
  const [signer] = await ethers.getSigners();
  if (!signer) {
    throw new Error("No signer available. Configure a deployer account for the target network.");
  }

  const deployer = await signer.getAddress();
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name && network.name !== "unknown" ? network.name : network.chainId.toString();

  console.log(`👤 Deployer: ${deployer}`);
  console.log(`🌐 Network: ${networkLabel} (${network.chainId})`);

  const factory = await ethers.getContractFactory("MedianOracle", signer);
  const oracle = await factory.deploy(deployer);
  await oracle.waitForDeployment();

  const oracleAddress = await oracle.getAddress();
  console.log(`🛰️  MedianOracle deployed at ${oracleAddress}`);

  const extraUpdater = (process.env.MEDIAN_ORACLE_UPDATER ?? "").trim();
  if (extraUpdater) {
    const normalized = ethers.getAddress(extraUpdater);
    console.log(`🔐 Granting ORACLE_UPDATER_ROLE to ${normalized}`);
    const tx = await oracle.setUpdater(normalized, true);
    console.log(`   ↳ tx hash: ${tx.hash}`);
    await tx.wait();
    console.log("   ↳ role granted");
  }

  const overridePath = process.env.ADDRESS_BOOK_PATH;
  saveAddress(networkLabel, "MedianOracle", oracleAddress, overridePath);
  console.log("📒 Address book updated.");

  console.log("✅ MedianOracle deployment completed.");
}

main().catch((error) => {
  console.error("❌ MedianOracle deployment failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
