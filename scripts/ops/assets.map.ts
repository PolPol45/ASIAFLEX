export interface AssetFeedConfig {
  asset: string;
  symbol: string;
  providers: string[];
}

export const YAHOO_TICKERS: Record<string, string> = {
  EURUSD: "EURUSD=X",
  USDJPY: "USDJPY=X",
  GBPUSD: "GBPUSD=X",
  CHFUSD: "CHFUSD=X",
  SEKUSD: "SEKUSD=X",
  NOKUSD: "NOKUSD=X",
  CNYUSD: "CNYUSD=X",
  JPYUSD: "JPYUSD=X",
  INRUSD: "INRUSD=X",
  KRWUSD: "KRWUSD=X",
  SGDUSD: "SGDUSD=X",
  HKDUSD: "HKDUSD=X",
  GOLD: "GC=F",
  BUND: "EXH1.DE",
  BTP: "ITPS.MI",
  GILT: "IGLT.L",
  SWISSGOV: "0P00000CA7.SW",
  SCANDIGOV: "^OMXSPI",
  ASEANGOV: "AGOV",
  AAXJ: "AAXJ",
};

export const YAHOO_TICKER_ALIASES: Record<string, string> = {
  XAUUSD: "GOLD",
};

const CONFIGS: AssetFeedConfig[] = Object.entries(YAHOO_TICKERS).map(([asset]) => {
  const upperAsset = asset.toUpperCase();
  const symbol = upperAsset === "GOLD" ? "XAUUSD" : upperAsset;
  const providers = ["exchange-rate"];
  return { asset: upperAsset, symbol, providers };
});

const BY_ASSET = new Map(CONFIGS.map((cfg) => [cfg.asset.toUpperCase(), cfg]));
const BY_SYMBOL = new Map(CONFIGS.map((cfg) => [cfg.symbol.toUpperCase(), cfg]));

export function listAssetFeeds(): AssetFeedConfig[] {
  return [...CONFIGS];
}

export function resolveAssetFeed(key: string): AssetFeedConfig | undefined {
  const upper = key.toUpperCase();
  return BY_ASSET.get(upper) ?? BY_SYMBOL.get(upper);
}
