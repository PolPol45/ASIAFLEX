// Centralized configuration & basic validation
require("dotenv").config();

const required = ["SEPOLIA_RPC_URL", "ALPHA_VANTAGE_API_KEY"];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  console.warn(`[config] Warning: missing env vars: ${missing.join(", ")}`);
  // Non bloccante: permette dry-run/CI senza tutte le variabili
}

const config = {
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL || "",
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || "",
  ASIAFLEX_TOKEN_ADDRESS: process.env.ASIAFLEX_TOKEN_ADDRESS || "",
  PROOF_OF_RESERVE_ADDRESS: process.env.PROOF_OF_RESERVE_ADDRESS || "",
  MAX_PRICE_CHANGE_PERCENT: Number(process.env.MAX_PRICE_CHANGE_PERCENT || "50"),
};

module.exports = config;
