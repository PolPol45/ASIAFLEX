// Mapping of canonical asset symbols to Yahoo Finance tickers
// Extend or update as treasury onboards additional assets.

export const YAHOO_TICKERS: Record<string, string> = {
  XAUUSD: "GC=F", // Gold
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  CHFUSD: "CHFUSD=X",
  JPYUSD: "JPYUSD=X",
  CNYUSD: "CNYUSD=X",
  KRWUSD: "KRWUSD=X",
  SGDUSD: "SGDUSD=X",
};

// Aliases map alternative human-friendly symbols to canonical keys above.
export const YAHOO_TICKER_ALIASES: Record<string, string> = {
  GOLD: "XAUUSD",
  BITCOIN: "BTCUSD",
  ETHER: "ETHUSD",
};
