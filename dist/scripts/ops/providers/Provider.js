"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerEvents = exports.PROVIDERS_PRIORITY = void 0;
exports.setFetchOverride = setFetchOverride;
exports.clearFetchOverride = clearFetchOverride;
exports.clearAllFetchOverrides = clearAllFetchOverrides;
exports.getLastKnownPrice = getLastKnownPrice;
exports.fetchYahooPrice = fetchYahooPrice;
exports.fetchPolygonPrice = fetchPolygonPrice;
exports.fetchPrice = fetchPrice;
exports.parsePrice = parsePrice;
exports.inferDecimals = inferDecimals;
exports.normalizeTo18 = normalizeTo18;
const axios_1 = __importDefault(require("axios"));
const node_events_1 = require("node:events");
const ethers_1 = require("ethers");
const assets_map_1 = require("../assets.map");
const GoogleFinanceChecker_1 = require("./GoogleFinanceChecker");
exports.PROVIDERS_PRIORITY = ["Yahoo", "Polygon", "Cache"];
const CACHE_TTL_MS = 60000;
const POLYGON_SYMBOL_REGEX = /^[A-Z]{6}$/;
class ProviderEventEmitter extends node_events_1.EventEmitter {
  on(event, listener) {
    return super.on(event, listener);
  }
  once(event, listener) {
    return super.once(event, listener);
  }
  off(event, listener) {
    return super.off(event, listener);
  }
  emit(event, payload) {
    return super.emit(event, payload);
  }
}
exports.providerEvents = new ProviderEventEmitter();
const yahooCache = new Map();
const fetchOverrides = new Map();
const lastGoodPrices = new Map();
function resolveOverrideKey(key) {
  return key.toUpperCase();
}
function resolveCanonicalSymbol(symbol) {
  const upper = symbol.toUpperCase();
  for (const [aliasKey, mapped] of Object.entries(assets_map_1.YAHOO_TICKER_ALIASES)) {
    if (mapped.toUpperCase() === upper) {
      return aliasKey.toUpperCase();
    }
  }
  return upper;
}
function canUsePolygon(canonicalSymbol) {
  if (!process.env.POLYGON_API_KEY) {
    return false;
  }
  if (canonicalSymbol === "XAUUSD") {
    return true;
  }
  return POLYGON_SYMBOL_REGEX.test(canonicalSymbol);
}
function setFetchOverride(symbolKey, override) {
  const upper = resolveOverrideKey(symbolKey);
  if (!override || Object.keys(override).length === 0) {
    fetchOverrides.delete(upper);
    return;
  }
  fetchOverrides.set(upper, override);
}
function clearFetchOverride(symbolKey) {
  fetchOverrides.delete(resolveOverrideKey(symbolKey));
}
function clearAllFetchOverrides() {
  fetchOverrides.clear();
}
function getLastKnownPrice(symbolKey) {
  const entry = lastGoodPrices.get(symbolKey.toUpperCase());
  return entry ? { ...entry } : null;
}
function rememberLastPrice(keys, value, source, timestamp) {
  for (const key of keys) {
    lastGoodPrices.set(key, { value, source, timestamp });
  }
}
async function fetchYahooPrice(ticker, options) {
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
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error("missing chart result");
  }
  let price = result?.meta?.regularMarketPrice;
  let source = "regular";
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
async function fetchPolygonPrice(symbol) {
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
  const { data } = await axios_1.default.get(url, {
    headers: {
      "User-Agent": "AsiaFlexWatcher/1.0",
      Accept: "application/json",
    },
    timeout: 5000,
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
async function fetchPrice(symbolKey) {
  const upperKey = symbolKey.toUpperCase();
  const lookupKey = assets_map_1.YAHOO_TICKER_ALIASES[upperKey] ?? upperKey;
  const canonicalSymbol = resolveCanonicalSymbol(upperKey);
  const ticker = assets_map_1.YAHOO_TICKERS[lookupKey];
  if (!ticker) {
    console.warn(`[SKIPPED] ${upperKey} — no Yahoo ticker configured.`);
    exports.providerEvents.emit("skip", { symbol: upperKey, reason: "no-ticker" });
    return null;
  }
  const override = fetchOverrides.get(upperKey) ?? fetchOverrides.get(lookupKey);
  const memoryKeys = Array.from(new Set([upperKey, lookupKey, canonicalSymbol]));
  let lastError;
  const handlers = {
    Yahoo: async () => {
      try {
        const quote = await fetchYahooPrice(ticker, { preferClose: override?.forceClose });
        const stale = Boolean(override?.forceClose) && quote.source !== "regular";
        rememberLastPrice(memoryKeys, quote.value, quote.source, quote.timestamp);
        exports.providerEvents.emit("price", {
          symbol: upperKey,
          ticker,
          value: quote.value,
          source: quote.source,
          stale,
          timestamp: quote.timestamp,
        });
        console.log(`[PROVIDER:YAHOO] ${upperKey} = ${quote.value}`);
        await (0, GoogleFinanceChecker_1.checkWithGoogle)(canonicalSymbol, quote.value);
        return {
          value: quote.value,
          ticker,
          source: quote.source,
          stale,
          timestamp: quote.timestamp,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        exports.providerEvents.emit("error", { symbol: upperKey, ticker, error: message });
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
      exports.providerEvents.emit("price", {
        symbol: upperKey,
        ticker: polygonTicker,
        value,
        source: "polygon",
        stale: false,
        timestamp,
      });
      console.log(`[PROVIDER:POLYGON] ${canonicalSymbol} = ${value}`);
      await (0, GoogleFinanceChecker_1.checkWithGoogle)(canonicalSymbol, value);
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
      exports.providerEvents.emit("price", {
        symbol: upperKey,
        ticker,
        value: cached.value,
        source: "cache",
        stale: true,
        timestamp: cached.timestamp,
      });
      console.warn(`[DEGRADED] ${upperKey} using cached price ${cached.value}`);
      await (0, GoogleFinanceChecker_1.checkWithGoogle)(canonicalSymbol, cached.value);
      return {
        value: cached.value,
        ticker,
        source: "cache",
        stale: true,
        timestamp: cached.timestamp,
      };
    },
  };
  for (const source of exports.PROVIDERS_PRIORITY) {
    try {
      const result = await handlers[source]();
      if (source !== exports.PROVIDERS_PRIORITY[0]) {
        console.log(`[FALLBACK:USED] ${upperKey} → ${source}`);
        exports.providerEvents.emit("fallback", { symbol: upperKey, provider: source });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      console.warn(`[FALLBACK→${source}] ${upperKey} failed: ${message}`);
    }
  }
  exports.providerEvents.emit("skip", { symbol: upperKey, ticker, reason: lastError ?? "unavailable" });
  console.warn(`[SKIPPED] ${upperKey}`);
  return null;
}
function parsePrice(value, decimals) {
  const normalizedDecimals = typeof decimals === "number" ? decimals : inferDecimals(value);
  return {
    amount: (0, ethers_1.parseUnits)(value, normalizedDecimals),
    decimals: normalizedDecimals,
  };
}
function inferDecimals(raw) {
  const [, fractional = ""] = raw.split(".");
  return Math.min(fractional.length, 18);
}
function normalizeTo18(value, decimals) {
  if (decimals === 18) return value;
  if (decimals > 18) {
    const diff = decimals - 18;
    return value / 10n ** BigInt(diff);
  }
  const diff = 18 - decimals;
  return value * 10n ** BigInt(diff);
}
