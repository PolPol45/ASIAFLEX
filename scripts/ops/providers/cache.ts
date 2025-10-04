import fs from "fs";
import path from "path";
import { PriceSample } from "./Provider";

const CACHE_DIR = path.resolve(__dirname, "../../../.cache");
const CACHE_FILE = path.join(CACHE_DIR, "prices.json");
const DEFAULT_TTL_MS = 60_000;

type CacheEntry = {
  value: PriceSample;
  expiresAt: number;
};

type SerializedEntry = {
  value: Omit<PriceSample, "value"> & { value: string };
  expiresAt: number;
};

type CachePayload = Record<string, SerializedEntry>;

const memoryCache = new Map<string, CacheEntry>();
let diskLoaded = false;

function isExpired(entry: CacheEntry) {
  return Date.now() > entry.expiresAt;
}

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function serialize(sample: PriceSample): SerializedEntry["value"] {
  const { value, ...rest } = sample;
  return {
    ...rest,
    value: value.toString(),
  };
}

function deserialize(serialized: SerializedEntry["value"]): PriceSample {
  return {
    ...serialized,
    value: BigInt(serialized.value),
  };
}

function loadDiskCache() {
  if (diskLoaded) return;
  diskLoaded = true;

  if (!fs.existsSync(CACHE_FILE)) {
    return;
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const payload = JSON.parse(raw) as CachePayload;
    for (const [key, entry] of Object.entries(payload)) {
      const cacheEntry: CacheEntry = {
        value: deserialize(entry.value),
        expiresAt: entry.expiresAt,
      };
      if (!isExpired(cacheEntry)) {
        memoryCache.set(key, cacheEntry);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Failed to load cache file ${CACHE_FILE}:`, (error as Error).message);
  }
}

function persist() {
  ensureDir();
  const payload: CachePayload = {};
  for (const [key, entry] of memoryCache.entries()) {
    if (!isExpired(entry)) {
      payload[key] = {
        value: serialize(entry.value),
        expiresAt: entry.expiresAt,
      };
    }
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
}

export function cacheKey(providerName: string, symbol: string) {
  return `${providerName}::${symbol.toUpperCase()}`;
}

export function getCached(providerName: string, symbol: string): PriceSample | null {
  loadDiskCache();
  const key = cacheKey(providerName, symbol);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (isExpired(entry)) {
    memoryCache.delete(key);
    persist();
    return null;
  }
  return entry.value;
}

export function setCache(providerName: string, symbol: string, sample: PriceSample, ttlMs = DEFAULT_TTL_MS) {
  loadDiskCache();
  const key = cacheKey(providerName, symbol);
  memoryCache.set(key, {
    value: sample,
    expiresAt: Date.now() + ttlMs,
  });
  persist();
}

export class ProviderHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delays?: number[];
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const { retries = 3, delays = [1_000, 2_000, 4_000], shouldRetry } = options;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      const status = (error as ProviderHttpError).status;
      const retryable = typeof status === "number" && (status === 429 || status >= 500);
      const code = (error as NodeJS.ErrnoException).code;
      const networkRetryable = !!code && ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(code);
      const customDecision = shouldRetry ? shouldRetry(error) : false;
      const shouldAttempt = retryable || networkRetryable || customDecision;
      if (attempt > retries || !shouldAttempt) {
        throw error;
      }
      const delay = delays[Math.min(attempt - 1, delays.length - 1)];
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
