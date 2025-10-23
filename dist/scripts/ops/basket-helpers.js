"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASKETS = exports.STRATEGY = exports.REGION = void 0;
exports.getBasketDefinition = getBasketDefinition;
exports.requireEnv = requireEnv;
exports.requireAddressEnv = requireAddressEnv;
exports.getBasketManager = getBasketManager;
exports.getBasketId = getBasketId;
exports.encodeAssetId = encodeAssetId;
exports.toWeightedAssets = toWeightedAssets;
exports.sumWeights = sumWeights;
const hardhat_1 = require("hardhat");
exports.REGION = {
  EU: 0,
  ASIA: 1,
  EURO_ASIA: 2,
};
exports.STRATEGY = {
  FX: 0,
  BOND: 1,
  MIX: 2,
};
exports.BASKETS = [
  { key: "EUFX", region: exports.REGION.EU, strategy: exports.STRATEGY.FX, tokenEnv: "TOK_EUFX", label: "EU × FX" },
  { key: "ASFX", region: exports.REGION.ASIA, strategy: exports.STRATEGY.FX, tokenEnv: "TOK_ASFX", label: "ASIA × FX" },
  {
    key: "EUBOND",
    region: exports.REGION.EU,
    strategy: exports.STRATEGY.BOND,
    tokenEnv: "TOK_EUBOND",
    label: "EU × BOND",
  },
  {
    key: "ASBOND",
    region: exports.REGION.ASIA,
    strategy: exports.STRATEGY.BOND,
    tokenEnv: "TOK_ASBOND",
    label: "ASIA × BOND",
  },
  {
    key: "EUAS",
    region: exports.REGION.EURO_ASIA,
    strategy: exports.STRATEGY.MIX,
    tokenEnv: "TOK_EUAS",
    label: "EURO_ASIA × MIX",
  },
];
function getBasketDefinition(key) {
  const basket = exports.BASKETS.find((item) => item.key === key);
  if (!basket) {
    throw new Error(`Unknown basket key ${key}`);
  }
  return basket;
}
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}
function requireAddressEnv(name) {
  const value = requireEnv(name);
  if (!hardhat_1.ethers.isAddress(value)) {
    throw new Error(`Environment variable ${name} is not a valid address: ${value}`);
  }
  return value;
}
async function getBasketManager(address) {
  return hardhat_1.ethers.getContractAt("BasketManager", address);
}
async function getBasketId(manager, basket) {
  return manager.basketId(basket.region, basket.strategy);
}
function encodeAssetId(symbol) {
  return hardhat_1.ethers.id(symbol.trim().toUpperCase());
}
function toWeightedAssets(configs) {
  return configs.map((item) => ({
    assetId: encodeAssetId(item.symbol),
    weightBps: BigInt(item.weight),
    isBond: Boolean(item.isBond),
    accrualBps: BigInt(item.accrualBps ?? 0),
  }));
}
function sumWeights(configs) {
  return configs.reduce((acc, item) => acc + item.weight, 0);
}
