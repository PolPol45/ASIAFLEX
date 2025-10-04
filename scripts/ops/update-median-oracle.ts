import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import type { MedianOracle } from "../../typechain-types";
import { BASKETS } from "../deploy/basketDescriptors";
import { loadAddresses, saveAddress } from "../helpers/addresses";
import { loadBasketDeployment, type BasketDeployment } from "./utils/baskets";

// -------- Types --------

type FxFeed = {
  type: "fx";
  codes: string[];
};

type FxBasketFeed = {
  type: "fx-basket";
  codes: string[];
};

type StooqFeed = {
  type: "stooq";
  symbol: string;
};

type FeedConfig = FxFeed | FxBasketFeed | StooqFeed;

type PriceSample = {
  price: number;
  timestamp: number;
  source: string;
};

type ParsedArgs = { _: string[]; [key: string]: string | boolean | string[] };

const FEED_CONFIG_PATH = path.join(__dirname, "../../config/oracle-feeds.json");
const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }

    const trimmed = arg.slice(2);
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex >= 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      parsed[key] = value;
      continue;
    }

    const key = trimmed;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }

  return parsed;
}

function pickStringArg(args: ParsedArgs, keys: string[], envKeys: string[] = []): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  for (const envKey of envKeys) {
    const envValue = process.env[envKey];
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim();
    }
  }

  return undefined;
}

