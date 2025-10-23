import { type ContractRunner } from "ethers";
import type {
  IAccessControlDefaultAdminRules,
  IAccessControlDefaultAdminRulesInterface,
} from "../../../../../../artifacts/@openzeppelin/contracts/access/extensions/IAccessControlDefaultAdminRules";
export declare class IAccessControlDefaultAdminRules__factory {
  static readonly abi: readonly [
    {
      readonly inputs: readonly [];
      readonly name: "AccessControlBadConfirmation";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint48";
          readonly name: "schedule";
          readonly type: "uint48";
        },
      ];
      readonly name: "AccessControlEnforcedDefaultAdminDelay";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "AccessControlEnforcedDefaultAdminRules";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "defaultAdmin";
          readonly type: "address";
        },
      ];
      readonly name: "AccessControlInvalidDefaultAdmin";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "neededRole";
          readonly type: "bytes32";
        },
      ];
      readonly name: "AccessControlUnauthorizedAccount";
      readonly type: "error";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [];
      readonly name: "DefaultAdminDelayChangeCanceled";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint48";
          readonly name: "newDelay";
          readonly type: "uint48";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint48";
          readonly name: "effectSchedule";
          readonly type: "uint48";
        },
      ];
      readonly name: "DefaultAdminDelayChangeScheduled";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [];
      readonly name: "DefaultAdminTransferCanceled";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "newAdmin";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint48";
          readonly name: "acceptSchedule";
          readonly type: "uint48";
        },
      ];
      readonly name: "DefaultAdminTransferScheduled";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "previousAdminRole";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "newAdminRole";
          readonly type: "bytes32";
        },
      ];
      readonly name: "RoleAdminChanged";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
      ];
      readonly name: "RoleGranted";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
      ];
      readonly name: "RoleRevoked";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [];
      readonly name: "acceptDefaultAdminTransfer";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "newAdmin";
          readonly type: "address";
        },
      ];
      readonly name: "beginDefaultAdminTransfer";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "cancelDefaultAdminTransfer";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint48";
          readonly name: "newDelay";
          readonly type: "uint48";
        },
      ];
      readonly name: "changeDefaultAdminDelay";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "defaultAdmin";
      readonly outputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "defaultAdminDelay";
      readonly outputs: readonly [
        {
          readonly internalType: "uint48";
          readonly name: "";
          readonly type: "uint48";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "defaultAdminDelayIncreaseWait";
      readonly outputs: readonly [
        {
          readonly internalType: "uint48";
          readonly name: "";
          readonly type: "uint48";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
      ];
      readonly name: "getRoleAdmin";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "grantRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "hasRole";
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
      readonly inputs: readonly [];
      readonly name: "pendingDefaultAdmin";
      readonly outputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "newAdmin";
          readonly type: "address";
        },
        {
          readonly internalType: "uint48";
          readonly name: "acceptSchedule";
          readonly type: "uint48";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "pendingDefaultAdminDelay";
      readonly outputs: readonly [
        {
          readonly internalType: "uint48";
          readonly name: "newDelay";
          readonly type: "uint48";
        },
        {
          readonly internalType: "uint48";
          readonly name: "effectSchedule";
          readonly type: "uint48";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "callerConfirmation";
          readonly type: "address";
        },
      ];
      readonly name: "renounceRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "revokeRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "rollbackDefaultAdminDelay";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): IAccessControlDefaultAdminRulesInterface;
  static connect(address: string, runner?: ContractRunner | null): IAccessControlDefaultAdminRules;
}
//# sourceMappingURL=IAccessControlDefaultAdminRules__factory.d.ts.map
