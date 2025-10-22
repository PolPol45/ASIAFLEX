import { type ContractRunner } from "ethers";
import type {
  IMedianOracle,
  IMedianOracleInterface,
} from "../../../../../artifacts/contracts/baskets/interfaces/IMedianOracle";
export declare class IMedianOracle__factory {
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "assetId";
          readonly type: "bytes32";
        },
      ];
      readonly name: "getPrice";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "price";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "updatedAt";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint8";
          readonly name: "decimals";
          readonly type: "uint8";
        },
        {
          readonly internalType: "bool";
          readonly name: "degraded";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "assetId";
          readonly type: "bytes32";
        },
      ];
      readonly name: "getPriceData";
      readonly outputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "uint256";
              readonly name: "price";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "updatedAt";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint8";
              readonly name: "decimals";
              readonly type: "uint8";
            },
            {
              readonly internalType: "bool";
              readonly name: "degraded";
              readonly type: "bool";
            },
          ];
          readonly internalType: "struct IMedianOracle.PriceData";
          readonly name: "";
          readonly type: "tuple";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "assetId";
          readonly type: "bytes32";
        },
      ];
      readonly name: "hasPrice";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
  ];
  static createInterface(): IMedianOracleInterface;
  static connect(address: string, runner?: ContractRunner | null): IMedianOracle;
}
//# sourceMappingURL=IMedianOracle__factory.d.ts.map
