require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("AsiaFlexToken", process.env.CONTRACT_ADDRESS);

  const user = process.env.USER_TO_BURN;
  const blockNumber = parseInt(process.env.REDEEM_BLOCK);

  console.log("🧾 Using account:", signer.address);
  console.log("🔍 Processing redeem for user:", user, "at block:", blockNumber);

  const tx = await contract.connect(signer).processRedeem(user, blockNumber);
  await tx.wait();

  console.log("✅ Redeem processed and burned.");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
