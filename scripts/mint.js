const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const tokenAddress = process.env.CONTRACT_ADDRESS;
  const recipient = process.env.MINT_TO || deployer.address;
  const amount = hre.ethers.parseUnits("100", 18); // Mint 100 AFX

  console.log("🧾 Using account:", deployer.address);
  console.log("🎯 Minting to:", recipient);
  console.log("💰 Amount:", hre.ethers.formatUnits(amount, 18), "AFX");

  const AsiaFlexToken = await hre.ethers.getContractAt("AsiaFlexToken", tokenAddress);

  // Optional: check reserves before mint
  const reserves = await AsiaFlexToken.reserves();
  if (reserves < amount) {
    throw new Error(`❌ Not enough reserves. Available: ${hre.ethers.formatUnits(reserves, 18)} AFX`);
  }

  const tx = await AsiaFlexToken.mint(recipient, amount);
  console.log("📨 Mint transaction sent:", tx.hash);
  await tx.wait();

  console.log(`✅ Successfully minted ${hre.ethers.formatUnits(amount, 18)} AFX to ${recipient}`);
}
main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});
