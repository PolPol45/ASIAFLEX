"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toWei = toWei;
exports.quoteShares = quoteShares;
exports.formatWei = formatWei;
const ethers_1 = require("ethers");
function toWei(amount, decimals = 18) {
  if (typeof amount === "bigint") {
    return amount;
  }
  const value = typeof amount === "number" ? amount.toString() : amount;
  return (0, ethers_1.parseUnits)(value, decimals);
}
function quoteShares(notionalWei, navWei, decimals = 18) {
  if (navWei === 0n) {
    throw new Error("NAV must be greater than zero");
  }
  const scale = 10n ** BigInt(decimals);
  return (notionalWei * scale) / navWei;
}
function formatWei(value, decimals = 18) {
  return (0, ethers_1.formatUnits)(value, decimals);
}
