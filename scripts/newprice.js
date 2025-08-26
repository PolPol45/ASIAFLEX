const hre = require("hardhat");
const axios = require("axios");
require("dotenv").config();

const TOKEN_ADDR_ENV = process.env.ASIAFLEX_TOKEN_ADDR || process.env.ASIAFLEX_TOKEN_ADDRESS;
if (!TOKEN_ADDR_ENV) throw new Error("ASIAFLEX_TOKEN_ADDR or ASIAFLEX_TOKEN_ADDRESS must be set in .env");

const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Alpha Vantage settings (or swap for another provider)
const ALPHA_KEY = process.env.ALPHA_VANTAGE_KEY;
const SYMBOL = process.env.ETF_SYMBOL || "AAXJ";
const INTERVAL_SECONDS = Number(process.env.UPDATE_INTERVAL_SECONDS || 300); // default 5 min
const THRESHOLD_PERCENT = Number(process.env.PRICE_CHANGE_THRESHOLD_PERCENT || 0.1); // percent

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function fetchPriceAlphaVantage(symbol) {
  if (!ALPHA_KEY) throw new Error("ALPHA_VANTAGE_KEY required in .env to fetch ETF price");
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_KEY}`;
  const res = await axios.get(url, { timeout: 10000 });
  const data = res.data && res.data["Global Quote"];
  if (!data) throw new Error("AlphaVantage: unexpected response: " + JSON.stringify(res.data).slice(0, 300));
  const priceStr = data["05. price"];
  if (!priceStr) throw new Error("AlphaVantage: price field missing");
  return priceStr;
}

async function makeSigner() {
  if (PRIVATE_KEY && RPC_URL) {
    const provider = new hre.ethers.JsonRpcProvider(RPC_URL);
    return new hre.ethers.Wallet(PRIVATE_KEY, provider);
  }
  const [s] = await hre.ethers.getSigners();
  return s;
}

async function mainLoop() {
  const signer = await makeSigner();
  console.log("Using signer:", signer.address);

  const token = await hre.ethers.getContractAt("AsiaFlexToken", TOKEN_ADDR_ENV, signer);

  let lastPrice = null;

  console.log(`Starting price poll for ${SYMBOL} every ${INTERVAL_SECONDS}s (threshold ${THRESHOLD_PERCENT}%)`);

  process.on("SIGINT", () => {
    console.log("Received SIGINT, exiting...");
    process.exit(0);
  });

  while (true) {
    try {
      const priceStr = await fetchPriceAlphaVantage(SYMBOL);
      const priceNum = Number(priceStr);
      if (Number.isNaN(priceNum)) throw new Error("Invalid price from API: " + priceStr);

      const parsedPrice = hre.ethers.parseUnits(priceStr, 18); // contract uses 18 decimals for price

      if (lastPrice === null) {
        console.log(`Initial price ${priceStr} — updating on-chain`);
        const tx = await token.connect(signer).setPrice(parsedPrice);
        await tx.wait();
        lastPrice = priceNum;
        console.log("On-chain price set:", priceStr);
      } else {
        const changePercent = Math.abs((priceNum - lastPrice) / lastPrice) * 100;
        console.log(`[${new Date().toISOString()}] Fetched ${SYMBOL} = ${priceStr} (change ${changePercent.toFixed(4)}%)`);
        if (changePercent >= THRESHOLD_PERCENT) {
          console.log(`Change ${changePercent.toFixed(4)}% >= ${THRESHOLD_PERCENT}% — updating on-chain`);
          const tx = await token.connect(signer).setPrice(parsedPrice);
          await tx.wait();
          lastPrice = priceNum;
          console.log("On-chain price updated to:", priceStr);
        } else {
          console.log("Change below threshold — skipping on-chain update");
        }
      }
    } catch (err) {
      console.error("Error in poll loop:", err.message || err);
    }

    await sleep(INTERVAL_SECONDS * 1000);
  }
}

mainLoop().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});