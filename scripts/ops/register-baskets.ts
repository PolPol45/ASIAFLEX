import { ethers } from "./hardhat-runtime";
import type { BasketManager } from "../../typechain-types";
import { BasketManager__factory } from "../../typechain-types";
import type { Contract, ContractRunner } from "ethers";
import {
  BASKETS,
  WeightedAssetInput,
  requireAddressEnv,
  toWeightedAssets,
  sumWeights,
  encodeAssetId,
  logDryRunNotice,
  parseDryRunFlag,
} from "./basket-helpers";

export type BasketAssets = Record<string, WeightedAssetInput[]>;

type OracleContract = Contract & {
  hasPrice(assetId: string): Promise<boolean>;
  getPrice(assetId: string): Promise<[bigint, bigint, number, boolean]>;
};

function resolveAddressEnv(name: string, dryRun: boolean): string | undefined {
  try {
    return requireAddressEnv(name);
  } catch (error) {
    if (dryRun) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`ℹ️  Dry-run: ${message}`);
      return undefined;
    }
    throw error;
  }
}

export const DEFAULT_CONFIG = {
  stalenessThreshold: 3600n,
  rebalanceInterval: 86_400n,
};

export const ALLOCATIONS: BasketAssets = {
  EUFX: [
    { symbol: "EURUSD", weight: 4000 },
    { symbol: "GBPUSD", weight: 3000 },
    { symbol: "CHFUSD", weight: 2000 },
    { symbol: "JPYUSD", weight: 1000 },
  ],
  ASFX: [
    { symbol: "JPYUSD", weight: 4000 },
    { symbol: "CNYUSD", weight: 2500 },
    { symbol: "KRWUSD", weight: 2000 },
    { symbol: "SGDUSD", weight: 1500 },
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
    { symbol: "JPYUSD", weight: 2000 },
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

function parseDryRun(): boolean {
  return parseDryRunFlag();
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
  const dryRun = parseDryRun();
  const managerAddress = resolveAddressEnv("BASKET_MANAGER", dryRun);
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🛠️  Registering baskets on AsiaFlex platform");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress ?? "(not configured)"}`);
  if (dryRun) {
    logDryRunNotice();
  }

  let manager: BasketManager | undefined;
  let priceOracleAddress: string | undefined;
  let oracle: OracleContract | undefined;

  if (managerAddress) {
    manager = BasketManager__factory.connect(managerAddress, signer);
    priceOracleAddress = await manager.priceOracle();
    oracle = buildOracleContract(priceOracleAddress, signer);
  } else if (!dryRun) {
    throw new Error("BASKET_MANAGER is required for non dry-run execution");
  }

  if (priceOracleAddress) {
    console.log(`🔮 Price oracle: ${priceOracleAddress}`);
  } else {
    console.log("🔮 Price oracle: (not resolved in dry-run)");
  }
  console.log(
    `⚙️  Default config: staleness=${DEFAULT_CONFIG.stalenessThreshold}s, rebalance=${DEFAULT_CONFIG.rebalanceInterval}s`
  );

  for (const basket of BASKETS) {
    const tokenAddress = resolveAddressEnv(basket.tokenEnv, dryRun);
    const assets = ALLOCATIONS[basket.key];
    if (!assets) {
      throw new Error(`Missing allocation definition for ${basket.key}`);
    }

    const totalWeight = sumWeights(assets);
    if (totalWeight !== 10_000) {
      throw new Error(`Weights for ${basket.key} sum to ${totalWeight}, expected 10_000`);
    }

    console.log(`\n📦 Basket ${basket.key} (${basket.label})`);
    const tokenLabel = tokenAddress ? tokenAddress : "(not configured)";
    console.log(`   Token: ${tokenLabel}`);
    console.log(`   Assets: ${formatSymbolList(assets)}`);

    if (oracle) {
      for (const asset of assets) {
        await ensureOracleCoverage(oracle, asset.symbol);
      }
    } else {
      console.log("   ℹ️  Skipping oracle coverage checks (oracle unavailable in dry-run)");
    }

    const encodedAssets = toWeightedAssets(assets);
    if (!manager || !tokenAddress) {
      console.log("   [dry-run] Missing manager/token configuration; would submit allocation on-chain");
      continue;
    }

    const basketId: bigint = await manager.basketId(basket.region, basket.strategy);
    const state = await manager.basketState(basketId);
    const alreadyRegistered = state.token !== ethers.ZeroAddress;

    if (alreadyRegistered) {
      console.log(`   ♻️  Basket already registered at token ${state.token}, updating allocation...`);
      if (dryRun) {
        console.log("   [dry-run] Would call updateAllocation with new weighted assets");
      } else {
        const updateTx = await manager.updateAllocation(basketId, encodedAssets);
        console.log(`   🔁 Update tx hash: ${updateTx.hash}`);
        const updateReceipt = await updateTx.wait();
        console.log(`   ✅ Allocation updated in block ${updateReceipt?.blockNumber ?? "unknown"}`);
      }
      continue;
    }

    if (dryRun) {
      console.log("   [dry-run] Would call registerBasket with provided configuration");
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
