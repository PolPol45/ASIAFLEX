"use strict";
// Mapping of canonical asset symbols to Yahoo Finance tickers
// Extend or update as treasury onboards additional assets.
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAHOO_TICKER_ALIASES = exports.YAHOO_TICKERS = void 0;
exports.YAHOO_TICKERS = {
  XAUUSD: "GC=F", // Gold
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  EURUSD: "EURUSD=X",
  USDJPY: "JPY=X",
};
// Aliases map alternative human-friendly symbols to canonical keys above.
exports.YAHOO_TICKER_ALIASES = {
  GOLD: "XAUUSD",
  BITCOIN: "BTCUSD",
  ETHER: "ETHUSD",
};
