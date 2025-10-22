import type { BigNumberish, Contract } from "ethers";
export declare const REGION: {
  readonly EU: 0;
  readonly ASIA: 1;
  readonly EURO_ASIA: 2;
};
export type RegionKey = keyof typeof REGION;
export declare const STRATEGY: {
  readonly FX: 0;
  readonly BOND: 1;
  readonly MIX: 2;
};
export type StrategyKey = keyof typeof STRATEGY;
export type BasketKey = "EUFX" | "ASFX" | "EUBOND" | "ASBOND" | "EUAS";
export interface BasketDefinition {
  readonly key: BasketKey;
  readonly region: (typeof REGION)[RegionKey];
  readonly strategy: (typeof STRATEGY)[StrategyKey];
  readonly tokenEnv: string;
  readonly label: string;
}
export declare const BASKETS: BasketDefinition[];
export declare function getBasketDefinition(key: BasketKey): BasketDefinition;
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
export declare function requireEnv(name: string): string;
export declare function requireAddressEnv(name: string): string;
export declare function getBasketManager(address: string): Promise<Contract>;
export declare function getBasketId(manager: Contract, basket: BasketDefinition): Promise<bigint>;
export declare function encodeAssetId(symbol: string): string;
export declare function toWeightedAssets(configs: WeightedAssetInput[]): WeightedAssetStruct[];
export declare function sumWeights(configs: WeightedAssetInput[]): number;
//# sourceMappingURL=basket-helpers.d.ts.map
