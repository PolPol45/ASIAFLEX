import { ethers } from "hardhat";
import type { BigNumberish, Contract } from "ethers";

export const REGION = {
  EU: 0,
  ASIA: 1,
  EURO_ASIA: 2,
} as const;

export type RegionKey = keyof typeof REGION;

export const STRATEGY = {
  FX: 0,
  BOND: 1,
  MIX: 2,
} as const;

export type StrategyKey = keyof typeof STRATEGY;

export type BasketKey = "EUFX" | "ASFX" | "EUBOND" | "ASBOND" | "EUAS";

export interface BasketDefinition {
  readonly key: BasketKey;
  readonly region: (typeof REGION)[RegionKey];
  readonly strategy: (typeof STRATEGY)[StrategyKey];
  readonly tokenEnv: string;
  readonly label: string;
}

export const BASKETS: BasketDefinition[] = [
  { key: "EUFX", region: REGION.EU, strategy: STRATEGY.FX, tokenEnv: "TOK_EUFX", label: "EU × FX" },
  { key: "ASFX", region: REGION.ASIA, strategy: STRATEGY.FX, tokenEnv: "TOK_ASFX", label: "ASIA × FX" },
  { key: "EUBOND", region: REGION.EU, strategy: STRATEGY.BOND, tokenEnv: "TOK_EUBOND", label: "EU × BOND" },
  { key: "ASBOND", region: REGION.ASIA, strategy: STRATEGY.BOND, tokenEnv: "TOK_ASBOND", label: "ASIA × BOND" },
  {
    key: "EUAS",
    region: REGION.EURO_ASIA,
    strategy: STRATEGY.MIX,
    tokenEnv: "TOK_EUAS",
    label: "EURO_ASIA × MIX",
  },
];

export function getBasketDefinition(key: BasketKey): BasketDefinition {
  const basket = BASKETS.find((item) => item.key === key);
  if (!basket) {
    throw new Error(`Unknown basket key ${key}`);
  }
  return basket;
}

export interface WeightedAssetInput {
  readonly symbol: string;
  readonly weight: number;
  readonly isBond?: boolean;
  readonly accrualBps?: number;
}

export interface WeightedAssetStruct {
  readonly assetId: BigNumberish;
  readonly weightBps: BigNumberish;
  readonly isBond: boolean;
  readonly accrualBps: BigNumberish;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function requireAddressEnv(name: string): string {
  const value = requireEnv(name);
  // Reject common placeholder forms like `0x...` or empty placeholders
  const placeholderRe = /^0x\.{3,}$/i;
  if (placeholderRe.test(value)) {
    throw new Error(`Environment variable ${name} appears to be a placeholder (e.g. 0x...): ${value}`);
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`Environment variable ${name} is not a valid 0x-prefixed address: ${value}`);
  }
  return value;
}

export async function getBasketManager(address: string): Promise<Contract> {
  return ethers.getContractAt("BasketManager", address);
}

export async function getBasketId(manager: Contract, basket: BasketDefinition): Promise<bigint> {
  return manager.basketId(basket.region, basket.strategy);
}

export function encodeAssetId(symbol: string): string {
  return ethers.id(symbol.trim().toUpperCase());
}

export function toWeightedAssets(configs: WeightedAssetInput[]): WeightedAssetStruct[] {
  return configs.map((item) => ({
    assetId: encodeAssetId(item.symbol),
    weightBps: BigInt(item.weight),
    isBond: Boolean(item.isBond),
    accrualBps: BigInt(item.accrualBps ?? 0),
  }));
}

export function sumWeights(configs: WeightedAssetInput[]): number {
  return configs.reduce((acc, item) => acc + item.weight, 0);
}
