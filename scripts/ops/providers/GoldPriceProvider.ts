import { parsePrice, PriceSample, Provider, fetchPrice } from "./Provider";
import type { FetchPriceResult } from "./Provider";

export class GoldPriceProvider implements Provider {
  readonly name = "gold-price";

  async get(symbol: string): Promise<PriceSample | null> {
    if (symbol.toUpperCase() !== "XAUUSD") {
      return null;
    }
    const response = await fetchPrice("GOLD");
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

export default GoldPriceProvider;
