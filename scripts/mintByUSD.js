const { ethers } = require("hardhat");
require("dotenv").config();

const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

const CONTRACT_ADDRESS = process.env.ASIAFLEX_TOKEN_ADDRESS; // Indirizzo contratto corretto
const TO_ADDRESS = process.env.MINT_TO; // Indirizzo destinatario token

// Modifica qui il valore in USD da convertire
const USD_AMOUNT = "50"; // es. 50 USD

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  const usdAmountScaled = ethers.parseUnits(USD_AMOUNT, 18); // es. 50 USD → 50e18

  // Legge il prezzo corrente
  const price = await contract.getPrice();
  console.log("💲 Prezzo attuale AAXJ:", ethers.formatUnits(price, 18), "USD");

  // Stima token da mintare
  const amountToMint = usdAmountScaled * BigInt(1e18) / price;
  console.log("🧮 Token da mintare:", ethers.formatUnits(amountToMint, 18), "AFX");

  const tx = await contract.mintByUSD(TO_ADDRESS, usdAmountScaled);
  await tx.wait();

  console.log(`✅ Mint completato: ${USD_AMOUNT} USD → ${ethers.formatUnits(amountToMint, 18)} AFX a ${TO_ADDRESS}`);
}

main().catch((err) => {
  console.error("❌ Errore:", err.message);
});
