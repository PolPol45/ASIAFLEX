import { fetchPrice, type FetchPriceResult } from "../providers/Provider";
import { checkWithGoogle, getLastGoogleCheck, type GoogleCheckResult } from "../providers/GoogleFinanceChecker";

export interface InverseCheckOutcome extends GoogleCheckResult {
  providerSource?: FetchPriceResult["source"];
  providerTicker?: FetchPriceResult["ticker"];
  providerTimestamp?: FetchPriceResult["timestamp"];
}

export interface InverseCheckReport {
  results: InverseCheckOutcome[];
  alerts: InverseCheckOutcome[];
}

async function resolveGoogleResult(symbol: string, providerPrice: number): Promise<GoogleCheckResult> {
  const cached = getLastGoogleCheck(symbol);
  if (cached && cached.providerPrice === providerPrice) {
    return cached;
  }
  return checkWithGoogle(symbol, providerPrice);
}

export async function executeInverseCheck(symbol: string): Promise<InverseCheckOutcome> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const providerQuote = await fetchPrice(upperSymbol);
    if (!providerQuote) {
      return {
        symbol: upperSymbol,
        ok: false,
        providerPrice: Number.NaN,
        googlePrice: null,
        diffPct: null,
        threshold: 1,
        inverseUsed: false,
        error: "provider unavailable",
      };
    }

    const googleResult = await resolveGoogleResult(upperSymbol, providerQuote.value);
    return {
      ...googleResult,
      providerSource: providerQuote.source,
      providerTicker: providerQuote.ticker,
      providerTimestamp: providerQuote.timestamp,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      symbol: upperSymbol,
      ok: false,
      providerPrice: Number.NaN,
      googlePrice: null,
      diffPct: null,
      threshold: 1,
      inverseUsed: false,
      error: message,
    };
  }
}

export async function runInverseChecks(symbols: string[]): Promise<InverseCheckReport> {
  const results: InverseCheckOutcome[] = [];

  for (const symbol of symbols) {
    const outcome = await executeInverseCheck(symbol);
    results.push(outcome);
  }

  const alerts = results.filter((item) => !item.ok || typeof item.alert === "string");
  return { results, alerts };
}
