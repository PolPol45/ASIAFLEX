import axios from "axios";
import { EventEmitter } from "node:events";
import { parseUnits } from "ethers";
import { YAHOO_TICKERS, YAHOO_TICKER_ALIASES } from "../assets.map";
import { checkWithGoogle } from "./GoogleFinanceChecker";

export interface PriceSample {
  symbol: string;
  value: bigint;
  decimals: number;
  ts: number;
  degraded?: boolean;
}

export interface Provider {
  name: string;
  get(symbol: string): Promise<PriceSample | null>;
}

export const PROVIDERS_PRIORITY = ["Yahoo", "Polygon", "Cache"] as const;
type ProviderSource = (typeof PROVIDERS_PRIORITY)[number];

const CACHE_TTL_MS = 60_000;
const POLYGON_SYMBOL_REGEX = /^[A-Z]{6}$/;

export type PriceSource = "regular" | "close" | "cache" | "polygon";

export interface FetchPriceResult {
  value: number;
  ticker: string;
  source: PriceSource;
  stale: boolean;
  timestamp: number;
}

export type FetchOverride = {
  forceClose?: boolean;
  useLastKnown?: boolean;
};

export interface ProviderEvents {
  price: { symbol: string; ticker: string; value: number; source: PriceSource; stale: boolean; timestamp: number };
  skip: { symbol: string; ticker?: string; reason: string };
  error: { symbol: string; ticker?: string; error: string };
  fallback: { symbol: string; provider: ProviderSource };
}

class ProviderEventEmitter extends EventEmitter {
  on<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this {
    return super.on(event, listener);
  }

  once<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this {
    return super.once(event, listener);
  }

  off<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this {
    return super.off(event, listener);
  }

  emit<K extends keyof ProviderEvents>(event: K, payload: ProviderEvents[K]): boolean {
    return super.emit(event, payload);
  }
}

export const providerEvents = new ProviderEventEmitter();

type CachedQuote = { value: number; expiresAt: number; source: PriceSource; timestamp: number };
const yahooCache = new Map<string, CachedQuote>();
const fetchOverrides = new Map<string, FetchOverride>();
const lastGoodPrices = new Map<string, { value: number; timestamp: number; source: PriceSource }>();

interface YahooPriceOptions {
  preferClose?: boolean;
}

interface YahooPriceResult {
  value: number;
  source: PriceSource;
  timestamp: number;
}

function resolveOverrideKey(key: string): string {
  return key.toUpperCase();
}

function resolveCanonicalSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  for (const [aliasKey, mapped] of Object.entries(YAHOO_TICKER_ALIASES)) {
    if (mapped.toUpperCase() === upper) {
      return aliasKey.toUpperCase();
    }
  }
  return upper;
}

function canUsePolygon(canonicalSymbol: string): boolean {
  if (!process.env.POLYGON_API_KEY) {
    return false;
  }
  if (canonicalSymbol === "XAUUSD") {
    return true;
  }
  return POLYGON_SYMBOL_REGEX.test(canonicalSymbol);
}

export function setFetchOverride(symbolKey: string, override?: FetchOverride | null): void {
  const upper = resolveOverrideKey(symbolKey);
  if (!override || Object.keys(override).length === 0) {
    fetchOverrides.delete(upper);
    return;
  }
  fetchOverrides.set(upper, override);
}

export function clearFetchOverride(symbolKey: string): void {
  fetchOverrides.delete(resolveOverrideKey(symbolKey));
}

export function clearAllFetchOverrides(): void {
  fetchOverrides.clear();
}

export function getLastKnownPrice(symbolKey: string): { value: number; timestamp: number; source: PriceSource } | null {
  const entry = lastGoodPrices.get(symbolKey.toUpperCase());
  return entry ? { ...entry } : null;
}

function rememberLastPrice(keys: string[], value: number, source: PriceSource, timestamp: number) {
  for (const key of keys) {
    lastGoodPrices.set(key, { value, source, timestamp });
  }
}

