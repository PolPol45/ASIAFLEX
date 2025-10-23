import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../../common";
import type {
  ShortStrings,
  ShortStringsInterface,
} from "../../../../../artifacts/@openzeppelin/contracts/utils/ShortStrings";
type ShortStringsConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ShortStrings__factory extends ContractFactory {
  constructor(...args: ShortStringsConstructorParams);
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
    ShortStrings & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): ShortStrings__factory;
  static readonly bytecode =
    "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea264697066735822122042826238102a7b1f876f30f36256e282686190d753ae8e1aae86bed6187f12f264736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [];
      readonly name: "InvalidShortString";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "string";
          readonly name: "str";
          readonly type: "string";
        },
      ];
      readonly name: "StringTooLong";
      readonly type: "error";
    },
  ];
  static createInterface(): ShortStringsInterface;
  static connect(address: string, runner?: ContractRunner | null): ShortStrings;
}
export {};
//# sourceMappingURL=ShortStrings__factory.d.ts.map
