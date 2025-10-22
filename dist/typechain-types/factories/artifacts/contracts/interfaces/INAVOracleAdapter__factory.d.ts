import { type ContractRunner } from "ethers";
import type {
  INAVOracleAdapter,
  INAVOracleAdapterInterface,
} from "../../../../artifacts/contracts/interfaces/INAVOracleAdapter";
export declare class INAVOracleAdapter__factory {
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "currentNav";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "newNav";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "deviation";
          readonly type: "uint256";
        },
      ];
      readonly name: "DeviationTooHigh";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "timestamp";
          readonly type: "uint256";
        },
      ];
      readonly name: "InvalidTimestamp";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "timestamp";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "threshold";
          readonly type: "uint256";
        },
      ];
      readonly name: "StaleData";
      readonly type: "error";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldThreshold";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newThreshold";
          readonly type: "uint256";
        },
      ];
      readonly name: "DeviationThresholdUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "uint256";
          readonly name: "timestamp";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldNav";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newNav";
          readonly type: "uint256";
        },
      ];
      readonly name: "NAVUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldThreshold";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newThreshold";
          readonly type: "uint256";
        },
      ];
      readonly name: "StalenessThresholdUpdated";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getDeviationThreshold";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getNAV";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "nav";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "timestamp";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getStalenessThreshold";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "isStale";
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
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newNav";
          readonly type: "uint256";
        },
      ];
      readonly name: "isValidUpdate";
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
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "threshold";
          readonly type: "uint256";
        },
      ];
      readonly name: "setDeviationThreshold";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "threshold";
          readonly type: "uint256";
        },
      ];
      readonly name: "setStalenessThreshold";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newNav";
          readonly type: "uint256";
        },
      ];
      readonly name: "updateNAV";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): INAVOracleAdapterInterface;
  static connect(address: string, runner?: ContractRunner | null): INAVOracleAdapter;
}
//# sourceMappingURL=INAVOracleAdapter__factory.d.ts.map
