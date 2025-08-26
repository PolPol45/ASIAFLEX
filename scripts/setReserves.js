const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();

  const reserveContract = await hre.ethers.getContractAt("ProofOfReserve", process.env.RESERVE_CONTRACT);

  const fakeBankBalance = "1000000"; // esempio: 1M USD
  const scaled = hre.ethers.parseUnits(fakeBankBalance, 18);

  console.log("🏦 Updating reserves to:", fakeBankBalance, "USD");

  const tx = await reserveContract.connect(signer).setReserve(scaled);
  await tx.wait();

  console.log("✅ Reserves updated on-chain:", fakeBankBalance, "USD");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
