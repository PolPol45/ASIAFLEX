const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const contract = await hre.ethers.getContractAt("AsiaFlex", process.env.CONTRACT_ADDRESS);
  const reserves = await contract.reserves();

  console.log("📊 Current reserves:", hre.ethers.formatUnits(reserves, 18), "AFX");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

