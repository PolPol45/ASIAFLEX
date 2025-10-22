import { type ContractRunner } from "ethers";
import type {
  IAsiaFlexToken,
  IAsiaFlexTokenInterface,
} from "../../../../artifacts/contracts/interfaces/IAsiaFlexToken";
export declare class IAsiaFlexToken__factory {
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "AccountBlacklisted";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "requested";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "remaining";
          readonly type: "uint256";
        },
      ];
      readonly name: "DailyCapsExceeded";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "requested";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "available";
          readonly type: "uint256";
        },
      ];
      readonly name: "InsufficientReserves";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "provided";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "expected";
          readonly type: "bytes32";
        },
      ];
      readonly name: "InvalidAttestation";
      readonly type: "error";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "bool";
          readonly name: "isBlacklisted";
          readonly type: "bool";
        },
      ];
      readonly name: "BlacklistUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "Burn";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldCap";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newCap";
          readonly type: "uint256";
        },
      ];
      readonly name: "DailyCapUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldCap";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newCap";
          readonly type: "uint256";
        },
      ];
      readonly name: "DailyNetInflowCapUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "Mint";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "burn";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getRemainingDailyMint";
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
      readonly name: "getRemainingDailyNetInflows";
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
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "isBlacklisted";
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
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "mint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly internalType: "bool";
          readonly name: "isBlacklisted";
          readonly type: "bool";
        },
      ];
      readonly name: "setBlacklisted";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newCap";
          readonly type: "uint256";
        },
      ];
      readonly name: "setMaxDailyMint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newCap";
          readonly type: "uint256";
        },
      ];
      readonly name: "setMaxDailyNetInflows";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): IAsiaFlexTokenInterface;
  static connect(address: string, runner?: ContractRunner | null): IAsiaFlexToken;
}
//# sourceMappingURL=IAsiaFlexToken__factory.d.ts.map
