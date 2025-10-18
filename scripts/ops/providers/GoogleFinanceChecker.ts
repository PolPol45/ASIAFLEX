import axios from "axios";
import { setTimeout as delay } from "node:timers/promises";

const FOREX_SYMBOL_REGEX = /^[A-Z]{6}$/;
const FX_THRESHOLD = 1.0;
const XAU_THRESHOLD = 1.5;
const SYMBOL_OVERRIDES: Record<string, { futuresSymbol: string; exchange: string; label: string }> = {
  XAUUSD: { futuresSymbol: "GCW00", exchange: "COMEX", label: "Gold" },
};

type Fetcher = (symbol: string) => Promise<string>;

type GoogleResolutionPath = "straight" | "dashed" | "inverse" | `override-${string}`;

export interface GoogleCheckResult {
  symbol: string;
  ok: boolean;
  providerPrice: number;
  googlePrice: number | null;
  diffPct: number | null;
  threshold: number;
  inverseUsed: boolean;
  inverseSymbol?: string;
  resolutionPath?: GoogleResolutionPath;
  alert?: string;
  error?: string;
}

const googleAlerts: GoogleCheckResult[] = [];
const latestResults = new Map<string, GoogleCheckResult>();

async function fetchGoogleMarkup(symbol: string): Promise<string> {
  const encodedSymbol = encodeURIComponent(symbol);
  const hasExplicitSuffix = symbol.includes(":");
  const usesDash = symbol.includes("-");
  const suffix = hasExplicitSuffix || usesDash ? "" : ":CURRENCY";
  const url = `https://www.google.com/finance/quote/${encodedSymbol}${suffix}`;
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    Accept: "text/html",
  } as const;

  const params = { hl: "en", gl: "US" } as const;
  const attempts = 2;

  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await axios.get(url, {
        headers,
        params,
        timeout: 10_000,
        validateStatus: (status) => status >= 200 && status < 300,
      });
      return response.data;
    } catch (error) {
      const isAxios = axios.isAxiosError(error);
      const status = isAxios ? error.response?.status : undefined;
      const shouldRetry = status === 429 || status === 503;
      if (shouldRetry && index < attempts - 1) {
        const waitMs = 250 * 2 ** index;
        await delay(waitMs);
        continue;
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error("Google Finance request failed");
}

let markupFetcher: Fetcher = fetchGoogleMarkup;

interface CandidatePrice {
  price: number | null;
  slug?: string;
  path?: GoogleResolutionPath;
  lastError?: Error | null;
}

async function tryResolvePrice(
  candidates: string[],
  parser: (markup: string, slug: string) => CandidatePrice
): Promise<CandidatePrice> {
  let lastError: Error | null = null;
  for (const candidate of candidates) {
    let markup: string;
    try {
      markup = await markupFetcher(candidate);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }

    const parsed = parser(markup, candidate);
    if (parsed.price !== null && Number.isFinite(parsed.price) && parsed.price > 0) {
      return {
        price: parsed.price,
        slug: candidate,
        path: parsed.path ?? (candidate.includes("-") ? "dashed" : "straight"),
      };
    }
  }

  return { price: null, lastError };
}

function extractForexPrice(markup: string, base: string, quote: string): number | null {
  const pairPattern = new RegExp(
    String.raw`"${base}\s*/\s*${quote}"\s*,\s*\d+\s*,\s*null\s*,\s*\[\s*(-?[\d.,]+?)\s*(?:,|\])`,
    "i"
  );
  const match = markup.match(pairPattern);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractOverridePrice(markup: string, symbol: string): number | null {
  const override = SYMBOL_OVERRIDES[symbol];
  if (!override) {
    return null;
  }

  const pattern = new RegExp(
    String.raw`\["${override.futuresSymbol}"\s*,\s*"${override.exchange}"\]\s*,\s*"${override.label}"\s*,\s*4\s*,\s*"USD"\s*,\s*\[\s*(-?[\d.,]+?)\s*(?:,|\])`,
    "i"
  );
  const match = markup.match(pattern);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number.parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setGoogleMarkupFetcher(fetcher: Fetcher): void {
  markupFetcher = fetcher;
}

export function resetGoogleMarkupFetcher(): void {
  markupFetcher = fetchGoogleMarkup;
}

export function resetGoogleAlerts(): void {
  googleAlerts.length = 0;
}

export function collectGoogleAlerts(): GoogleCheckResult[] {
  const snapshot = [...googleAlerts];
  googleAlerts.length = 0;
  return snapshot;
}

export function clearStoredGoogleChecks(): void {
  latestResults.clear();
}

export function getLastGoogleCheck(symbol: string): GoogleCheckResult | null {
  return latestResults.get(symbol.toUpperCase()) ?? null;
}

export async function checkWithGoogle(symbol: string, providerPrice: number): Promise<GoogleCheckResult> {
  const upperSymbol = symbol.toUpperCase();
  const result: GoogleCheckResult = {
    symbol: upperSymbol,
    ok: false,
    providerPrice,
    googlePrice: null,
    diffPct: null,
    threshold: SYMBOL_OVERRIDES[upperSymbol] ? XAU_THRESHOLD : FX_THRESHOLD,
    inverseUsed: false,
    resolutionPath: undefined,
  };

  if (!FOREX_SYMBOL_REGEX.test(upperSymbol)) {
    result.error = "unsupported symbol";
    latestResults.set(upperSymbol, result);
    return result;
  }

  const base = upperSymbol.slice(0, 3);
  const quote = upperSymbol.slice(3);

  try {
    const directCandidates = [`${base}${quote}`, `${base}-${quote}`];
    const directResolution = await tryResolvePrice(directCandidates, (markup, slug) => {
      const direct = extractForexPrice(markup, base, quote);
      if (direct !== null) {
        const path: GoogleResolutionPath = slug.includes("-") ? "dashed" : "straight";
        return { price: direct, path };
      }
      const overridePrice = extractOverridePrice(markup, upperSymbol);
      if (overridePrice !== null) {
        const overridePath = `override-${upperSymbol.slice(0, 3)}` as GoogleResolutionPath;
        return { price: overridePrice, path: overridePath };
      }
      return { price: null };
    });

    let googlePrice = directResolution.price;
    if (googlePrice !== null) {
      result.resolutionPath = directResolution.path;
      if (directResolution.path === "dashed" && directResolution.slug) {
        console.log(
          `[CHECKER:DASHED] ${upperSymbol} via ${directResolution.slug.toUpperCase()} = ${googlePrice.toFixed(6)}`
        );
      } else if (directResolution.path?.startsWith("override")) {
        console.log(`[CHECKER:OVERRIDE] ${upperSymbol} = ${googlePrice.toFixed(6)}`);
      }
    }

    if (googlePrice === null) {
      const inverseBase = quote;
      const inverseQuote = base;
      const inverseCandidates = [`${inverseBase}${inverseQuote}`, `${inverseBase}-${inverseQuote}`];
      const inverseResolution = await tryResolvePrice(inverseCandidates, (markup) => {
        const inversePrice = extractForexPrice(markup, inverseBase, inverseQuote);
        return { price: inversePrice, path: "inverse" };
      });

      const inversePrice = inverseResolution.price;
      if (inversePrice && Number.isFinite(inversePrice) && inversePrice > 0) {
        googlePrice = 1 / inversePrice;
        result.inverseUsed = true;
        result.resolutionPath = "inverse";
        const inverseSlug = inverseResolution.slug ?? `${inverseBase}${inverseQuote}`;
        const normalizedInverse = inverseSlug.replace(/[^A-Z]/gi, "").toUpperCase();
        result.inverseSymbol = normalizedInverse || `${inverseBase}${inverseQuote}`;
        console.log(`[CHECKER:INVERSE] ${upperSymbol} via ${inverseSlug.toUpperCase()} = ${googlePrice.toFixed(6)}`);
      }
    }

    if (googlePrice === null || !Number.isFinite(googlePrice) || googlePrice <= 0) {
      result.error = "Price not found in markup";
      console.warn(`[CHECKER:MISS] ${upperSymbol} (no match)`);
      latestResults.set(upperSymbol, result);
      return result;
    }

    result.googlePrice = googlePrice;
    const diffPct = googlePrice === 0 ? null : (Math.abs(providerPrice - googlePrice) / googlePrice) * 100;
    result.diffPct = diffPct;

    if (diffPct !== null && Number.isFinite(diffPct)) {
      if (diffPct <= result.threshold) {
        result.ok = true;
      } else {
        const alert = `[CHECKER:ALERT] ${upperSymbol} diff ${diffPct.toFixed(2)}% (provider ${providerPrice} vs google ${googlePrice})`;
        result.alert = alert;
        console.warn(alert);
        googleAlerts.push({ ...result });
      }
    } else {
      result.error = "Invalid diff";
      console.warn(`[CHECKER:MISS] ${upperSymbol} (invalid diff)`);
    }

    latestResults.set(upperSymbol, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;
    console.warn(`[CHECKER:GOOGLE:MISS] ${upperSymbol} (${message})`);
    latestResults.set(upperSymbol, result);
    return result;
  }
}
