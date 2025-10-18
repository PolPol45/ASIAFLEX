import { parsePrice, PriceSample, Provider, fetchPrice } from "./Provider";
import type { FetchPriceResult } from "./Provider";

export class StooqProvider implements Provider {
  readonly name = "stooq";

  async get(symbol: string): Promise<PriceSample | null> {
    const response = await fetchPrice(symbol);
    if (!response) return null;
    const quote = response as FetchPriceResult;
    const { amount, decimals } = parsePrice(quote.value.toString());
    return {
      symbol,
      value: amount,
      decimals,
      ts: Number.isFinite(quote.timestamp) ? Math.floor(quote.timestamp) : Math.floor(Date.now() / 1000),
      degraded: quote.stale || quote.source !== "regular",
    };
  }
}

export default StooqProvider;
