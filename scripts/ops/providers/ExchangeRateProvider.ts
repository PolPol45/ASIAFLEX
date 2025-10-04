import { parsePrice, PriceSample, Provider } from "./Provider";
import { getCached, setCache, ProviderHttpError, withRetry } from "./cache";

const DEFAULT_TTL_MS = 60_000;

type RatesPayload = {
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
};

function splitSymbol(symbol: string) {
  if (symbol.length !== 6) {
    throw new Error(`Unsupported FX symbol ${symbol}. Expected 6 characters like EURUSD.`);
  }
  const base = symbol.slice(0, 3).toUpperCase();
  const quote = symbol.slice(3).toUpperCase();
  return { base, quote };
}

export class ExchangeRateProvider implements Provider {
  readonly name = "exchange-rate";

  private cache: { expiresAt: number; payload: RatesPayload } | null = null;

  constructor(private readonly apiKey = process.env.EXCHANGERATE_API_KEY) {}

  private async loadRates(): Promise<RatesPayload> {
    if (!this.apiKey) {
      throw new Error("Missing EXCHANGERATE_API_KEY environment variable");
    }

    if (this.cache && Date.now() < this.cache.expiresAt) {
      return this.cache.payload;
    }

    const url = `https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/USD`;

    const payload = await withRetry(async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new ProviderHttpError(`ExchangeRate API failed (${response.status})`, response.status);
      }
      const json = (await response.json()) as RatesPayload & { result?: string };
      if (json.result && json.result !== "success") {
        throw new Error(`ExchangeRate API returned ${json.result}`);
      }
      if (!json.conversion_rates) {
        throw new Error("ExchangeRate payload missing conversion_rates");
      }
      return {
        conversion_rates: json.conversion_rates,
        time_last_update_unix: json.time_last_update_unix || Math.floor(Date.now() / 1000),
      } satisfies RatesPayload;
    });

    this.cache = {
      expiresAt: Date.now() + DEFAULT_TTL_MS,
      payload,
    };

    return payload;
  }

  async get(symbol: string): Promise<PriceSample | null> {
    const cached = getCached(this.name, symbol);
    if (cached) {
      return cached;
    }

    const { base, quote } = splitSymbol(symbol);
    const payload = await this.loadRates();
    const baseRate = payload.conversion_rates[base];
    const quoteRate = payload.conversion_rates[quote];
    if (!baseRate || !quoteRate) {
      return null;
    }

    const rate = (1 / baseRate) * quoteRate;
    if (!Number.isFinite(rate) || rate <= 0) {
      return null;
    }

    const { amount, decimals } = parsePrice(rate.toFixed(6), 6);

    const sample: PriceSample = {
      symbol,
      value: amount,
      decimals,
      ts: payload.time_last_update_unix,
    };

    setCache(this.name, symbol, sample, DEFAULT_TTL_MS);
    return sample;
  }
}

export default ExchangeRateProvider;
