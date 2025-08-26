require("dotenv").config();
const hre = require("hardhat");

const TOKEN_ADDRESS = process.env.ASIAFLEX_TOKEN_ADDR;
const USER = process.env.USER_TO_BURN;
const BLOCK = parseInt(process.env.REDEEM_BLOCK);

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("AsiaFlexToken", TOKEN_ADDRESS);

  console.log("🧾 Using owner:", signer.address);
  console.log("🔥 Processing redeem for:", USER, "at block:", BLOCK);

  const tx = await contract.connect(signer).processRedeem(USER, BLOCK);
  await tx.wait();

  console.log("✅ Redeem processed successfully");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
