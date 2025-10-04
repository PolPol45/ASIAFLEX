import { keccak256, toUtf8Bytes } from "ethers";
import { loadAddresses } from "../helpers/addresses";
import { listAssetFeeds, resolveAssetFeed, type AssetFeedConfig } from "./assets.map";
import { normalizeTo18, PriceSample, Provider } from "./providers/Provider";
import StooqProvider from "./providers/StooqProvider";
import ExchangeRateProvider from "./providers/ExchangeRateProvider";
import GoldPriceProvider from "./providers/GoldPriceProvider";

export type FeederOptions = {
  network: string;
  addressesPath?: string;
  symbols?: string[];
  commit?: boolean;
  overrideProviders?: Record<string, Provider>;
};

type ProviderRegistry = Map<string, Provider>;

type TargetAsset = AssetFeedConfig & { assetKey: string };

type Summary = {
  total: number;
  updated: number;
  degraded: number;
  skipped: number;
  dryRun: boolean;
};

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

async function getOracleContract(hre: typeof import("hardhat"), network: string, addressesPath?: string) {
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

function encodePrice(assetKey: string, sample: PriceSample) {
  const normalized = normalizeTo18(sample.value, sample.decimals);
  return {
    assetId: keccak256(toUtf8Bytes(assetKey)),
    price: normalized,
    ts: BigInt(sample.ts),
    decimals: 18,
    degraded: Boolean(sample.degraded),
  };
}

function formatSummary(summary: Summary) {
  const { total, updated, degraded, skipped, dryRun } = summary;
  return `Processed ${total} assets → updated: ${updated}${dryRun ? " (dry-run)" : ""}, degraded: ${degraded}, skipped: ${skipped}`;
}

export async function runFeeder(options: FeederOptions): Promise<Summary> {
  const registry: ProviderRegistry = new Map();
  const targets = parseTargets(options.symbols);

  if (targets.length === 0) {
    throw new Error("No symbols provided and no default asset map available");
  }

  const summary: Summary = {
    total: targets.length,
    updated: 0,
    degraded: 0,
    skipped: 0,
    dryRun: !options.commit,
  };

  const harvested: ReturnType<typeof encodePrice>[] = [];

  for (const target of targets) {
    try {
      const resolved = await resolvePrice(target, registry, options);
      if (!resolved) {
        console.warn(`⚠️  No data returned for ${target.assetKey} (${target.symbol}), skipping.`);
        summary.skipped += 1;
        continue;
      }

      if (resolved.sample.degraded) {
        summary.degraded += 1;
      }

      harvested.push(encodePrice(target.assetKey, resolved.sample));
      summary.updated += 1;
    } catch (error) {
      console.warn(`⚠️  Failed to fetch ${target.assetKey}:`, (error as Error).message);
      summary.skipped += 1;
    }
  }

  if (options.commit && harvested.length > 0) {
    if (options.network) {
      process.env.HARDHAT_NETWORK = options.network;
    }
    const hre = await import("hardhat");
    const oracle = await getOracleContract(hre, options.network, options.addressesPath);
    const maybeBatch = (oracle as unknown as { updatePriceBatch?: Function }).updatePriceBatch;

    if (typeof maybeBatch === "function") {
      const assetIds = harvested.map((item) => item.assetId);
      const prices = harvested.map((item) => item.price);
      const timestamps = harvested.map((item) => item.ts);
      const decimals = harvested.map((item) => item.decimals);
      const degradedFlags = harvested.map((item) => item.degraded);

      const tx = await (
        oracle as unknown as {
          updatePriceBatch: (
            assets: string[],
            prices: bigint[],
            timestamps: bigint[],
            decimals: number[],
            degraded: boolean[]
          ) => Promise<{ wait: () => Promise<unknown> }>;
        }
      ).updatePriceBatch(assetIds, prices, timestamps, decimals, degradedFlags);
      await tx.wait();
    } else {
      for (const item of harvested) {
        const tx = await oracle.updatePrice(item.assetId, item.price, item.ts, item.decimals, "FEEDER", item.degraded);
        await tx.wait();
      }
    }
  }

  return summary;
}

type CliOptions = FeederOptions & { help?: boolean };

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    network: process.env.HARDHAT_NETWORK || "localhost",
    commit: false,
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
