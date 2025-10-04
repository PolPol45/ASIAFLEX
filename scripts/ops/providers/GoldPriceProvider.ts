import { parsePrice, PriceSample, Provider } from "./Provider";
import { getCached, setCache, ProviderHttpError, withRetry } from "./cache";

const DEFAULT_TTL_MS = 60_000;

export class GoldPriceProvider implements Provider {
  readonly name = "gold-price";

  constructor(private readonly apiKey = process.env.GOLD_API_KEY) {}

  async get(symbol: string): Promise<PriceSample | null> {
    if (symbol.toUpperCase() !== "XAUUSD") {
      return null;
    }

    const cached = getCached(this.name, symbol);
    if (cached) {
      return cached;
    }

    const key = this.apiKey;
    if (!key) {
      throw new Error("Missing GOLD_API_KEY environment variable");
    }

    const url = "https://www.goldapi.io/api/XAU/USD";
    const token = key.startsWith("Bearer ") ? key : `Bearer ${key}`;

    const sample = await withRetry(async () => {
      const response = await fetch(url, {
        headers: {
          "x-access-token": token,
          "User-Agent": "AsiaFlex Price Feeder",
        } satisfies Record<string, string>,
      });
      if (!response.ok) {
        throw new ProviderHttpError(`Gold API failed (${response.status})`, response.status);
      }
      const json = (await response.json()) as { price?: number; timestamp?: number };
      if (!json.price || json.price <= 0) {
        return null;
      }
      const decimals = 4;
      const { amount } = parsePrice(json.price.toFixed(decimals), decimals);
      const sampleInner: PriceSample = {
        symbol,
        value: amount,
        decimals,
        ts: json.timestamp || Math.floor(Date.now() / 1000),
      };
      setCache(this.name, symbol, sampleInner, DEFAULT_TTL_MS);
      return sampleInner;
    });

    return sample;
  }
}

export default GoldPriceProvider;
