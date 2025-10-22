import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, AddressLike, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../../common";
import type { BasketToken, BasketTokenInterface } from "../../../../artifacts/contracts/baskets/BasketToken";
type BasketTokenConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class BasketToken__factory extends ContractFactory {
  constructor(...args: BasketTokenConstructorParams);
  getDeployTransaction(
    name_: string,
    symbol_: string,
    manager: AddressLike,
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<ContractDeployTransaction>;
  deploy(
    name_: string,
    symbol_: string,
    manager: AddressLike,
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<
    BasketToken & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): BasketToken__factory;
  static readonly bytecode =
    "0x608060405234801561001057600080fd5b50604051610fbf380380610fbf83398101604081905261002f916101f7565b8282600361003d838261030b565b50600461004a828261030b565b5061005a9150600090508261008e565b506100857f241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b088261008e565b505050506103c9565b60008281526005602090815260408083206001600160a01b038516845290915281205460ff166101345760008381526005602090815260408083206001600160a01b03861684529091529020805460ff191660011790556100ec3390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a4506001610138565b5060005b92915050565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261016557600080fd5b81516001600160401b0381111561017e5761017e61013e565b604051601f8201601f19908116603f011681016001600160401b03811182821017156101ac576101ac61013e565b6040528181528382016020018510156101c457600080fd5b60005b828110156101e3576020818601810151838301820152016101c7565b506000918101602001919091529392505050565b60008060006060848603121561020c57600080fd5b83516001600160401b0381111561022257600080fd5b61022e86828701610154565b602086015190945090506001600160401b0381111561024c57600080fd5b61025886828701610154565b604086015190935090506001600160a01b038116811461027757600080fd5b809150509250925092565b600181811c9082168061029657607f821691505b6020821081036102b657634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561030657806000526020600020601f840160051c810160208510156102e35750805b601f840160051c820191505b8181101561030357600081556001016102ef565b50505b505050565b81516001600160401b038111156103245761032461013e565b610338816103328454610282565b846102bc565b6020601f82116001811461036c57600083156103545750848201515b600019600385901b1c1916600184901b178455610303565b600084815260208120601f198516915b8281101561039c578785015182556020948501946001909201910161037c565b50848210156103ba5786840151600019600387901b60f8161c191681555b50505050600190811b01905550565b610be7806103d86000396000f3fe608060405234801561001057600080fd5b50600436106101215760003560e01c806340c10f19116100ad578063a217fddf11610071578063a217fddf1461025f578063a9059cbb14610267578063d547741f1461027a578063dd62ed3e1461028d578063ec87621c146102c657600080fd5b806340c10f19146101f557806370a082311461020857806391d148541461023157806395d89b41146102445780639dc29fac1461024c57600080fd5b806323b872dd116100f457806323b872dd14610188578063248a9ca31461019b5780632f2ff15d146101be578063313ce567146101d357806336568abe146101e257600080fd5b806301ffc9a71461012657806306fdde031461014e578063095ea7b31461016357806318160ddd14610176575b600080fd5b6101396101343660046109ca565b6102ed565b60405190151581526020015b60405180910390f35b610156610324565b60405161014591906109fb565b610139610171366004610a65565b6103b6565b6002545b604051908152602001610145565b610139610196366004610a8f565b6103ce565b61017a6101a9366004610acc565b60009081526005602052604090206001015490565b6101d16101cc366004610ae5565b6103f2565b005b60405160128152602001610145565b6101d16101f0366004610ae5565b61041d565b6101d1610203366004610a65565b610455565b61017a610216366004610b11565b6001600160a01b031660009081526020819052604090205490565b61013961023f366004610ae5565b610489565b6101566104b4565b6101d161025a366004610a65565b6104c3565b61017a600081565b610139610275366004610a65565b6104f7565b6101d1610288366004610ae5565b610505565b61017a61029b366004610b2c565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b61017a7f241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b0881565b60006001600160e01b03198216637965db0b60e01b148061031e57506301ffc9a760e01b6001600160e01b03198316145b92915050565b60606003805461033390610b56565b80601f016020809104026020016040519081016040528092919081815260200182805461035f90610b56565b80156103ac5780601f10610381576101008083540402835291602001916103ac565b820191906000526020600020905b81548152906001019060200180831161038f57829003601f168201915b5050505050905090565b6000336103c481858561052a565b5060019392505050565b6000336103dc858285610537565b6103e78585856105b5565b506001949350505050565b60008281526005602052604090206001015461040d81610614565b6104178383610621565b50505050565b6001600160a01b03811633146104465760405163334bd91960e11b815260040160405180910390fd5b61045082826106b5565b505050565b7f241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b0861047f81610614565b6104508383610722565b60009182526005602090815260408084206001600160a01b0393909316845291905290205460ff1690565b60606004805461033390610b56565b7f241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b086104ed81610614565b610450838361075c565b6000336103c48185856105b5565b60008281526005602052604090206001015461052081610614565b61041783836106b5565b6104508383836001610792565b6001600160a01b0383811660009081526001602090815260408083209386168352929052205460001981101561041757818110156105a657604051637dc7a0d960e11b81526001600160a01b038416600482015260248101829052604481018390526064015b60405180910390fd5b61041784848484036000610792565b6001600160a01b0383166105df57604051634b637e8f60e11b81526000600482015260240161059d565b6001600160a01b0382166106095760405163ec442f0560e01b81526000600482015260240161059d565b610450838383610867565b61061e8133610991565b50565b600061062d8383610489565b6106ad5760008381526005602090815260408083206001600160a01b03861684529091529020805460ff191660011790556106653390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a450600161031e565b50600061031e565b60006106c18383610489565b156106ad5760008381526005602090815260408083206001600160a01b0386168085529252808320805460ff1916905551339286917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a450600161031e565b6001600160a01b03821661074c5760405163ec442f0560e01b81526000600482015260240161059d565b61075860008383610867565b5050565b6001600160a01b03821661078657604051634b637e8f60e11b81526000600482015260240161059d565b61075882600083610867565b6001600160a01b0384166107bc5760405163e602df0560e01b81526000600482015260240161059d565b6001600160a01b0383166107e657604051634a1406b160e11b81526000600482015260240161059d565b6001600160a01b038085166000908152600160209081526040808320938716835292905220829055801561041757826001600160a01b0316846001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161085991815260200190565b60405180910390a350505050565b6001600160a01b0383166108925780600260008282546108879190610b90565b909155506109049050565b6001600160a01b038316600090815260208190526040902054818110156108e55760405163391434e360e21b81526001600160a01b0385166004820152602481018290526044810183905260640161059d565b6001600160a01b03841660009081526020819052604090209082900390555b6001600160a01b0382166109205760028054829003905561093f565b6001600160a01b03821660009081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161098491815260200190565b60405180910390a3505050565b61099b8282610489565b6107585760405163e2517d3f60e01b81526001600160a01b03821660048201526024810183905260440161059d565b6000602082840312156109dc57600080fd5b81356001600160e01b0319811681146109f457600080fd5b9392505050565b602081526000825180602084015260005b81811015610a295760208186018101516040868401015201610a0c565b506000604082850101526040601f19601f83011684010191505092915050565b80356001600160a01b0381168114610a6057600080fd5b919050565b60008060408385031215610a7857600080fd5b610a8183610a49565b946020939093013593505050565b600080600060608486031215610aa457600080fd5b610aad84610a49565b9250610abb60208501610a49565b929592945050506040919091013590565b600060208284031215610ade57600080fd5b5035919050565b60008060408385031215610af857600080fd5b82359150610b0860208401610a49565b90509250929050565b600060208284031215610b2357600080fd5b6109f482610a49565b60008060408385031215610b3f57600080fd5b610b4883610a49565b9150610b0860208401610a49565b600181811c90821680610b6a57607f821691505b602082108103610b8a57634e487b7160e01b600052602260045260246000fd5b50919050565b8082018082111561031e57634e487b7160e01b600052601160045260246000fdfea2646970667358221220aa7030b2d6e759e3653493f57e107ad99c02848c942075694b88666fe52e433f64736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "string";
          readonly name: "name_";
          readonly type: "string";
        },
        {
          readonly internalType: "string";
          readonly name: "symbol_";
          readonly type: "string";
        },
        {
          readonly internalType: "address";
          readonly name: "manager";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "nonpayable";
      readonly type: "constructor";
    },
    {
      readonly inputs: readonly [];
      readonly name: "AccessControlBadConfirmation";
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
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "spender";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "allowance";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "needed";
          readonly type: "uint256";
        },
      ];
      readonly name: "ERC20InsufficientAllowance";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "balance";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "needed";
          readonly type: "uint256";
        },
      ];
      readonly name: "ERC20InsufficientBalance";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "approver";
          readonly type: "address";
        },
      ];
      readonly name: "ERC20InvalidApprover";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "receiver";
          readonly type: "address";
        },
      ];
      readonly name: "ERC20InvalidReceiver";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
      ];
      readonly name: "ERC20InvalidSender";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "spender";
          readonly type: "address";
        },
      ];
      readonly name: "ERC20InvalidSpender";
      readonly type: "error";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "owner";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "spender";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
      ];
      readonly name: "Approval";
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
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
      ];
      readonly name: "Transfer";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [];
      readonly name: "DEFAULT_ADMIN_ROLE";
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
      readonly inputs: readonly [];
      readonly name: "MANAGER_ROLE";
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
          readonly internalType: "address";
          readonly name: "owner";
          readonly type: "address";
        },
        {
          readonly internalType: "address";
          readonly name: "spender";
          readonly type: "address";
        },
      ];
      readonly name: "allowance";
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
          readonly name: "spender";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
      ];
      readonly name: "approve";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
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
      ];
      readonly name: "balanceOf";
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
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
      ];
      readonly name: "burn";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "decimals";
      readonly outputs: readonly [
        {
          readonly internalType: "uint8";
          readonly name: "";
          readonly type: "uint8";
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
      ];
      readonly name: "mint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "name";
      readonly outputs: readonly [
        {
          readonly internalType: "string";
          readonly name: "";
          readonly type: "string";
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
      readonly inputs: readonly [
        {
          readonly internalType: "bytes4";
          readonly name: "interfaceId";
          readonly type: "bytes4";
        },
      ];
      readonly name: "supportsInterface";
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
      readonly name: "symbol";
      readonly outputs: readonly [
        {
          readonly internalType: "string";
          readonly name: "";
          readonly type: "string";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "totalSupply";
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
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
      ];
      readonly name: "transfer";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "value";
          readonly type: "uint256";
        },
      ];
      readonly name: "transferFrom";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
  ];
  static createInterface(): BasketTokenInterface;
  static connect(address: string, runner?: ContractRunner | null): BasketToken;
}
export {};
//# sourceMappingURL=BasketToken__factory.d.ts.map