export async function fetchYahooPrice(ticker: string, options?: YahooPriceOptions): Promise<YahooPriceResult> {
  const cached = yahooCache.get(ticker);
  const now = Date.now();
  if (cached && now < cached.expiresAt) {
    if (!options?.preferClose || cached.source === "close") {
      return { value: cached.value, source: cached.source, timestamp: cached.timestamp };
    }
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AsiaFlexWatcher/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = (await response.json()) as any;
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error("missing chart result");
  }

  let price = result?.meta?.regularMarketPrice;
  let source: PriceSource = "regular";
  const metaTimestamp = typeof result?.meta?.regularMarketTime === "number" ? result.meta.regularMarketTime : undefined;
  let timestamp = metaTimestamp ?? Math.floor(Date.now() / 1000);

  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closes = result?.indicators?.quote?.[0]?.close;

  const preferClose = Boolean(options?.preferClose);
  const priceIsValid = typeof price === "number" && Number.isFinite(price) && price > 0;

  if (!priceIsValid || preferClose) {
    if (Array.isArray(closes)) {
      for (let i = closes.length - 1; i >= 0; i -= 1) {
        const candidate = closes[i];
        if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
          price = candidate;
          source = "close";
          const tsCandidate = timestamps?.[i];
          if (typeof tsCandidate === "number" && Number.isFinite(tsCandidate)) {
            timestamp = tsCandidate;
          }
          break;
        }
      }
    }
  }

  if (!(typeof price === "number" && Number.isFinite(price) && price > 0)) {
    throw new Error("missing regularMarketPrice");
  }

  yahooCache.set(ticker, { value: price, expiresAt: now + CACHE_TTL_MS, source, timestamp });
  return { value: price, source, timestamp };
}

export async function fetchPolygonPrice(symbol: string): Promise<{ value: number; timestamp: number }> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    throw new Error("Polygon API key missing");
  }

  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3);
  if (base.length !== 3 || quote.length !== 3) {
    throw new Error(`Unsupported Polygon symbol ${symbol}`);
  }

  const url = `https://api.polygon.io/v1/last_quote/currencies/${base}/${quote}?apiKey=${apiKey}`;
  const { data } = await axios.get(url, {
    headers: {
      "User-Agent": "AsiaFlexWatcher/1.0",
      Accept: "application/json",
    },
    timeout: 5_000,
  });

  const rawPrice = data?.last?.ask ?? data?.last?.bid;
  const price = typeof rawPrice === "string" ? Number.parseFloat(rawPrice) : Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Polygon price missing");
  }

  const rawTs = data?.last?.timestamp ?? data?.last?.updated;
  const timestamp =
    typeof rawTs === "number" && Number.isFinite(rawTs) ? Math.floor(rawTs / 1000) : Math.floor(Date.now() / 1000);

  return { value: price, timestamp };
}

