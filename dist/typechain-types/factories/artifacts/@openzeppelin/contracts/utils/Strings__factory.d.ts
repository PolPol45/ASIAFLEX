import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../../common";
import type { Strings, StringsInterface } from "../../../../../artifacts/@openzeppelin/contracts/utils/Strings";
type StringsConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class Strings__factory extends ContractFactory {
  constructor(...args: StringsConstructorParams);
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
    Strings & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): Strings__factory;
  static readonly bytecode =
    "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea264697066735822122044535826949d818540ed3030574eb9620aa30fd87807a48a75a0cd3875e38ff664736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "length";
          readonly type: "uint256";
        },
      ];
      readonly name: "StringsInsufficientHexLength";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "StringsInvalidAddressFormat";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "StringsInvalidChar";
      readonly type: "error";
    },
  ];
  static createInterface(): StringsInterface;
  static connect(address: string, runner?: ContractRunner | null): Strings;
}
export {};
//# sourceMappingURL=Strings__factory.d.ts.map
