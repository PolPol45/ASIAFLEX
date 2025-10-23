import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, BigNumberish, ContractDeployTransaction, ContractRunner } from "ethers";
import type { PayableOverrides } from "../../../common";
import type { Lock, LockInterface } from "../../../artifacts/contracts/Lock";
type LockConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class Lock__factory extends ContractFactory {
  constructor(...args: LockConstructorParams);
  getDeployTransaction(
    _unlockTime: BigNumberish,
    overrides?: PayableOverrides & {
      from?: string;
    }
  ): Promise<ContractDeployTransaction>;
  deploy(
    _unlockTime: BigNumberish,
    overrides?: PayableOverrides & {
      from?: string;
    }
  ): Promise<
    Lock & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): Lock__factory;
  static readonly bytecode =
    "0x60806040526040516102a03803806102a08339810160408190526020916097565b804210607e5760405162461bcd60e51b815260206004820152602360248201527f556e6c6f636b2074696d652073686f756c6420626520696e207468652066757460448201526275726560e81b606482015260840160405180910390fd5b600055600180546001600160a01b0319163317905560af565b60006020828403121560a857600080fd5b5051919050565b6101e2806100be6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063251c1aa3146100465780633ccfd60b146100625780638da5cb5b1461006c575b600080fd5b61004f60005481565b6040519081526020015b60405180910390f35b61006a610097565b005b60015461007f906001600160a01b031681565b6040516001600160a01b039091168152602001610059565b6000544210156100e75760405162461bcd60e51b8152602060048201526016602482015275165bdd4818d85b89dd081dda5d1a191c985dc81e595d60521b60448201526064015b60405180910390fd5b6001546001600160a01b031633146101385760405162461bcd60e51b81526020600482015260146024820152732cb7ba9030b932b713ba103a34329037bbb732b960611b60448201526064016100de565b604080514781524260208201527fbf2ed60bd5b5965d685680c01195c9514e4382e28e3a5a2d2d5244bf59411b93910160405180910390a16001546040516001600160a01b03909116904780156108fc02916000818181858888f193505050501580156101a9573d6000803e3d6000fd5b5056fea2646970667358221220544782bbf66275962f71126acf49b48c7bf9cdc3df9571ba17bab51d37b71a1664736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "_unlockTime";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "payable";
      readonly type: "constructor";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "when";
          readonly type: "uint256";
        },
      ];
      readonly name: "Withdrawal";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [];
      readonly name: "owner";
      readonly outputs: readonly [
        {
          readonly internalType: "address payable";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "unlockTime";
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
      readonly name: "withdraw";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): LockInterface;
  static connect(address: string, runner?: ContractRunner | null): Lock;
}
export {};
//# sourceMappingURL=Lock__factory.d.ts.map
