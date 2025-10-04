import { parseUnits } from "ethers";

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

export function parsePrice(value: string, decimals?: number): { amount: bigint; decimals: number } {
  const normalizedDecimals = typeof decimals === "number" ? decimals : inferDecimals(value);
  return {
    amount: parseUnits(value, normalizedDecimals),
    decimals: normalizedDecimals,
  };
}

export function inferDecimals(raw: string): number {
  const [, fractional = ""] = raw.split(".");
  return Math.min(fractional.length, 18);
}

export function normalizeTo18(value: bigint, decimals: number): bigint {
  if (decimals === 18) return value;
  if (decimals > 18) {
    const diff = decimals - 18;
    return value / 10n ** BigInt(diff);
  }
  const diff = 18 - decimals;
  return value * 10n ** BigInt(diff);
}
