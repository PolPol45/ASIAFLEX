"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("./basket-helpers");
const DEFAULT_CONFIG = {
  stalenessThreshold: 3600n,
  rebalanceInterval: 86400n,
};
const ALLOCATIONS = {
  EUFX: [
    { symbol: "EURUSD", weight: 4000 },
    { symbol: "GBPUSD", weight: 3000 },
    { symbol: "USDCHF", weight: 2000 },
    { symbol: "EURGBP", weight: 1000 },
  ],
  ASFX: [
    { symbol: "USDJPY", weight: 4000 },
    { symbol: "USDCNY", weight: 2500 },
    { symbol: "USDKRW", weight: 2000 },
    { symbol: "USDSGD", weight: 1500 },
  ],
  EUBOND: [
    { symbol: "BNDX", weight: 6000, isBond: true, accrualBps: 150 },
    { symbol: "IEGA", weight: 4000, isBond: true, accrualBps: 120 },
  ],
  ASBOND: [
    { symbol: "AGGH", weight: 5000, isBond: true, accrualBps: 140 },
    { symbol: "2821.HK", weight: 5000, isBond: true, accrualBps: 110 },
  ],
  EUAS: [
    { symbol: "EURUSD", weight: 2000 },
    { symbol: "USDJPY", weight: 2000 },
    { symbol: "XAUUSD", weight: 2000 },
    { symbol: "BTCUSD", weight: 2000 },
    { symbol: "ETHUSD", weight: 2000 },
  ],
};
function formatSymbolList(inputs) {
  return inputs
    .map((item) => `${item.symbol}:${item.weight}${item.isBond ? ` (bond/${item.accrualBps ?? 0}bps)` : ""}`)
    .join(", ");
}
function buildOracleContract(address, runner) {
  const abi = [
    "function hasPrice(bytes32 assetId) external view returns (bool)",
    "function getPrice(bytes32 assetId) external view returns (uint256,uint256,uint8,bool)",
  ];
  return new hardhat_1.ethers.Contract(address, abi, runner);
}
async function ensureOracleCoverage(oracle, symbol) {
  const assetId = (0, basket_helpers_1.encodeAssetId)(symbol);
  try {
    const available = await oracle.hasPrice(assetId);
    if (!available) {
      console.warn(`TODO: configure oracle feed for ${symbol} (assetId ${assetId})`);
      return;
    }
    await oracle.getPrice(assetId);
  } catch (error) {
    console.warn(`TODO: verify oracle integration for ${symbol} (assetId ${assetId}) – ${error.message}`);
  }
}
async function main() {
  const managerAddress = (0, basket_helpers_1.requireAddressEnv)("BASKET_MANAGER");
  const [signer] = await hardhat_1.ethers.getSigners();
  const network = await hardhat_1.ethers.provider.getNetwork();
  console.log("🛠️  Registering baskets on AsiaFlex platform");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  const manager = await hardhat_1.ethers.getContractAt("BasketManager", managerAddress);
  const priceOracleAddress = await manager.priceOracle();
  const oracle = buildOracleContract(priceOracleAddress, signer);
  console.log(`🔮 Price oracle: ${priceOracleAddress}`);
  console.log(
    `⚙️  Default config: staleness=${DEFAULT_CONFIG.stalenessThreshold}s, rebalance=${DEFAULT_CONFIG.rebalanceInterval}s`
  );
  for (const basket of basket_helpers_1.BASKETS) {
    const tokenAddress = (0, basket_helpers_1.requireAddressEnv)(basket.tokenEnv);
    const assets = ALLOCATIONS[basket.key];
    if (!assets) {
      throw new Error(`Missing allocation definition for ${basket.key}`);
    }
    const totalWeight = (0, basket_helpers_1.sumWeights)(assets);
    if (totalWeight !== 10000) {
      throw new Error(`Weights for ${basket.key} sum to ${totalWeight}, expected 10_000`);
    }
    console.log(`\n📦 Basket ${basket.key} (${basket.label})`);
    console.log(`   Token: ${tokenAddress}`);
    console.log(`   Assets: ${formatSymbolList(assets)}`);
    for (const asset of assets) {
      await ensureOracleCoverage(oracle, asset.symbol);
    }
    const encodedAssets = (0, basket_helpers_1.toWeightedAssets)(assets);
    const basketId = await manager.basketId(basket.region, basket.strategy);
    const state = await manager.basketState(basketId);
    if (state.token !== hardhat_1.ethers.ZeroAddress) {
      console.log(`   ⚠️  Basket already registered at token ${state.token}, skipping.`);
      continue;
    }
    console.log("   🚀 Sending registerBasket transaction...");
    const tx = await manager.registerBasket(
      basket.region,
      basket.strategy,
      tokenAddress,
      encodedAssets,
      DEFAULT_CONFIG
    );
    console.log(`   📤 Tx hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt?.blockNumber ?? "unknown"}`);
  }
  console.log("\n🎯 Registration script completed");
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Registration failed:", error);
    process.exitCode = 1;
  });
}
