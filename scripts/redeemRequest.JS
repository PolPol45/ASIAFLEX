require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const contract = await hre.ethers.getContractAt("AsiaFlexToken", process.env.CONTRACT_ADDRESS);

  const amount = hre.ethers.parseUnits("10", 18);

  console.log("🧾 User:", signer.address);
  console.log("📤 Sending redeemRequest for", hre.ethers.formatUnits(amount, 18), "AFX");

  const tx = await contract.connect(signer).redeemRequest(amount);
  await tx.wait();

  console.log("✅ redeemRequest done at block", (await hre.ethers.provider.getBlockNumber()));
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});