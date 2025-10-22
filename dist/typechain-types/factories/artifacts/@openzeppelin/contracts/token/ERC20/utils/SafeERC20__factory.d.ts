import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../../../../common";
import type {
  SafeERC20,
  SafeERC20Interface,
} from "../../../../../../../artifacts/@openzeppelin/contracts/token/ERC20/utils/SafeERC20";
type SafeERC20ConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class SafeERC20__factory extends ContractFactory {
  constructor(...args: SafeERC20ConstructorParams);
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
    SafeERC20 & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): SafeERC20__factory;
  static readonly bytecode =
    "0x60566037600b82828239805160001a607314602a57634e487b7160e01b600052600060045260246000fd5b30600052607381538281f3fe73000000000000000000000000000000000000000030146080604052600080fdfea2646970667358221220b6e5a7f4d39f7647ac2337754fc64810db0149e18042ab2ed9747eee2a2ba7e364736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "spender";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "currentAllowance";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "requestedDecrease";
          readonly type: "uint256";
        },
      ];
      readonly name: "SafeERC20FailedDecreaseAllowance";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "token";
          readonly type: "address";
        },
      ];
      readonly name: "SafeERC20FailedOperation";
      readonly type: "error";
    },
  ];
  static createInterface(): SafeERC20Interface;
  static connect(address: string, runner?: ContractRunner | null): SafeERC20;
}
export {};
//# sourceMappingURL=SafeERC20__factory.d.ts.map
