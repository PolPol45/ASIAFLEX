const { ethers } = require("hardhat");
require("dotenv").config();

const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

// CONFIG
const CONTRACT_ADDRESS = process.env.ASIAFLEX_TOKEN_ADDRESS;
const TO = process.env.MINT_TO;
const PRICE_USD = "85.48"; // AAXJ prezzo simulato
const USD_AMOUNT = "50";   // USD da convertire in AFX
const RESERVES_TO_SET = "1000"; // AFX riserva disponibile

async function main() {
  if (!CONTRACT_ADDRESS || !TO) {
    throw new Error("❌ ASIAFLEX_TOKEN_ADDRESS o MINT_TO non settati nel .env");
  }

  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  // 1. Setta il prezzo AAXJ
  const price = ethers.parseUnits(PRICE_USD, 18);
  console.log(`💲 Setting price to ${PRICE_USD} USD...`);
  let tx = await contract.setPrice(price);
  await tx.wait();
  console.log("✅ Price set");

  // 2. Setta le riserve
  const reserves = ethers.parseUnits(RESERVES_TO_SET, 18);
  console.log(`📦 Setting reserves to ${RESERVES_TO_SET} AFX...`);
  tx = await contract.setReserves(reserves);
  await tx.wait();
  console.log("✅ Reserves set");

  // 3. Mint in base a USD
  const usdAmount = ethers.parseUnits(USD_AMOUNT, 18);
  const estimatedAFX = usdAmount * BigInt(1e18) / price;
  console.log(`🧮 Minting ${ethers.formatUnits(estimatedAFX, 18)} AFX for ${USD_AMOUNT} USD...`);

  tx = await contract.mintByUSD(TO, usdAmount);
  await tx.wait();

  console.log(`🎉 Minted ${ethers.formatUnits(estimatedAFX, 18)} AFX to ${TO}`);
}

main().catch((err) => {
  console.error("❌ Errore:", err.message);
});
