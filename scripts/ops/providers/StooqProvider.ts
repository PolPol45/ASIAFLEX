import { parsePrice, PriceSample, Provider } from "./Provider";
import { getCached, setCache, ProviderHttpError, withRetry } from "./cache";

const BASE_URL = "https://stooq.com/q/l/?";

function buildUrl(symbol: string) {
  const params = new URLSearchParams({ s: symbol.toLowerCase(), f: "sd2t2ohlcv", h: "", e: "csv" });
  return `${BASE_URL}${params.toString()}`;
}

function parseCsv(symbol: string, raw: string): PriceSample | null {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return null;
  }
  const values = lines[1].split(",");
  if (values.length < 7) {
    return null;
  }

  const close = values[6];
  if (!close || close === "N/D") {
    return null;
  }

  const { amount, decimals } = parsePrice(close);

  let ts = Math.floor(Date.now() / 1000);
  const [date, time] = [values[1], values[2]];
  if (date && date !== "N/D" && time && time !== "N/D") {
    const iso = `${date}T${time}Z`;
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) {
      ts = Math.floor(parsed / 1000);
    }
  }

  return {
    symbol,
    value: amount,
    decimals,
    ts,
  };
}

export class StooqProvider implements Provider {
  readonly name = "stooq";

  async get(symbol: string): Promise<PriceSample | null> {
    const cached = getCached(this.name, symbol);
    if (cached) {
      return cached;
    }

    const url = buildUrl(symbol);

    const sample = await withRetry(async () => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (AsiaFlex Price Feeder)",
        },
      });
      if (!response.ok) {
        throw new ProviderHttpError(`Stooq request failed (${response.status})`, response.status);
      }
      const text = await response.text();
      const parsed = parseCsv(symbol, text);
      if (!parsed) {
        return null;
      }
      setCache(this.name, symbol, parsed);
      return parsed;
    });

    return sample;
  }
}

export default StooqProvider;
