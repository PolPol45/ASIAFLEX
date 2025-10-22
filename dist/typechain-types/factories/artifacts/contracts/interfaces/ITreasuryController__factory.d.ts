import { type ContractRunner } from "ethers";
import type {
  ITreasuryController,
  ITreasuryControllerInterface,
} from "../../../../artifacts/contracts/interfaces/ITreasuryController";
export declare class ITreasuryController__factory {
  static readonly abi: readonly [
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
      readonly name: "InvalidReserveAttestation";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "hash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "InvalidSignature";
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
          readonly name: "expiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "RequestExpired";
      readonly type: "error";
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
      readonly name: "MintExecuted";
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
      readonly name: "RedeemExecuted";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldExpiration";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newExpiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "RequestExpirationUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "oldSigner";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "newSigner";
          readonly type: "address";
        },
      ];
      readonly name: "TreasurySignerUpdated";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
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
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "executeMint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
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
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "executeRedeem";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getRequestExpiration";
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
      readonly name: "getTreasurySigner";
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
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newExpiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "setRequestExpiration";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "newSigner";
          readonly type: "address";
        },
      ];
      readonly name: "setTreasurySigner";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
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
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "verifyMintSignature";
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
          readonly components: readonly [
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
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "verifyRedeemSignature";
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
  static createInterface(): ITreasuryControllerInterface;
  static connect(address: string, runner?: ContractRunner | null): ITreasuryController;
}
//# sourceMappingURL=ITreasuryController__factory.d.ts.map
