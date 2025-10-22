import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "../../common";
export interface AsiaFlexTokenInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "BLACKLIST_MANAGER_ROLE"
      | "CAPS_MANAGER_ROLE"
      | "DEFAULT_ADMIN_ROLE"
      | "DOMAIN_SEPARATOR"
      | "PAUSER_ROLE"
      | "TREASURY_ROLE"
      | "allowance"
      | "approve"
      | "balanceOf"
      | "burn"
      | "burnFrom"
      | "dailyMintAmount"
      | "dailyNetInflowAmount"
      | "decimals"
      | "eip712Domain"
      | "getPrice"
      | "getRemainingDailyMint"
      | "getRemainingDailyNetInflows"
      | "getRoleAdmin"
      | "grantRole"
      | "hasRole"
      | "isBlacklisted"
      | "lastResetTimestamp"
      | "maxDailyMint"
      | "maxDailyNetInflows"
      | "mint(address,uint256,bytes32)"
      | "mint(address,uint256)"
      | "mintByUSD"
      | "name"
      | "nonces"
      | "pause"
      | "paused"
      | "pendingRedeems"
      | "permit"
      | "processRedeem"
      | "redeemBlockQueue"
      | "redeemRequest"
      | "renounceRole"
      | "reserves"
      | "revokeRole"
      | "setBlacklisted"
      | "setMaxDailyMint"
      | "setMaxDailyNetInflows"
      | "setPrice"
      | "setReserves"
      | "setSupplyCap"
      | "supplyCap"
      | "supportsInterface"
      | "symbol"
      | "totalSupply"
      | "transfer"
      | "transferFrom"
      | "unpause"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic:
      | "Approval"
      | "BlacklistUpdated"
      | "Burn"
      | "DailyCapUpdated"
      | "DailyNetInflowCapUpdated"
      | "EIP712DomainChanged"
      | "Mint"
      | "Paused"
      | "RedeemProcessed"
      | "RedeemRequested"
      | "RoleAdminChanged"
      | "RoleGranted"
      | "RoleRevoked"
      | "Transfer"
      | "Unpaused"
  ): EventFragment;
  encodeFunctionData(functionFragment: "BLACKLIST_MANAGER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "CAPS_MANAGER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "DEFAULT_ADMIN_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "DOMAIN_SEPARATOR", values?: undefined): string;
  encodeFunctionData(functionFragment: "PAUSER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "TREASURY_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "allowance", values: [AddressLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "approve", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "balanceOf", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "burn", values: [AddressLike, BigNumberish, BytesLike]): string;
  encodeFunctionData(functionFragment: "burnFrom", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "dailyMintAmount", values?: undefined): string;
  encodeFunctionData(functionFragment: "dailyNetInflowAmount", values?: undefined): string;
  encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
  encodeFunctionData(functionFragment: "eip712Domain", values?: undefined): string;
  encodeFunctionData(functionFragment: "getPrice", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRemainingDailyMint", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRemainingDailyNetInflows", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRoleAdmin", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "grantRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "hasRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "isBlacklisted", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "lastResetTimestamp", values?: undefined): string;
  encodeFunctionData(functionFragment: "maxDailyMint", values?: undefined): string;
  encodeFunctionData(functionFragment: "maxDailyNetInflows", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "mint(address,uint256,bytes32)",
    values: [AddressLike, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "mint(address,uint256)", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "mintByUSD", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(functionFragment: "nonces", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "pause", values?: undefined): string;
  encodeFunctionData(functionFragment: "paused", values?: undefined): string;
  encodeFunctionData(functionFragment: "pendingRedeems", values: [AddressLike]): string;
  encodeFunctionData(
    functionFragment: "permit",
    values: [AddressLike, AddressLike, BigNumberish, BigNumberish, BigNumberish, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "processRedeem", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "redeemBlockQueue", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "redeemRequest", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "renounceRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "reserves", values?: undefined): string;
  encodeFunctionData(functionFragment: "revokeRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "setBlacklisted", values: [AddressLike, boolean]): string;
  encodeFunctionData(functionFragment: "setMaxDailyMint", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setMaxDailyNetInflows", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setPrice", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setReserves", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setSupplyCap", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "supplyCap", values?: undefined): string;
  encodeFunctionData(functionFragment: "supportsInterface", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
  encodeFunctionData(functionFragment: "totalSupply", values?: undefined): string;
  encodeFunctionData(functionFragment: "transfer", values: [AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "transferFrom", values: [AddressLike, AddressLike, BigNumberish]): string;
  encodeFunctionData(functionFragment: "unpause", values?: undefined): string;
  decodeFunctionResult(functionFragment: "BLACKLIST_MANAGER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "CAPS_MANAGER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "DEFAULT_ADMIN_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "DOMAIN_SEPARATOR", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "PAUSER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "TREASURY_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "burn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "burnFrom", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "dailyMintAmount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "dailyNetInflowAmount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "eip712Domain", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPrice", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRemainingDailyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRemainingDailyNetInflows", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRoleAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "grantRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isBlacklisted", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "lastResetTimestamp", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "maxDailyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "maxDailyNetInflows", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint(address,uint256,bytes32)", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint(address,uint256)", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mintByUSD", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "nonces", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "paused", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pendingRedeems", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "permit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "processRedeem", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "redeemBlockQueue", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "redeemRequest", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "renounceRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "reserves", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "revokeRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setBlacklisted", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setMaxDailyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setMaxDailyNetInflows", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setPrice", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setReserves", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setSupplyCap", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "supplyCap", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "supportsInterface", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "totalSupply", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "transferFrom", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "unpause", data: BytesLike): Result;
}
export declare namespace ApprovalEvent {
  type InputTuple = [owner: AddressLike, spender: AddressLike, value: BigNumberish];
  type OutputTuple = [owner: string, spender: string, value: bigint];
  interface OutputObject {
    owner: string;
    spender: string;
    value: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace BlacklistUpdatedEvent {
  type InputTuple = [account: AddressLike, isBlacklisted: boolean];
  type OutputTuple = [account: string, isBlacklisted: boolean];
  interface OutputObject {
    account: string;
    isBlacklisted: boolean;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace BurnEvent {
  type InputTuple = [from: AddressLike, amount: BigNumberish, attestationHash: BytesLike];
  type OutputTuple = [from: string, amount: bigint, attestationHash: string];
  interface OutputObject {
    from: string;
    amount: bigint;
    attestationHash: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DailyCapUpdatedEvent {
  type InputTuple = [oldCap: BigNumberish, newCap: BigNumberish];
  type OutputTuple = [oldCap: bigint, newCap: bigint];
  interface OutputObject {
    oldCap: bigint;
    newCap: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DailyNetInflowCapUpdatedEvent {
  type InputTuple = [oldCap: BigNumberish, newCap: BigNumberish];
  type OutputTuple = [oldCap: bigint, newCap: bigint];
  interface OutputObject {
    oldCap: bigint;
    newCap: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace EIP712DomainChangedEvent {
  type InputTuple = [];
  type OutputTuple = [];
  interface OutputObject {}
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace MintEvent {
  type InputTuple = [to: AddressLike, amount: BigNumberish, attestationHash: BytesLike];
  type OutputTuple = [to: string, amount: bigint, attestationHash: string];
  interface OutputObject {
    to: string;
    amount: bigint;
    attestationHash: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace PausedEvent {
  type InputTuple = [account: AddressLike];
  type OutputTuple = [account: string];
  interface OutputObject {
    account: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RedeemProcessedEvent {
  type InputTuple = [user: AddressLike, amount: BigNumberish];
  type OutputTuple = [user: string, amount: bigint];
  interface OutputObject {
    user: string;
    amount: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RedeemRequestedEvent {
  type InputTuple = [user: AddressLike, amount: BigNumberish];
  type OutputTuple = [user: string, amount: bigint];
  interface OutputObject {
    user: string;
    amount: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RoleAdminChangedEvent {
  type InputTuple = [role: BytesLike, previousAdminRole: BytesLike, newAdminRole: BytesLike];
  type OutputTuple = [role: string, previousAdminRole: string, newAdminRole: string];
  interface OutputObject {
    role: string;
    previousAdminRole: string;
    newAdminRole: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RoleGrantedEvent {
  type InputTuple = [role: BytesLike, account: AddressLike, sender: AddressLike];
  type OutputTuple = [role: string, account: string, sender: string];
  interface OutputObject {
    role: string;
    account: string;
    sender: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RoleRevokedEvent {
  type InputTuple = [role: BytesLike, account: AddressLike, sender: AddressLike];
  type OutputTuple = [role: string, account: string, sender: string];
  interface OutputObject {
    role: string;
    account: string;
    sender: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace TransferEvent {
  type InputTuple = [from: AddressLike, to: AddressLike, value: BigNumberish];
  type OutputTuple = [from: string, to: string, value: bigint];
  interface OutputObject {
    from: string;
    to: string;
    value: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace UnpausedEvent {
  type InputTuple = [account: AddressLike];
  type OutputTuple = [account: string];
  interface OutputObject {
    account: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export interface AsiaFlexToken extends BaseContract {
  connect(runner?: ContractRunner | null): AsiaFlexToken;
  waitForDeployment(): Promise<this>;
  interface: AsiaFlexTokenInterface;
  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;
  BLACKLIST_MANAGER_ROLE: TypedContractMethod<[], [string], "view">;
  CAPS_MANAGER_ROLE: TypedContractMethod<[], [string], "view">;
  DEFAULT_ADMIN_ROLE: TypedContractMethod<[], [string], "view">;
  DOMAIN_SEPARATOR: TypedContractMethod<[], [string], "view">;
  PAUSER_ROLE: TypedContractMethod<[], [string], "view">;
  TREASURY_ROLE: TypedContractMethod<[], [string], "view">;
  allowance: TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;
  approve: TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  balanceOf: TypedContractMethod<[account: AddressLike], [bigint], "view">;
  burn: TypedContractMethod<
    [from: AddressLike, amount: BigNumberish, attestationHash: BytesLike],
    [void],
    "nonpayable"
  >;
  burnFrom: TypedContractMethod<[user: AddressLike, amount: BigNumberish], [void], "nonpayable">;
  dailyMintAmount: TypedContractMethod<[], [bigint], "view">;
  dailyNetInflowAmount: TypedContractMethod<[], [bigint], "view">;
  decimals: TypedContractMethod<[], [bigint], "view">;
  eip712Domain: TypedContractMethod<
    [],
    [
      [string, string, string, bigint, string, string, bigint[]] & {
        fields: string;
        name: string;
        version: string;
        chainId: bigint;
        verifyingContract: string;
        salt: string;
        extensions: bigint[];
      },
    ],
    "view"
  >;
  getPrice: TypedContractMethod<[], [bigint], "view">;
  getRemainingDailyMint: TypedContractMethod<[], [bigint], "view">;
  getRemainingDailyNetInflows: TypedContractMethod<[], [bigint], "view">;
  getRoleAdmin: TypedContractMethod<[role: BytesLike], [string], "view">;
  grantRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  hasRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  isBlacklisted: TypedContractMethod<[account: AddressLike], [boolean], "view">;
  lastResetTimestamp: TypedContractMethod<[], [bigint], "view">;
  maxDailyMint: TypedContractMethod<[], [bigint], "view">;
  maxDailyNetInflows: TypedContractMethod<[], [bigint], "view">;
  "mint(address,uint256,bytes32)": TypedContractMethod<
    [to: AddressLike, amount: BigNumberish, attestationHash: BytesLike],
    [void],
    "nonpayable"
  >;
  "mint(address,uint256)": TypedContractMethod<[to: AddressLike, amount: BigNumberish], [void], "nonpayable">;
  mintByUSD: TypedContractMethod<[to: AddressLike, usdAmount: BigNumberish], [void], "nonpayable">;
  name: TypedContractMethod<[], [string], "view">;
  nonces: TypedContractMethod<[owner: AddressLike], [bigint], "view">;
  pause: TypedContractMethod<[], [void], "nonpayable">;
  paused: TypedContractMethod<[], [boolean], "view">;
  pendingRedeems: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  permit: TypedContractMethod<
    [
      owner: AddressLike,
      spender: AddressLike,
      value: BigNumberish,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
    ],
    [void],
    "nonpayable"
  >;
  processRedeem: TypedContractMethod<[user: AddressLike, arg1: BigNumberish], [void], "nonpayable">;
  redeemBlockQueue: TypedContractMethod<[arg0: AddressLike, arg1: BigNumberish], [bigint], "view">;
  redeemRequest: TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  renounceRole: TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  reserves: TypedContractMethod<[], [bigint], "view">;
  revokeRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  setBlacklisted: TypedContractMethod<[account: AddressLike, flag: boolean], [void], "nonpayable">;
  setMaxDailyMint: TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  setMaxDailyNetInflows: TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  setPrice: TypedContractMethod<[newPrice: BigNumberish], [void], "nonpayable">;
  setReserves: TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  setSupplyCap: TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  supplyCap: TypedContractMethod<[], [bigint], "view">;
  supportsInterface: TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  symbol: TypedContractMethod<[], [string], "view">;
  totalSupply: TypedContractMethod<[], [bigint], "view">;
  transfer: TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  transferFrom: TypedContractMethod<[from: AddressLike, to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  unpause: TypedContractMethod<[], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "BLACKLIST_MANAGER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "CAPS_MANAGER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "DEFAULT_ADMIN_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "DOMAIN_SEPARATOR"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "PAUSER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "TREASURY_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "allowance"
  ): TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "approve"
  ): TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  getFunction(nameOrSignature: "balanceOf"): TypedContractMethod<[account: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "burn"
  ): TypedContractMethod<[from: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "burnFrom"
  ): TypedContractMethod<[user: AddressLike, amount: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "dailyMintAmount"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "dailyNetInflowAmount"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "decimals"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "eip712Domain"): TypedContractMethod<
    [],
    [
      [string, string, string, bigint, string, string, bigint[]] & {
        fields: string;
        name: string;
        version: string;
        chainId: bigint;
        verifyingContract: string;
        salt: string;
        extensions: bigint[];
      },
    ],
    "view"
  >;
  getFunction(nameOrSignature: "getPrice"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getRemainingDailyMint"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getRemainingDailyNetInflows"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getRoleAdmin"): TypedContractMethod<[role: BytesLike], [string], "view">;
  getFunction(
    nameOrSignature: "grantRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "hasRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  getFunction(nameOrSignature: "isBlacklisted"): TypedContractMethod<[account: AddressLike], [boolean], "view">;
  getFunction(nameOrSignature: "lastResetTimestamp"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "maxDailyMint"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "maxDailyNetInflows"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "mint(address,uint256,bytes32)"
  ): TypedContractMethod<[to: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "mint(address,uint256)"
  ): TypedContractMethod<[to: AddressLike, amount: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "mintByUSD"
  ): TypedContractMethod<[to: AddressLike, usdAmount: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "name"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "nonces"): TypedContractMethod<[owner: AddressLike], [bigint], "view">;
  getFunction(nameOrSignature: "pause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "paused"): TypedContractMethod<[], [boolean], "view">;
  getFunction(nameOrSignature: "pendingRedeems"): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "permit"
  ): TypedContractMethod<
    [
      owner: AddressLike,
      spender: AddressLike,
      value: BigNumberish,
      deadline: BigNumberish,
      v: BigNumberish,
      r: BytesLike,
      s: BytesLike,
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "processRedeem"
  ): TypedContractMethod<[user: AddressLike, arg1: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "redeemBlockQueue"
  ): TypedContractMethod<[arg0: AddressLike, arg1: BigNumberish], [bigint], "view">;
  getFunction(nameOrSignature: "redeemRequest"): TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "renounceRole"
  ): TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "reserves"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "revokeRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setBlacklisted"
  ): TypedContractMethod<[account: AddressLike, flag: boolean], [void], "nonpayable">;
  getFunction(nameOrSignature: "setMaxDailyMint"): TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setMaxDailyNetInflows"
  ): TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "setPrice"): TypedContractMethod<[newPrice: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "setReserves"): TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "setSupplyCap"): TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "supplyCap"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "supportsInterface"): TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "symbol"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "totalSupply"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "transfer"
  ): TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  getFunction(
    nameOrSignature: "transferFrom"
  ): TypedContractMethod<[from: AddressLike, to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
  getFunction(nameOrSignature: "unpause"): TypedContractMethod<[], [void], "nonpayable">;
  getEvent(
    key: "Approval"
  ): TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;
  getEvent(
    key: "BlacklistUpdated"
  ): TypedContractEvent<
    BlacklistUpdatedEvent.InputTuple,
    BlacklistUpdatedEvent.OutputTuple,
    BlacklistUpdatedEvent.OutputObject
  >;
  getEvent(key: "Burn"): TypedContractEvent<BurnEvent.InputTuple, BurnEvent.OutputTuple, BurnEvent.OutputObject>;
  getEvent(
    key: "DailyCapUpdated"
  ): TypedContractEvent<
    DailyCapUpdatedEvent.InputTuple,
    DailyCapUpdatedEvent.OutputTuple,
    DailyCapUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "DailyNetInflowCapUpdated"
  ): TypedContractEvent<
    DailyNetInflowCapUpdatedEvent.InputTuple,
    DailyNetInflowCapUpdatedEvent.OutputTuple,
    DailyNetInflowCapUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "EIP712DomainChanged"
  ): TypedContractEvent<
    EIP712DomainChangedEvent.InputTuple,
    EIP712DomainChangedEvent.OutputTuple,
    EIP712DomainChangedEvent.OutputObject
  >;
  getEvent(key: "Mint"): TypedContractEvent<MintEvent.InputTuple, MintEvent.OutputTuple, MintEvent.OutputObject>;
  getEvent(
    key: "Paused"
  ): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
  getEvent(
    key: "RedeemProcessed"
  ): TypedContractEvent<
    RedeemProcessedEvent.InputTuple,
    RedeemProcessedEvent.OutputTuple,
    RedeemProcessedEvent.OutputObject
  >;
  getEvent(
    key: "RedeemRequested"
  ): TypedContractEvent<
    RedeemRequestedEvent.InputTuple,
    RedeemRequestedEvent.OutputTuple,
    RedeemRequestedEvent.OutputObject
  >;
  getEvent(
    key: "RoleAdminChanged"
  ): TypedContractEvent<
    RoleAdminChangedEvent.InputTuple,
    RoleAdminChangedEvent.OutputTuple,
    RoleAdminChangedEvent.OutputObject
  >;
  getEvent(
    key: "RoleGranted"
  ): TypedContractEvent<RoleGrantedEvent.InputTuple, RoleGrantedEvent.OutputTuple, RoleGrantedEvent.OutputObject>;
  getEvent(
    key: "RoleRevoked"
  ): TypedContractEvent<RoleRevokedEvent.InputTuple, RoleRevokedEvent.OutputTuple, RoleRevokedEvent.OutputObject>;
  getEvent(
    key: "Transfer"
  ): TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;
  getEvent(
    key: "Unpaused"
  ): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  filters: {
    "Approval(address,address,uint256)": TypedContractEvent<
      ApprovalEvent.InputTuple,
      ApprovalEvent.OutputTuple,
      ApprovalEvent.OutputObject
    >;
    Approval: TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;
    "BlacklistUpdated(address,bool)": TypedContractEvent<
      BlacklistUpdatedEvent.InputTuple,
      BlacklistUpdatedEvent.OutputTuple,
      BlacklistUpdatedEvent.OutputObject
    >;
    BlacklistUpdated: TypedContractEvent<
      BlacklistUpdatedEvent.InputTuple,
      BlacklistUpdatedEvent.OutputTuple,
      BlacklistUpdatedEvent.OutputObject
    >;
    "Burn(address,uint256,bytes32)": TypedContractEvent<
      BurnEvent.InputTuple,
      BurnEvent.OutputTuple,
      BurnEvent.OutputObject
    >;
    Burn: TypedContractEvent<BurnEvent.InputTuple, BurnEvent.OutputTuple, BurnEvent.OutputObject>;
    "DailyCapUpdated(uint256,uint256)": TypedContractEvent<
      DailyCapUpdatedEvent.InputTuple,
      DailyCapUpdatedEvent.OutputTuple,
      DailyCapUpdatedEvent.OutputObject
    >;
    DailyCapUpdated: TypedContractEvent<
      DailyCapUpdatedEvent.InputTuple,
      DailyCapUpdatedEvent.OutputTuple,
      DailyCapUpdatedEvent.OutputObject
    >;
    "DailyNetInflowCapUpdated(uint256,uint256)": TypedContractEvent<
      DailyNetInflowCapUpdatedEvent.InputTuple,
      DailyNetInflowCapUpdatedEvent.OutputTuple,
      DailyNetInflowCapUpdatedEvent.OutputObject
    >;
    DailyNetInflowCapUpdated: TypedContractEvent<
      DailyNetInflowCapUpdatedEvent.InputTuple,
      DailyNetInflowCapUpdatedEvent.OutputTuple,
      DailyNetInflowCapUpdatedEvent.OutputObject
    >;
    "EIP712DomainChanged()": TypedContractEvent<
      EIP712DomainChangedEvent.InputTuple,
      EIP712DomainChangedEvent.OutputTuple,
      EIP712DomainChangedEvent.OutputObject
    >;
    EIP712DomainChanged: TypedContractEvent<
      EIP712DomainChangedEvent.InputTuple,
      EIP712DomainChangedEvent.OutputTuple,
      EIP712DomainChangedEvent.OutputObject
    >;
    "Mint(address,uint256,bytes32)": TypedContractEvent<
      MintEvent.InputTuple,
      MintEvent.OutputTuple,
      MintEvent.OutputObject
    >;
    Mint: TypedContractEvent<MintEvent.InputTuple, MintEvent.OutputTuple, MintEvent.OutputObject>;
    "Paused(address)": TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    "RedeemProcessed(address,uint256)": TypedContractEvent<
      RedeemProcessedEvent.InputTuple,
      RedeemProcessedEvent.OutputTuple,
      RedeemProcessedEvent.OutputObject
    >;
    RedeemProcessed: TypedContractEvent<
      RedeemProcessedEvent.InputTuple,
      RedeemProcessedEvent.OutputTuple,
      RedeemProcessedEvent.OutputObject
    >;
    "RedeemRequested(address,uint256)": TypedContractEvent<
      RedeemRequestedEvent.InputTuple,
      RedeemRequestedEvent.OutputTuple,
      RedeemRequestedEvent.OutputObject
    >;
    RedeemRequested: TypedContractEvent<
      RedeemRequestedEvent.InputTuple,
      RedeemRequestedEvent.OutputTuple,
      RedeemRequestedEvent.OutputObject
    >;
    "RoleAdminChanged(bytes32,bytes32,bytes32)": TypedContractEvent<
      RoleAdminChangedEvent.InputTuple,
      RoleAdminChangedEvent.OutputTuple,
      RoleAdminChangedEvent.OutputObject
    >;
    RoleAdminChanged: TypedContractEvent<
      RoleAdminChangedEvent.InputTuple,
      RoleAdminChangedEvent.OutputTuple,
      RoleAdminChangedEvent.OutputObject
    >;
    "RoleGranted(bytes32,address,address)": TypedContractEvent<
      RoleGrantedEvent.InputTuple,
      RoleGrantedEvent.OutputTuple,
      RoleGrantedEvent.OutputObject
    >;
    RoleGranted: TypedContractEvent<
      RoleGrantedEvent.InputTuple,
      RoleGrantedEvent.OutputTuple,
      RoleGrantedEvent.OutputObject
    >;
    "RoleRevoked(bytes32,address,address)": TypedContractEvent<
      RoleRevokedEvent.InputTuple,
      RoleRevokedEvent.OutputTuple,
      RoleRevokedEvent.OutputObject
    >;
    RoleRevoked: TypedContractEvent<
      RoleRevokedEvent.InputTuple,
      RoleRevokedEvent.OutputTuple,
      RoleRevokedEvent.OutputObject
    >;
    "Transfer(address,address,uint256)": TypedContractEvent<
      TransferEvent.InputTuple,
      TransferEvent.OutputTuple,
      TransferEvent.OutputObject
    >;
    Transfer: TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;
    "Unpaused(address)": TypedContractEvent<
      UnpausedEvent.InputTuple,
      UnpausedEvent.OutputTuple,
      UnpausedEvent.OutputObject
    >;
    Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  };
}
//# sourceMappingURL=AsiaFlexToken.d.ts.map
