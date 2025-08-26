const { ethers } = require("hardhat");
const axios = require("axios");
require("dotenv").config(); // per usare .env

// Configurazione da .env
const CONTRACT_ADDRESS = process.env.ASIAFLEX_TOKEN_ADDRESS;
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

async function updatePrice() {
  try {
    // 1. Legge il prezzo corrente AAXJ da Alpha Vantage
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: "AAXJ",
        apikey: API_KEY,
      },
    });

    console.log("📦 Risposta API:", JSON.stringify(response.data, null, 2));

    const quote = response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      throw new Error("❌ Nessun dato '05. price' trovato. Controlla la tua API_KEY o il simbolo.");
    }

    const rawPrice = quote["05. price"];
    const scaledPrice = ethers.parseUnits(rawPrice, 18);

    // 2. Setup contratto
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // 3. Esegue la transazione
    const tx = await contract.setPrice(scaledPrice);
    await tx.wait();

    console.log(`✅ Prezzo AAXJ aggiornato: ${rawPrice} USD → ${scaledPrice.toString()}`);
  } catch (err) {
    console.error("❌ Errore aggiornamento:", err.message);
  }
}

updatePrice();
