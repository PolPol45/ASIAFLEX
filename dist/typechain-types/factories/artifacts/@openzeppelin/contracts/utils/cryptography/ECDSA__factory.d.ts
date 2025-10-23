import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../../../common";
import type {
  ECDSA,
  ECDSAInterface,
} from "../../../../../../artifacts/@openzeppelin/contracts/utils/cryptography/ECDSA";
type ECDSAConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ECDSA__factory extends ContractFactory {
  constructor(...args: ECDSAConstructorParams);
  getDeployTransaction(
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<ContractDeployTransaction>;
  deploy(
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<
    ECDSA & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): ECDSA__factory;
  static readonly bytecode =
    "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea264697066735822122042a6e36aa7173975d609154e9080043b8b6defa1928f2d52e13bdd89aa9bca5664736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [];
      readonly name: "ECDSAInvalidSignature";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "length";
          readonly type: "uint256";
        },
      ];
      readonly name: "ECDSAInvalidSignatureLength";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "s";
          readonly type: "bytes32";
        },
      ];
      readonly name: "ECDSAInvalidSignatureS";
      readonly type: "error";
    },
  ];
  static createInterface(): ECDSAInterface;
  static connect(address: string, runner?: ContractRunner | null): ECDSA;
}
export {};
//# sourceMappingURL=ECDSA__factory.d.ts.map
