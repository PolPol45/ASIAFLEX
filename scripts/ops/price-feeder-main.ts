import { EventEmitter } from "node:events";
import { keccak256, toUtf8Bytes } from "ethers";
import { loadAddresses } from "../helpers/addresses";
import { listAssetFeeds, resolveAssetFeed, type AssetFeedConfig } from "./assets.map";
import { normalizeTo18, PriceSample, Provider } from "./providers/Provider";
import type { GoogleCheckResult } from "./providers/GoogleFinanceChecker";
import type { InverseCheckOutcome } from "./checkers/inverse-sanity";
import StooqProvider from "./providers/StooqProvider";
import ExchangeRateProvider from "./providers/ExchangeRateProvider";
import GoldPriceProvider from "./providers/GoldPriceProvider";
import type { MedianOracle } from "../../typechain-types/contracts/baskets/oracles/MedianOracle";

export type FeederOptions = {
  network: string;
  addressesPath?: string;
  symbols?: string[];
  commit?: boolean;
  overrideProviders?: Record<string, Provider>;
  forceTimestamp?: string;
  advanceTime?: boolean;
};

type ProviderRegistry = Map<string, Provider>;

type TargetAsset = AssetFeedConfig & { assetKey: string };

const PRICE_NOT_AVAILABLE_SELECTOR = "0xf69cc810";

export type FeederAssetStatus = "updated" | "skipped";

export interface FeederAssetResult {
  assetKey: string;
  symbol: string;
  provider?: string;
  status: FeederAssetStatus;
  fallback: boolean;
  degraded: boolean;
  message?: string;
  price?: bigint;
  timestamp?: number;
}

export interface EncodedPriceObservation {
  assetId: string;
  price: bigint;
  ts: bigint;
  decimals: number;
  degraded: boolean;
}

export interface HarvestedObservation {
  assetKey: string;
  symbol: string;
  provider: string;
  fallback: boolean;
  observation: EncodedPriceObservation;
  timestamp: number;
}

interface FeederEvents {
  "asset:updated": {
    assetKey: string;
    symbol: string;
    provider: string;
    fallback: boolean;
    degraded: boolean;
    observation: EncodedPriceObservation;
  };
  "asset:skipped": {
    assetKey: string;
    symbol: string;
    reason: string;
    error?: string;
  };
  "commit:success": {
    txHash: string;
    assetKeys: string[];
    batch: boolean;
  };
  "commit:error": {
    assetKeys: string[];
    error: unknown;
  };
}

