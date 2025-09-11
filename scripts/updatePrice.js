/**
 * scripts/updatePrice.js
 * - Fetch price from AlphaVantage and set on-chain
 * - Noninteractive: pass --yes or set AUTO_CONFIRM=1 to skip confirmation prompt
 */
const { ethers } = require("hardhat");
const axios = require("axios");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");
require("dotenv").config();

const CONTRACT_ADDRESS = process.env.ASIAFLEX_TOKEN_ADDRESS || process.env.CONTRACT_ADDRESS;
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

async function promptYesNo(question) {
  // non-interactive override
  if (process.env.AUTO_CONFIRM === "1" || process.argv.includes("--yes") || process.argv.includes("-y")) {
    return true;
  }
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  const a = String(answer || "")
    .trim()
    .toLowerCase();
  return a === "y" || a === "yes";
}

async function updatePrice() {
  try {
    if (!CONTRACT_ADDRESS) throw new Error("ASIAFLEX_TOKEN_ADDRESS or CONTRACT_ADDRESS not set in .env");
    if (!API_KEY) throw new Error("ALPHA_VANTAGE_API_KEY (or ALPHA_VANTAGE_KEY) not set in .env");
    if (!RPC_URL) throw new Error("SEPOLIA_RPC_URL (or RPC_URL) not set in .env");

    // 1. Legge il prezzo corrente AAXJ da Alpha Vantage
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "GLOBAL_QUOTE",
        symbol: process.env.ETF_SYMBOL || "AAXJ",
        apikey: API_KEY,
      },
      timeout: 10000,
    });

    const quote = response.data && response.data["Global Quote"];
    if (!quote || !quote["05. price"]) {
      throw new Error("Nessun dato '05. price' trovato. Controlla la tua API_KEY o il simbolo.");
    }

    const rawPrice = quote["05. price"];
    const scaledPrice = ethers.parseUnits(String(rawPrice), 18);

    // 2. Setup contratto
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    // read on-chain price if available
    let onchainPrice = null;
    try {
      onchainPrice = await contract.getPrice();
    } catch (e) {
      // ignore if contract has no getPrice or call reverts
    }

    const onchainHuman = onchainPrice ? ethers.formatUnits(onchainPrice, 18) : "n/a";
    console.log(`On-chain price: ${onchainHuman} USD, API price: ${rawPrice} USD`);

    // prompt before sending tx
    const doSend = await promptYesNo(`Proceed to send tx to update price from ${onchainHuman} -> ${rawPrice}? [y/N]: `);
    if (!doSend) {
      console.log("Aborted by user.");
      // ensure provider sockets (if any) are not keeping process alive
      if (provider && provider.destroy) provider.destroy();
      return;
    }

    // 3. Esegue la transazione
    const tx = await contract.setPrice(scaledPrice);
    const receipt = await tx.wait();
    console.log("TX sent:", tx.hash);
    console.log("Receipt status:", receipt && receipt.status ? receipt.status : "unknown");
    console.log(`✅ Prezzo AAXJ aggiornato: ${rawPrice} USD → ${scaledPrice.toString()}`);
    // close provider if possible
    if (provider && provider.destroy) provider.destroy();
  } catch (err) {
    console.error("❌ Errore aggiornamento:", err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

updatePrice();
