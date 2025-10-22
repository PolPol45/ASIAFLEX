import { EventEmitter } from "node:events";
export interface PriceSample {
  symbol: string;
  value: bigint;
  decimals: number;
  ts: number;
  degraded?: boolean;
}
export interface Provider {
  name: string;
  get(symbol: string): Promise<PriceSample | null>;
}
export declare const PROVIDERS_PRIORITY: readonly ["Yahoo", "Polygon", "Cache"];
type ProviderSource = (typeof PROVIDERS_PRIORITY)[number];
export type PriceSource = "regular" | "close" | "cache" | "polygon";
export interface FetchPriceResult {
  value: number;
  ticker: string;
  source: PriceSource;
  stale: boolean;
  timestamp: number;
}
export type FetchOverride = {
  forceClose?: boolean;
  useLastKnown?: boolean;
};
export interface ProviderEvents {
  price: {
    symbol: string;
    ticker: string;
    value: number;
    source: PriceSource;
    stale: boolean;
    timestamp: number;
  };
  skip: {
    symbol: string;
    ticker?: string;
    reason: string;
  };
  error: {
    symbol: string;
    ticker?: string;
    error: string;
  };
  fallback: {
    symbol: string;
    provider: ProviderSource;
  };
}
declare class ProviderEventEmitter extends EventEmitter {
  on<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this;
  once<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this;
  off<K extends keyof ProviderEvents>(event: K, listener: (payload: ProviderEvents[K]) => void): this;
  emit<K extends keyof ProviderEvents>(event: K, payload: ProviderEvents[K]): boolean;
}
export declare const providerEvents: ProviderEventEmitter;
interface YahooPriceOptions {
  preferClose?: boolean;
}
interface YahooPriceResult {
  value: number;
  source: PriceSource;
  timestamp: number;
}
export declare function setFetchOverride(symbolKey: string, override?: FetchOverride | null): void;
export declare function clearFetchOverride(symbolKey: string): void;
export declare function clearAllFetchOverrides(): void;
export declare function getLastKnownPrice(symbolKey: string): {
  value: number;
  timestamp: number;
  source: PriceSource;
} | null;
export declare function fetchYahooPrice(ticker: string, options?: YahooPriceOptions): Promise<YahooPriceResult>;
export declare function fetchPolygonPrice(symbol: string): Promise<{
  value: number;
  timestamp: number;
}>;
export declare function fetchPrice(symbolKey: string): Promise<FetchPriceResult | null>;
export declare function parsePrice(
  value: string,
  decimals?: number
): {
  amount: bigint;
  decimals: number;
};
export declare function inferDecimals(raw: string): number;
export declare function normalizeTo18(value: bigint, decimals: number): bigint;
export {};
//# sourceMappingURL=Provider.d.ts.map
