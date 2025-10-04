import { parseUnits } from "ethers";

export type Strategy = "fx" | "bond" | "mix";
export type Region = "eu" | "asia" | "euroasia";

export type AllocationDescriptor = {
  assetId: string;
  weightBps: number;
  isBond?: boolean;
  accrualBps?: number;
  feeds?: string[];
  mockPrice?: string;
  decimals?: number;
};

export type BasketDescriptor = {
  region: Region;
  strategy: Strategy;
  name: string;
  symbol: string;
  rebalanceIntervalDays: number;
  stalenessThresholdSeconds: number;
  allocations: AllocationDescriptor[];
};

export const BASKETS: BasketDescriptor[] = [
  {
    region: "eu",
    strategy: "fx",
    name: "EU Currency Basket",
    symbol: "EUFX",
    rebalanceIntervalDays: 90,
    stalenessThresholdSeconds: 3600,
    allocations: [
      { assetId: "EUR", weightBps: 6360, mockPrice: "1.08" },
      { assetId: "GBP", weightBps: 1360, mockPrice: "1.25" },
      { assetId: "CHF", weightBps: 910, mockPrice: "1.12" },
      { assetId: "SEK/NOK", weightBps: 450, mockPrice: "0.095" },
      { assetId: "GOLD", weightBps: 920, mockPrice: "18.80" },
    ],
  },
  {
    region: "eu",
    strategy: "bond",
    name: "EU Bond Basket",
    symbol: "EUBND",
    rebalanceIntervalDays: 90,
    stalenessThresholdSeconds: 14_400,
    allocations: [
      { assetId: "Bund", weightBps: 3636, mockPrice: "102.50", isBond: true, accrualBps: 20 },
      { assetId: "BTP", weightBps: 1818, mockPrice: "99.40", isBond: true, accrualBps: 35 },
      { assetId: "Gilt", weightBps: 1818, mockPrice: "98.75", isBond: true, accrualBps: 25 },
      { assetId: "SwissGov", weightBps: 909, mockPrice: "101.90", isBond: true, accrualBps: 15 },
      { assetId: "ScandiGov", weightBps: 909, mockPrice: "100.80", isBond: true, accrualBps: 18 },
      { assetId: "GOLD", weightBps: 910, mockPrice: "18.80" },
    ],
  },
  {
    region: "asia",
    strategy: "fx",
    name: "Asia Currency Basket",
    symbol: "ASFX",
    rebalanceIntervalDays: 90,
    stalenessThresholdSeconds: 3600,
    allocations: [
      { assetId: "CNY", weightBps: 3180, mockPrice: "0.14" },
      { assetId: "JPY", weightBps: 1820, mockPrice: "0.0091" },
      { assetId: "INR", weightBps: 1360, mockPrice: "0.012" },
      { assetId: "KRW", weightBps: 910, mockPrice: "0.00074" },
      { assetId: "SGD/HKD", weightBps: 910, mockPrice: "0.74" },
      { assetId: "ASEAN", weightBps: 910, mockPrice: "0.19" },
      { assetId: "GOLD", weightBps: 910, mockPrice: "18.80" },
    ],
  },
  {
    region: "asia",
    strategy: "bond",
    name: "Asia Bond Basket",
    symbol: "ASBND",
    rebalanceIntervalDays: 90,
    stalenessThresholdSeconds: 14_400,
    allocations: [
      { assetId: "CGB", weightBps: 2728, mockPrice: "102.50", isBond: true, accrualBps: 30 },
      { assetId: "JGB", weightBps: 2273, mockPrice: "98.20", isBond: true, accrualBps: 12 },
      { assetId: "G-Secs", weightBps: 1364, mockPrice: "101.10", isBond: true, accrualBps: 40 },
      { assetId: "KTB", weightBps: 909, mockPrice: "99.40", isBond: true, accrualBps: 25 },
      { assetId: "SGS/HK", weightBps: 909, mockPrice: "100.80", isBond: true, accrualBps: 20 },
      { assetId: "ASEANGov", weightBps: 909, mockPrice: "97.75", isBond: true, accrualBps: 28 },
      { assetId: "GOLD", weightBps: 908, mockPrice: "18.80" },
    ],
  },
  {
    region: "euroasia",
    strategy: "mix",
    name: "EuroAsia Mix Basket",
    symbol: "EAMIX",
    rebalanceIntervalDays: 90,
    stalenessThresholdSeconds: 7200,
    allocations: [
      { assetId: "EUR", weightBps: 3000, mockPrice: "1.08" },
      { assetId: "GBP", weightBps: 700, mockPrice: "1.25" },
      { assetId: "CHF", weightBps: 300, mockPrice: "1.12" },
      { assetId: "CNY", weightBps: 2000, mockPrice: "0.14" },
      { assetId: "JPY", weightBps: 1500, mockPrice: "0.0091" },
      { assetId: "INR", weightBps: 700, mockPrice: "0.012" },
      { assetId: "KRW", weightBps: 500, mockPrice: "0.00074" },
      { assetId: "SGD", weightBps: 300, mockPrice: "0.74" },
      { assetId: "GOLD", weightBps: 1000, mockPrice: "18.80" },
    ],
  },
];

export function regionToEnum(region: Region): number {
  switch (region) {
    case "eu":
      return 0;
    case "asia":
      return 1;
    case "euroasia":
      return 2;
  }
}

export function strategyToEnum(strategy: Strategy): number {
  switch (strategy) {
    case "fx":
      return 0;
    case "bond":
      return 1;
    case "mix":
      return 2;
  }
}

export function basketKey(descriptor: BasketDescriptor): string {
  return `${descriptor.region}:${descriptor.strategy}`;
}

export function defaultDecimals(allocation: AllocationDescriptor): number {
  return allocation.decimals ?? 8;
}

export function mockAnswer(allocation: AllocationDescriptor): bigint {
  const decimals = defaultDecimals(allocation);
  const price = allocation.mockPrice ?? "1";
  return parseUnits(price, decimals);
}
