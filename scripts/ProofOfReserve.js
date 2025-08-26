const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const reserveContract = await hre.ethers.getContractAt("ProofOfReserve", process.env.RESERVE_CONTRACT);

  const fakeBankBalance = "1000000"; // 1 milione USD come demo
  const scaled = hre.ethers.parseUnits(fakeBankBalance, 18);

  const tx = await reserveContract.connect(signer).setReserve(scaled);
  await tx.wait();

  console.log("✅ Proof of Reserve updated:", fakeBankBalance, "USD");
}

main();

