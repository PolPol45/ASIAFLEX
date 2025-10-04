export interface AssetFeedConfig {
  asset: string;
  symbol: string;
  providers: string[];
}

const CONFIGS: AssetFeedConfig[] = [
  { asset: "EURUSD", symbol: "EURUSD", providers: ["stooq", "exchange-rate"] },
  { asset: "USDJPY", symbol: "USDJPY", providers: ["stooq", "exchange-rate"] },
  { asset: "XAUUSD", symbol: "XAUUSD", providers: ["gold-price", "stooq"] },
  { asset: "AAXJ.US", symbol: "AAXJ.US", providers: ["stooq"] },
];

const BY_ASSET = new Map(CONFIGS.map((cfg) => [cfg.asset.toUpperCase(), cfg]));
const BY_SYMBOL = new Map(CONFIGS.map((cfg) => [cfg.symbol.toUpperCase(), cfg]));

export function listAssetFeeds(): AssetFeedConfig[] {
  return [...CONFIGS];
}

export function resolveAssetFeed(key: string): AssetFeedConfig | undefined {
  const upper = key.toUpperCase();
  return BY_ASSET.get(upper) ?? BY_SYMBOL.get(upper);
}