export async function fetchPrice(symbolKey: string): Promise<FetchPriceResult | null> {
  const upperKey = symbolKey.toUpperCase();
  const lookupKey = YAHOO_TICKER_ALIASES[upperKey] ?? upperKey;
  const canonicalSymbol = resolveCanonicalSymbol(upperKey);
  const ticker = YAHOO_TICKERS[lookupKey];
  if (!ticker) {
    console.warn(`[SKIPPED] ${upperKey} — no Yahoo ticker configured.`);
    providerEvents.emit("skip", { symbol: upperKey, reason: "no-ticker" });
    return null;
  }

  const override = fetchOverrides.get(upperKey) ?? fetchOverrides.get(lookupKey);
  const memoryKeys = Array.from(new Set([upperKey, lookupKey, canonicalSymbol]));
  let lastError: string | undefined;

  const handlers: Record<ProviderSource, () => Promise<FetchPriceResult>> = {
    Yahoo: async () => {
      try {
        const quote = await fetchYahooPrice(ticker, { preferClose: override?.forceClose });
        const stale = Boolean(override?.forceClose) && quote.source !== "regular";
        rememberLastPrice(memoryKeys, quote.value, quote.source, quote.timestamp);
        providerEvents.emit("price", {
          symbol: upperKey,
          ticker,
          value: quote.value,
          source: quote.source,
          stale,
          timestamp: quote.timestamp,
        });
        console.log(`[PROVIDER:YAHOO] ${upperKey} = ${quote.value}`);
        await checkWithGoogle(canonicalSymbol, quote.value);
        return {
          value: quote.value,
          ticker,
          source: quote.source,
          stale,
          timestamp: quote.timestamp,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        providerEvents.emit("error", { symbol: upperKey, ticker, error: message });
        throw new Error(message);
      }
    },
    Polygon: async () => {
      if (!canUsePolygon(canonicalSymbol)) {
        throw new Error("Polygon unsupported for symbol");
      }
      const { value, timestamp } = await fetchPolygonPrice(canonicalSymbol);
      const polygonTicker = `POLYGON:${canonicalSymbol}`;
      rememberLastPrice(memoryKeys, value, "polygon", timestamp);
      providerEvents.emit("price", {
        symbol: upperKey,
        ticker: polygonTicker,
        value,
        source: "polygon",
        stale: false,
        timestamp,
      });
      console.log(`[PROVIDER:POLYGON] ${canonicalSymbol} = ${value}`);
      await checkWithGoogle(canonicalSymbol, value);
      return {
        value,
        ticker: polygonTicker,
        source: "polygon",
        stale: false,
        timestamp,
      };
    },
    Cache: async () => {
      if (!override?.useLastKnown) {
        throw new Error("Cache fallback disabled");
      }
      const cached =
        lastGoodPrices.get(canonicalSymbol) ?? lastGoodPrices.get(lookupKey) ?? lastGoodPrices.get(upperKey);
      if (!cached) {
        throw new Error("No cached price available");
      }
      providerEvents.emit("price", {
        symbol: upperKey,
        ticker,
        value: cached.value,
        source: "cache",
        stale: true,
        timestamp: cached.timestamp,
      });
      console.warn(`[DEGRADED] ${upperKey} using cached price ${cached.value}`);
      await checkWithGoogle(canonicalSymbol, cached.value);
      return {
        value: cached.value,
        ticker,
        source: "cache",
        stale: true,
        timestamp: cached.timestamp,
      };
    },
  };

  for (const source of PROVIDERS_PRIORITY) {
    try {
      const result = await handlers[source]();
      if (source !== PROVIDERS_PRIORITY[0]) {
        console.log(`[FALLBACK:USED] ${upperKey} → ${source}`);
        providerEvents.emit("fallback", { symbol: upperKey, provider: source });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      console.warn(`[FALLBACK→${source}] ${upperKey} failed: ${message}`);
    }
  }

  providerEvents.emit("skip", { symbol: upperKey, ticker, reason: lastError ?? "unavailable" });
  console.warn(`[SKIPPED] ${upperKey}`);
  return null;
}

export function parsePrice(value: string, decimals?: number): { amount: bigint; decimals: number } {
  const normalizedDecimals = typeof decimals === "number" ? decimals : inferDecimals(value);
  return {
    amount: parseUnits(value, normalizedDecimals),
    decimals: normalizedDecimals,
  };
}

export function inferDecimals(raw: string): number {
  const [, fractional = ""] = raw.split(".");
  return Math.min(fractional.length, 18);
}

export function normalizeTo18(value: bigint, decimals: number): bigint {
  if (decimals === 18) return value;
  if (decimals > 18) {
    const diff = decimals - 18;
    return value / 10n ** BigInt(diff);
  }
  const diff = 18 - decimals;
  return value * 10n ** BigInt(diff);
}
