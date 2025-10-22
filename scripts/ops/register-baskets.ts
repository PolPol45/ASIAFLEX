import { ethers } from "hardhat";
import type { Contract, ContractRunner } from "ethers";
import {
  BASKETS,
  WeightedAssetInput,
  requireAddressEnv,
  toWeightedAssets,
  sumWeights,
  encodeAssetId,
} from "./basket-helpers";

type BasketAssets = Record<string, WeightedAssetInput[]>;

type OracleContract = Contract & {
  hasPrice(assetId: string): Promise<boolean>;
  getPrice(assetId: string): Promise<[bigint, bigint, number, boolean]>;
};

const DEFAULT_CONFIG = {
  stalenessThreshold: 3600n,
  rebalanceInterval: 86_400n,
};

const ALLOCATIONS: BasketAssets = {
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

function formatSymbolList(inputs: WeightedAssetInput[]): string {
  return inputs
    .map((item) => `${item.symbol}:${item.weight}${item.isBond ? ` (bond/${item.accrualBps ?? 0}bps)` : ""}`)
    .join(", ");
}

function buildOracleContract(address: string, runner: ContractRunner): OracleContract {
  const abi = [
    "function hasPrice(bytes32 assetId) external view returns (bool)",
    "function getPrice(bytes32 assetId) external view returns (uint256,uint256,uint8,bool)",
  ];
  return new ethers.Contract(address, abi, runner) as OracleContract;
}

async function ensureOracleCoverage(oracle: OracleContract, symbol: string): Promise<void> {
  const assetId = encodeAssetId(symbol);
  try {
    const available = await oracle.hasPrice(assetId);
    if (!available) {
      console.warn(`TODO: configure oracle feed for ${symbol} (assetId ${assetId})`);
      return;
    }
    await oracle.getPrice(assetId);
  } catch (error) {
    console.warn(`TODO: verify oracle integration for ${symbol} (assetId ${assetId}) – ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🛠️  Registering baskets on AsiaFlex platform");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);

  const manager = await ethers.getContractAt("BasketManager", managerAddress);
  const priceOracleAddress: string = await manager.priceOracle();
  const oracle = buildOracleContract(priceOracleAddress, signer);

  console.log(`🔮 Price oracle: ${priceOracleAddress}`);
  console.log(
    `⚙️  Default config: staleness=${DEFAULT_CONFIG.stalenessThreshold}s, rebalance=${DEFAULT_CONFIG.rebalanceInterval}s`
  );

  for (const basket of BASKETS) {
    const tokenAddress = requireAddressEnv(basket.tokenEnv);
    const assets = ALLOCATIONS[basket.key];
    if (!assets) {
      throw new Error(`Missing allocation definition for ${basket.key}`);
    }

    const totalWeight = sumWeights(assets);
    if (totalWeight !== 10_000) {
      throw new Error(`Weights for ${basket.key} sum to ${totalWeight}, expected 10_000`);
    }

    console.log(`\n📦 Basket ${basket.key} (${basket.label})`);
    console.log(`   Token: ${tokenAddress}`);
    console.log(`   Assets: ${formatSymbolList(assets)}`);

    for (const asset of assets) {
      await ensureOracleCoverage(oracle, asset.symbol);
    }

    const encodedAssets = toWeightedAssets(assets);
    const basketId: bigint = await manager.basketId(basket.region, basket.strategy);
    const state = await manager.basketState(basketId);
    if (state.token !== ethers.ZeroAddress) {
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

export { main };