class FeederEventEmitter extends EventEmitter {
  on<K extends keyof FeederEvents>(event: K, listener: (payload: FeederEvents[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof FeederEvents>(event: K, listener: (payload: FeederEvents[K]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof FeederEvents>(event: K, listener: (payload: FeederEvents[K]) => void): this {
    return super.off(event, listener);
  }

  emit<K extends keyof FeederEvents>(event: K, payload: FeederEvents[K]): boolean {
    return super.emit(event, payload);
  }
}

export const feederEvents = new FeederEventEmitter();

export type FeederSummary = {
  total: number;
  updated: number;
  degraded: number;
  skipped: number;
  dryRun: boolean;
  results: FeederAssetResult[];
  harvested: HarvestedObservation[];
  txHashes: string[];
  checkerAlerts: GoogleCheckResult[];
  inverseAlerts: InverseCheckOutcome[];
  providerOrder?: string[];
  byProvider?: Record<string, number>;
};

function networkNameFromProvider(provider: unknown): string {
  const typed = provider as { network?: { name?: string }; _network?: { name?: string } };
  const candidate = typed?.network?.name ?? typed?._network?.name;
  if (typeof candidate === "string" && candidate.length > 0) {
    return candidate;
  }
  if (typeof process.env.HARDHAT_NETWORK === "string" && process.env.HARDHAT_NETWORK.length > 0) {
    return process.env.HARDHAT_NETWORK;
  }
  return "unknown";
}

function parseTargets(symbols?: string[]): TargetAsset[] {
  if (symbols && symbols.length > 0) {
    return symbols
      .map((sym) => resolveAssetFeed(sym) ?? { asset: sym, symbol: sym, providers: [] })
      .map((cfg) => ({ ...cfg, assetKey: cfg.asset.toUpperCase() }));
  }

  return listAssetFeeds().map((cfg) => ({ ...cfg, assetKey: cfg.asset.toUpperCase() }));
}

function instantiateProvider(name: string, registry: ProviderRegistry, options: FeederOptions): Provider {
  if (registry.has(name)) {
    return registry.get(name)!;
  }

  if (options.overrideProviders && options.overrideProviders[name]) {
    const override = options.overrideProviders[name];
    registry.set(name, override);
    return override;
  }

  let provider: Provider;
  switch (name) {
    case "stooq":
      provider = new StooqProvider();
      break;
    case "exchange-rate":
      provider = new ExchangeRateProvider();
      break;
    case "gold-price":
      provider = new GoldPriceProvider();
      break;
    default:
      throw new Error(`Unknown provider ${name}`);
  }

  registry.set(name, provider);
  return provider;
}

async function resolvePrice(
  target: TargetAsset,
  registry: ProviderRegistry,
  options: FeederOptions
): Promise<{ sample: PriceSample; provider: string; fallback: boolean } | null> {
  if (target.providers.length === 0) {
    return null;
  }

  const symbol = target.symbol.toUpperCase();

  for (let index = 0; index < target.providers.length; index++) {
    const providerName = target.providers[index];
    let provider: Provider;
    try {
      provider = instantiateProvider(providerName, registry, options);
    } catch (error) {
      console.warn(`⚠️  Provider ${providerName} not available:`, (error as Error).message);
      continue;
    }

    const sample = await provider.get(symbol);
    if (sample) {
      const fallback = index > 0;
      const degraded = Boolean(sample.degraded);
      return {
        sample: degraded || fallback ? { ...sample, degraded: true } : sample,
        provider: providerName,
        fallback,
      };
    }
  }

  return null;
}

async function getOracleContract(
  hre: typeof import("hardhat"),
  network: string,
  addressesPath?: string
): Promise<MedianOracle> {
  const { data } = loadAddresses(network, addressesPath);
  const oracleAddress = data.contracts.MedianOracle;
  if (!oracleAddress) {
    const expected =
      Object.keys(data.contracts).length === 0 ? "(none saved yet)" : JSON.stringify(data.contracts, null, 2);
    throw new Error(
      `MedianOracle address missing for network ${network}. Expected keys: ["MedianOracle"]. Current entries: ${expected}`
    );
  }

  const provider = hre.ethers.provider;
  const code = await provider.getCode(oracleAddress);
  if (!code || code === "0x") {
    throw new Error(`MedianOracle at ${oracleAddress} has no bytecode on network ${network}`);
  }

  const [signer] = await hre.ethers.getSigners();
  return hre.ethers.getContractAt("MedianOracle", oracleAddress, signer);
}

function encodePrice(assetKey: string, sample: PriceSample): EncodedPriceObservation {
  const normalized = normalizeTo18(sample.value, sample.decimals);
  return {
    assetId: keccak256(toUtf8Bytes(assetKey)),
    price: normalized,
    ts: BigInt(sample.ts),
    decimals: 18,
    degraded: Boolean(sample.degraded),
  };
}

export function formatSummary(summary: FeederSummary) {
  const { total, updated, degraded, skipped, dryRun } = summary;
  return `Processed ${total} assets → updated: ${updated}${dryRun ? " (dry-run)" : ""}, degraded: ${degraded}, skipped: ${skipped}`;
}

export async function runFeeder(options: FeederOptions): Promise<FeederSummary> {
  const registry: ProviderRegistry = new Map();
  const targets = parseTargets(options.symbols);

  if (targets.length === 0) {
    throw new Error("No symbols provided and no default asset map available");
  }

  const summary: FeederSummary = {
    total: targets.length,
    updated: 0,
    degraded: 0,
    skipped: 0,
    dryRun: !options.commit,
    results: [],
    harvested: [],
    txHashes: [],
    checkerAlerts: [],
    inverseAlerts: [],
  };

  if (options.network) {
    process.env.HARDHAT_NETWORK = options.network;
  }

  const hre = await import("hardhat");
  const provider = hre.ethers.provider;

  let oracle: MedianOracle | null = null;
  try {
    oracle = await getOracleContract(hre, options.network, options.addressesPath);
  } catch (error) {
    if (options.commit) {
      throw error;
    }
  }

  const harvested: HarvestedObservation[] = [];
  const results: FeederAssetResult[] = [];
  const txHashes: string[] = [];

  for (const target of targets) {
    const providerList = Array.isArray(target.providers) ? target.providers : [];
    try {
      const resolved = await resolvePrice(target, registry, options);
      if (!resolved) {
        console.warn(`⚠️  No data returned for ${target.assetKey} (${target.symbol}), skipping.`);
        results.push({
          assetKey: target.assetKey,
          symbol: target.symbol,
          provider: providerList[0],
          status: "skipped",
          fallback: false,
          degraded: false,
          message: "no-data",
        });
        feederEvents.emit("asset:skipped", {
          assetKey: target.assetKey,
          symbol: target.symbol,
          reason: "no-data",
        });
        summary.skipped += 1;
        continue;
      }

      if (resolved.sample.degraded) {
        summary.degraded += 1;
      }

      const block = await provider.getBlock("latest");
      if (!block) {
        throw new Error("Unable to fetch latest block timestamp");
      }
      const networkNow = Number(block.timestamp);
      const wallClockNow = Math.floor(Date.now() / 1000);
      const allowedNow = Math.min(wallClockNow, networkNow + 60);
      const forceTimestampNow = process.env.FORCE_TIMESTAMP_NOW === "true";

      let ts = Number(resolved.sample.ts ?? allowedNow);

      if (options.forceTimestamp) {
        ts = options.forceTimestamp === "now" ? allowedNow : Number(options.forceTimestamp);
      } else if (forceTimestampNow) {
        ts = networkNow;
      }

      ts = Math.trunc(ts);

      if (!Number.isFinite(ts)) {
        throw new Error("Invalid timestamp provided during price harvesting");
      }

      if (ts < 0) {
        ts = 0;
      }

      if (ts > allowedNow) {
        ts = allowedNow;
      }

      const assetId = keccak256(toUtf8Bytes(target.assetKey));

      if (oracle) {
        try {
          const last = await oracle.getPriceData(assetId);
          const lastTs = Number(last.updatedAt ?? 0);
          if (lastTs && ts <= lastTs) {
            ts = lastTs + 1;
          }
        } catch (error) {
          const err = error as { message?: string; shortMessage?: string; data?: unknown };
          const message = err.shortMessage ?? err.message ?? "";
          const data = typeof err.data === "string" ? err.data : undefined;
          const selector = data?.slice(0, 10);
          const isPriceNotAvailable =
            message.includes("PriceNotAvailable") || selector === PRICE_NOT_AVAILABLE_SELECTOR;
          if (!isPriceNotAvailable) {
            throw error;
          }
        }
      }

      const sanitizedSample: PriceSample = {
        ...resolved.sample,
        ts,
      };

      const observation = encodePrice(target.assetKey, sanitizedSample);
      harvested.push({
        assetKey: target.assetKey,
        symbol: target.symbol,
        provider: resolved.provider,
        fallback: resolved.fallback,
        observation,
        timestamp: ts,
      });
      results.push({
        assetKey: target.assetKey,
        symbol: target.symbol,
        provider: resolved.provider,
        status: "updated",
        fallback: resolved.fallback,
        degraded: Boolean(sanitizedSample.degraded),
        price: observation.price,
        timestamp: ts,
      });
      feederEvents.emit("asset:updated", {
        assetKey: target.assetKey,
        symbol: target.symbol,
        provider: resolved.provider,
        fallback: resolved.fallback,
        degraded: Boolean(sanitizedSample.degraded),
        observation,
      });
      summary.updated += 1;
    } catch (error) {
      const err = error as Error & { data?: unknown; shortMessage?: string };
      console.warn(`⚠️  Failed to fetch ${target.assetKey}:`, err.message ?? String(err));
      if (err.shortMessage && err.shortMessage !== err.message) {
        console.warn(`   shortMessage: ${err.shortMessage}`);
      }
      if (err.data) {
        console.warn(`   data:`, err.data);
      }
      results.push({
        assetKey: target.assetKey,
        symbol: target.symbol,
        provider: providerList[0],
        status: "skipped",
        fallback: false,
        degraded: false,
        message: err.message ?? String(err),
      });
      feederEvents.emit("asset:skipped", {
        assetKey: target.assetKey,
        symbol: target.symbol,
        reason: err.message ?? "error",
        error: err.message ?? String(err),
      });
      summary.skipped += 1;
    }
  }

  if (options.commit && harvested.length > 0) {
    if (!oracle) {
      throw new Error("MedianOracle contract not available for commit");
    }

    if (options.advanceTime) {
      const networkName = networkNameFromProvider(provider).toLowerCase();
      if (!["localhost", "hardhat"].includes(networkName)) {
        throw new Error("--advance-time is only supported on localhost or hardhat networks");
      }

      const maxTimestamp = Math.max(...harvested.map((item) => item.timestamp));
      await provider.send("evm_setNextBlockTimestamp", [maxTimestamp]);
      await provider.send("evm_mine", []);
    }
    const maybeBatch = (oracle as unknown as { updatePriceBatch?: Function }).updatePriceBatch;

    console.log(
      `[COMMIT] Preparing on-chain update for ${harvested.length} assets using MedianOracle at ${oracle.target}`
    );

    try {
      if (typeof maybeBatch === "function") {
        const assetIds = harvested.map((item) => item.observation.assetId);
        const prices = harvested.map((item) => item.observation.price);
        const timestamps = harvested.map((item) => item.observation.ts);
        const decimals = harvested.map((item) => item.observation.decimals);
        const degradedFlags = harvested.map((item) => item.observation.degraded);

        console.log(`[COMMIT] MedianOracle.updatePriceBatch`);
        console.log(`  assetIds:`, assetIds);
        console.log(`  prices:`, prices);
        console.log(`  timestamps:`, timestamps);
        console.log(`  decimals:`, decimals);
        console.log(`  degraded:`, degradedFlags);

        const tx = await (
          oracle as unknown as {
            updatePriceBatch: (
              assets: string[],
              prices: bigint[],
              timestamps: bigint[],
              decimals: number[],
              degraded: boolean[]
            ) => Promise<{ wait: () => Promise<unknown>; hash: string }>;
          }
        ).updatePriceBatch(assetIds, prices, timestamps, decimals, degradedFlags);
        await tx.wait();
        console.log(`[COMMIT] success (tx hash: ${tx.hash})`);
        txHashes.push(tx.hash);
        feederEvents.emit("commit:success", {
          txHash: tx.hash,
          assetKeys: harvested.map((item) => item.assetKey),
          batch: true,
        });
      } else {
        for (const item of harvested) {
          const { observation, assetKey } = item;
          try {
            console.log(`[COMMIT] MedianOracle.updatePrice`);
            console.log(`  assetId: ${observation.assetId}`);
            console.log(`  price: ${observation.price}`);
            console.log(`  timestamp: ${observation.ts}`);
            console.log(`  decimals: ${observation.decimals}`);
            console.log(`  sourceSet: FEEDER`);
            console.log(`  degraded: ${observation.degraded}`);
            const tx = await oracle.updatePrice(
              observation.assetId,
              observation.price,
              observation.ts,
              observation.decimals,
              "FEEDER",
              observation.degraded
            );
            await tx.wait();
            console.log(`[COMMIT] success (tx hash: ${tx.hash})`);
            txHashes.push(tx.hash);
            feederEvents.emit("commit:success", {
              txHash: tx.hash,
              assetKeys: [assetKey],
              batch: false,
            });
          } catch (err) {
            console.error(`[COMMIT] revert MedianOracle.updatePrice`);
            console.error(`  assetId: ${observation.assetId}`);
            console.error(`  price: ${observation.price}`);
            console.error(`  timestamp: ${observation.ts}`);
            console.error(`  decimals: ${observation.decimals}`);
            console.error(`  sourceSet: FEEDER`);
            console.error(`  degraded: ${observation.degraded}`);
            console.error(`  error:`, err);
            feederEvents.emit("commit:error", {
              assetKeys: [assetKey],
              error: err,
            });
            throw err;
          }
        }
      }
    } catch (err) {
      console.error(`[COMMIT] revert MedianOracle.updatePriceBatch`);
      console.error(`  error:`, err);
      feederEvents.emit("commit:error", {
        assetKeys: harvested.map((item) => item.assetKey),
        error: err,
      });
      throw err;
    }
  }

  summary.results = results;
  summary.harvested = harvested;
  summary.txHashes = txHashes;

  return summary;
}

type CliOptions = FeederOptions & { help?: boolean };

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    network: process.env.HARDHAT_NETWORK || "localhost",
    commit: process.env.FEEDER_COMMIT_DELEGATED === "1",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    switch (key) {
      case "help":
        options.help = true;
        break;
      case "network":
        options.network = argv[++i] ?? options.network;
        break;
      case "addresses":
        options.addressesPath = argv[++i];
        break;
      case "symbols":
        options.symbols = (argv[++i] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        break;
      case "commit":
        options.commit = true;
        break;
      case "dry":
        options.commit = false;
        break;
      case "force-timestamp": {
        const raw = argv[++i];
        if (!raw) {
          throw new Error("--force-timestamp requires a value (now|<unix>)");
        }
        if (raw === "now") {
          options.forceTimestamp = "now";
        } else {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            throw new Error(`Invalid --force-timestamp value: ${raw}`);
          }
          options.forceTimestamp = String(Math.trunc(parsed));
        }
        break;
      }
      case "advance-time":
        options.advanceTime = true;
        break;
      default:
        throw new Error(`Unknown flag --${key}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/ops/price-feeder.ts [options]\n\n`);
  console.log(`Options:`);
  console.log(`  --network <name>      Hardhat network (default: localhost)`);
  console.log(`  --addresses <path>    Override deployment addresses file`);
  console.log(`  --symbols <list>      Comma-separated list of oracle asset identifiers`);
  console.log(`  --commit              Submit updates to MedianOracle (omit for dry-run)`);
  console.log(`  --dry                 Force dry-run`);
  console.log(`  --force-timestamp v   Force commit timestamp ("now" or unix seconds)`);
  console.log(`  --advance-time        Mine a block at forced timestamp (localhost/hardhat only)`);
  console.log(`  --help                Show this message`);
}

export async function runFeederCli(argv: string[]) {
  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error((error as Error).message);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    printHelp();
    return;
  }

  if (options.symbols && options.symbols.length === 0) {
    console.warn("No symbols provided; falling back to configured assets map.");
    delete options.symbols;
  }

  try {
    const summary = await runFeeder(options);
    console.log(formatSummary(summary));
  } catch (error) {
    console.error("❌ price-feeder failed:", (error as Error).message);
    process.exitCode = 1;
  }
}

export default runFeederCli;