function hasFlag(args: ParsedArgs, keys: string[], envKeys: string[] = []): boolean {
  for (const key of keys) {
    if (args[key] === true) {
      return true;
    }
  }

  for (const envKey of envKeys) {
    const envValue = process.env[envKey];
    if (envValue && TRUE_VALUES.has(envValue.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

// -------- Feed helpers --------

function loadFeedConfig(): Record<string, FeedConfig> {
  if (!fs.existsSync(FEED_CONFIG_PATH)) {
    throw new Error(`Feed config not found at ${FEED_CONFIG_PATH}`);
  }
  const raw = fs.readFileSync(FEED_CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

async function fetchFxRates(codes: string[]): Promise<{ rates: Record<string, number>; timestamp: number }> {
  if (codes.length === 0) {
    return { rates: {}, timestamp: Math.floor(Date.now() / 1000) };
  }

  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) {
    throw new Error(`FX API request failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data.result !== "success") {
    throw new Error(`FX API returned non-success result: ${data.result}`);
  }

  const fxRates: Record<string, number> = {};
  for (const code of codes) {
    const rate = data.rates?.[code];
    if (!rate) {
      throw new Error(`Missing FX rate for code ${code}`);
    }
    // API returns amount of currency per 1 USD. Invert to get USD per unit of currency.
    fxRates[code] = 1 / rate;
  }

  return {
    rates: fxRates,
    timestamp: Number(data.time_last_update_unix) || Math.floor(Date.now() / 1000),
  };
}

async function fetchFromStooq(symbol: string): Promise<PriceSample> {
  const params = new URLSearchParams({ s: symbol.toLowerCase(), f: "sd2t2ohlcv", h: "", e: "csv" });
  const url = `https://stooq.com/q/l/?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Stooq request for ${symbol} failed with status ${res.status}`);
  }

  const text = (await res.text()).trim();
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error(`Stooq response missing data for ${symbol}`);
  }

  const values = lines[1].split(",");
  if (values.length < 7) {
    throw new Error(`Unexpected Stooq CSV structure for ${symbol}`);
  }

  const closeRaw = values[6];
  if (!closeRaw || closeRaw === "N/D") {
    throw new Error(`Stooq close price unavailable for ${symbol}`);
  }

  const close = Number(closeRaw);
  if (Number.isNaN(close) || close <= 0) {
    throw new Error(`Invalid close price for ${symbol}: ${closeRaw}`);
  }

  let timestamp = Math.floor(Date.now() / 1000);
  const date = values[1];
  const time = values[2];
  if (date && date !== "N/D" && time && time !== "N/D") {
    const iso = `${date}T${time}Z`;
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) {
      timestamp = Math.floor(parsed / 1000);
    }
  }

  return {
    price: close,
    timestamp,
    source: `STOOQ::${symbol.toUpperCase()}`,
  };
}

function computeFxBasket(codes: string[], fxRates: Record<string, number>): number {
  if (codes.length === 0) {
    throw new Error("FX basket requires at least one currency code");
  }

  const prices: number[] = codes.map((code) => {
    const rate = fxRates[code];
    if (!rate) {
      throw new Error(`No FX rate loaded for ${code}`);
    }
    return rate;
  });

  const sum = prices.reduce((acc, value) => acc + value, 0);
  return sum / prices.length;
}

async function resolvePrice(
  asset: string,
  feed: FeedConfig,
  fxRates: Record<string, number>,
  fxTimestamp: number
): Promise<PriceSample> {
  switch (feed.type) {
    case "fx": {
      const code = feed.codes[0];
      if (!code) throw new Error(`FX feed for ${asset} missing code`);
      const rate = fxRates[code];
      if (!rate) throw new Error(`Missing FX rate for ${code}`);
      return {
        price: rate,
        timestamp: fxTimestamp,
        source: `FX::${code}`,
      };
    }
    case "fx-basket": {
      const price = computeFxBasket(feed.codes, fxRates);
      return {
        price,
        timestamp: fxTimestamp,
        source: `FX-BASKET::${feed.codes.join("+")}`,
      };
    }
    case "stooq": {
      return fetchFromStooq(feed.symbol);
    }
    default:
      throw new Error(`Unsupported feed type for ${asset}`);
  }
}

function formatPriceForUnits(price: number): string {
  return price.toFixed(18);
}

// -------- Main flow --------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const feedConfig = loadFeedConfig();

  const uniqueAssets = new Set<string>();
  for (const basket of BASKETS) {
    for (const allocation of basket.allocations) {
      uniqueAssets.add(allocation.assetId);
    }
  }

  const fxCodesNeeded = new Set<string>();
  for (const asset of uniqueAssets) {
    const feed = feedConfig[asset];
    if (!feed) {
      throw new Error(`No feed configuration found for asset ${asset}`);
    }
    if (feed.type === "fx" || feed.type === "fx-basket") {
      feed.codes.forEach((code) => fxCodesNeeded.add(code));
    }
  }

  console.log("🌍 Fetching FX rates...");
  const { rates: fxRates, timestamp: fxTimestamp } = await fetchFxRates(Array.from(fxCodesNeeded));

  const [signer] = await ethers.getSigners();
  const provider = signer.provider!;
  const network = await provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const addressesOverride = pickStringArg(args, ["addresses"], ["ORACLE_ADDRESSES_PATH"]);
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkLabel, addressesOverride);

  const snapshotOverride = pickStringArg(args, ["snapshot"], ["ORACLE_SNAPSHOT_PATH"]);
  let snapshot: BasketDeployment | undefined;
  let snapshotPath: string | undefined;
  try {
    if (snapshotOverride) {
      const resolved = path.resolve(snapshotOverride);
      snapshot = JSON.parse(fs.readFileSync(resolved, "utf8")) as BasketDeployment;
      snapshotPath = resolved;
    } else {
      snapshot = loadBasketDeployment(networkLabel, network.chainId);
    }
  } catch (error) {
    if (snapshotOverride) {
      throw error;
    }
  }

  const medianOracleCandidate =
    pickStringArg(args, ["median", "oracle", "median-oracle"], ["ORACLE_ADDRESS", "MEDIAN_ORACLE"]) ??
    addresses.contracts?.MedianOracle ??
    snapshot?.medianOracle ??
    snapshot?.oracle;

  if (!medianOracleCandidate || !ethers.isAddress(medianOracleCandidate)) {
    throw new Error(
      "Indirizzo MedianOracle non trovato. Specifica --median <address> oppure aggiorna il file di indirizzi."
    );
  }

  const oracleAddress = ethers.getAddress(medianOracleCandidate);
  const oracle = (await ethers.getContractAt("MedianOracle", oracleAddress, signer)) as MedianOracle;

  const managerCandidate =
    pickStringArg(args, ["manager"], ["BASKET_MANAGER", "ORACLE_MANAGER"]) ??
    addresses.contracts?.BasketManager ??
    snapshot?.manager;
  const managerAddress =
    managerCandidate && ethers.isAddress(managerCandidate) ? ethers.getAddress(managerCandidate) : undefined;

  saveAddress(networkLabel, "MedianOracle", oracleAddress, addressesOverride);
  if (managerAddress) {
    saveAddress(networkLabel, "BasketManager", managerAddress, addressesOverride);
  }

  console.log(`🔐 Signer:  ${signer.address}`);
  console.log(`🌐 Network: ${networkLabel}`);
  console.log(`📂 Addresses file: ${addressesPath}`);
  if (snapshotPath) {
    console.log(`🗂️  Snapshot: ${snapshotPath}`);
  }
  console.log(`🛰️  MedianOracle: ${oracleAddress}`);
  if (managerAddress) {
    console.log(`🏦 BasketManager: ${managerAddress}`);
  }

  const dryRun = hasFlag(args, ["dry-run", "dry"], ["ORACLE_DRY_RUN"]);
  const assetFilter = parseList(pickStringArg(args, ["assets"], ["ORACLE_ASSETS"]));

  const block = await provider.getBlock("latest");
  const fallbackTimestamp = Number(block?.timestamp ?? Math.floor(Date.now() / 1000));

  const assetsToProcess = assetFilter.length > 0 ? new Set(assetFilter) : uniqueAssets;
  let updated = 0;

  for (const asset of assetsToProcess) {
    const feed = feedConfig[asset];
    if (!feed) {
      console.warn(`⚠️  Nessun feed configurato per ${asset}, lo salto.`);
      continue;
    }

    const priceSample = await resolvePrice(asset, feed, fxRates, fxTimestamp);
    let timestamp = priceSample.timestamp || fallbackTimestamp;
    const maxAllowedTimestamp = fallbackTimestamp + 240;
    if (timestamp > maxAllowedTimestamp) {
      console.warn(
        `⚠️  ${asset} timestamp ${timestamp} oltre il blocco ${fallbackTimestamp}; lo limito a ${maxAllowedTimestamp}.`
      );
      timestamp = maxAllowedTimestamp;
    }

    const priceWei = ethers.parseUnits(formatPriceForUnits(priceSample.price), 18);
    const assetId = ethers.keccak256(ethers.toUtf8Bytes(asset));

    console.log(
      `${dryRun ? "🧪" : "📈"} ${asset.padEnd(10)} $${priceSample.price.toFixed(6)} (fonte: ${priceSample.source}, ts: ${timestamp})`
    );

    if (dryRun) {
      continue;
    }

    const tx = await oracle.updatePrice(assetId, priceWei, BigInt(timestamp), 18, priceSample.source, false);
    const receipt = await tx.wait();
    console.log(`   ↳ tx: ${tx.hash} (block ${receipt?.blockNumber})`);
    updated += 1;
  }

  if (dryRun) {
    console.log(`🧪 Dry run completato: ${assetsToProcess.size} asset analizzati, nessuna transazione inviata.`);
  } else {
    console.log(`✅ MedianOracle aggiornato per ${updated}/${assetsToProcess.size} asset.`);
  }
}

main().catch((error) => {
  console.error("❌ Failed to update MedianOracle", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
