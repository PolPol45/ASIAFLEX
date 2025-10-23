import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { ProofOfReserve, ProofOfReserveInterface } from "../../../artifacts/contracts/ProofOfReserve";
type ProofOfReserveConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class ProofOfReserve__factory extends ContractFactory {
  constructor(...args: ProofOfReserveConstructorParams);
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
    ProofOfReserve & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): ProofOfReserve__factory;
  static readonly bytecode =
    "0x6080604052348015600f57600080fd5b50600180546001600160a01b03191633179055610154806100316000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c80634256dbe31461005157806359bf5d3914610066578063664692f21461007d5780638da5cb5b14610086575b600080fd5b61006461005f366004610105565b6100b1565b005b6000545b6040519081526020015b60405180910390f35b61006a60005481565b600154610099906001600160a01b031681565b6040516001600160a01b039091168152602001610074565b6001546001600160a01b031633146101005760405162461bcd60e51b815260206004820152600e60248201526d139bdd08185d5d1a1bdc9a5e995960921b604482015260640160405180910390fd5b600055565b60006020828403121561011757600080fd5b503591905056fea26469706673582212206c41813c0f057d0c207151b6079d5e9ac0814e2ef3d83751c736b94904f6be6c64736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "constructor";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getReserve";
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
      readonly name: "owner";
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
      readonly name: "reserveUSD";
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
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
      ];
      readonly name: "setReserve";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): ProofOfReserveInterface;
  static connect(address: string, runner?: ContractRunner | null): ProofOfReserve;
}
export {};
//# sourceMappingURL=ProofOfReserve__factory.d.ts.map
