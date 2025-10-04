import { formatUnits, parseUnits } from "ethers";

export function toWei(amount: string | number | bigint, decimals = 18): bigint {
  if (typeof amount === "bigint") {
    return amount;
  }
  const value = typeof amount === "number" ? amount.toString() : amount;
  return parseUnits(value, decimals);
}

export function quoteShares(notionalWei: bigint, navWei: bigint, decimals = 18): bigint {
  if (navWei === 0n) {
    throw new Error("NAV must be greater than zero");
  }
  const scale = 10n ** BigInt(decimals);
  return (notionalWei * scale) / navWei;
}

export function formatWei(value: bigint, decimals = 18): string {
  return formatUnits(value, decimals);
}
