import { parsePrice, PriceSample, Provider, fetchPrice } from "./Provider";
import type { FetchPriceResult } from "./Provider";

export class ExchangeRateProvider implements Provider {
  readonly name = "exchange-rate";

  async get(symbol: string): Promise<PriceSample | null> {
    const response = await fetchPrice(symbol);
    if (!response) return null;
    const quote = response as FetchPriceResult;
    const { amount, decimals } = parsePrice(quote.value.toString());
    const ts = Number.isFinite(quote.timestamp) ? Math.floor(quote.timestamp) : Math.floor(Date.now() / 1000);
    return {
      symbol,
      value: amount,
      decimals,
      ts,
      degraded: quote.stale || quote.source !== "regular",
    };
  }
}

export default ExchangeRateProvider;
