const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("🚀 Deploying with account:", deployer.address);

  const ProofOfReserve = await hre.ethers.getContractFactory("ProofOfReserve");
  const reserve = await ProofOfReserve.deploy();

  await reserve.waitForDeployment();

  console.log("✅ ProofOfReserve deployed at:", await reserve.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
