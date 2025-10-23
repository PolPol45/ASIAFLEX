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
export declare namespace ITreasuryController {
  type MintRequestStruct = {
    to: AddressLike;
    amount: BigNumberish;
    timestamp: BigNumberish;
    reserveHash: BytesLike;
  };
  type MintRequestStructOutput = [to: string, amount: bigint, timestamp: bigint, reserveHash: string] & {
    to: string;
    amount: bigint;
    timestamp: bigint;
    reserveHash: string;
  };
  type RedeemRequestStruct = {
    from: AddressLike;
    amount: BigNumberish;
    timestamp: BigNumberish;
    reserveHash: BytesLike;
  };
  type RedeemRequestStructOutput = [from: string, amount: bigint, timestamp: bigint, reserveHash: string] & {
    from: string;
    amount: bigint;
    timestamp: bigint;
    reserveHash: string;
  };
}
export interface TreasuryControllerInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "ASIA_FLEX_TOKEN"
      | "DEFAULT_ADMIN_ROLE"
      | "TREASURY_MANAGER_ROLE"
      | "eip712Domain"
      | "emergencyBurn"
      | "emergencyMint"
      | "executeMint"
      | "executeRedeem"
      | "getMintRequestHash"
      | "getRedeemRequestHash"
      | "getRequestExpiration"
      | "getRoleAdmin"
      | "getTreasurySigner"
      | "grantRole"
      | "hasRole"
      | "isRedeemRequestUsed"
      | "isRequestUsed"
      | "pause"
      | "paused"
      | "renounceRole"
      | "requestExpiration"
      | "revokeRole"
      | "setRequestExpiration"
      | "setTreasurySigner"
      | "supportsInterface"
      | "treasurySigner"
      | "unpause"
      | "usedRequests"
      | "verifyMintSignature"
      | "verifyRedeemSignature"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic:
      | "EIP712DomainChanged"
      | "MintExecuted"
      | "Paused"
      | "RedeemExecuted"
      | "RequestExpirationUpdated"
      | "RoleAdminChanged"
      | "RoleGranted"
      | "RoleRevoked"
      | "TreasurySignerUpdated"
      | "Unpaused"
  ): EventFragment;
  encodeFunctionData(functionFragment: "ASIA_FLEX_TOKEN", values?: undefined): string;
  encodeFunctionData(functionFragment: "DEFAULT_ADMIN_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "TREASURY_MANAGER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "eip712Domain", values?: undefined): string;
  encodeFunctionData(functionFragment: "emergencyBurn", values: [AddressLike, BigNumberish, BytesLike]): string;
  encodeFunctionData(functionFragment: "emergencyMint", values: [AddressLike, BigNumberish, BytesLike]): string;
  encodeFunctionData(
    functionFragment: "executeMint",
    values: [ITreasuryController.MintRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "executeRedeem",
    values: [ITreasuryController.RedeemRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "getMintRequestHash", values: [ITreasuryController.MintRequestStruct]): string;
  encodeFunctionData(
    functionFragment: "getRedeemRequestHash",
    values: [ITreasuryController.RedeemRequestStruct]
  ): string;
  encodeFunctionData(functionFragment: "getRequestExpiration", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRoleAdmin", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "getTreasurySigner", values?: undefined): string;
  encodeFunctionData(functionFragment: "grantRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "hasRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(
    functionFragment: "isRedeemRequestUsed",
    values: [ITreasuryController.RedeemRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "isRequestUsed",
    values: [ITreasuryController.MintRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "pause", values?: undefined): string;
  encodeFunctionData(functionFragment: "paused", values?: undefined): string;
  encodeFunctionData(functionFragment: "renounceRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "requestExpiration", values?: undefined): string;
  encodeFunctionData(functionFragment: "revokeRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "setRequestExpiration", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setTreasurySigner", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "supportsInterface", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "treasurySigner", values?: undefined): string;
  encodeFunctionData(functionFragment: "unpause", values?: undefined): string;
  encodeFunctionData(functionFragment: "usedRequests", values: [BytesLike]): string;
  encodeFunctionData(
    functionFragment: "verifyMintSignature",
    values: [ITreasuryController.MintRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "verifyRedeemSignature",
    values: [ITreasuryController.RedeemRequestStruct, BytesLike]
  ): string;
  decodeFunctionResult(functionFragment: "ASIA_FLEX_TOKEN", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "DEFAULT_ADMIN_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "TREASURY_MANAGER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "eip712Domain", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "emergencyBurn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "emergencyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "executeMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "executeRedeem", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getMintRequestHash", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRedeemRequestHash", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRequestExpiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRoleAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getTreasurySigner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "grantRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isRedeemRequestUsed", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isRequestUsed", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "paused", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "renounceRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "requestExpiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "revokeRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setRequestExpiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setTreasurySigner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "supportsInterface", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "treasurySigner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "unpause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "usedRequests", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "verifyMintSignature", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "verifyRedeemSignature", data: BytesLike): Result;
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
export declare namespace MintExecutedEvent {
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
export declare namespace RedeemExecutedEvent {
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
export declare namespace RequestExpirationUpdatedEvent {
  type InputTuple = [oldExpiration: BigNumberish, newExpiration: BigNumberish];
  type OutputTuple = [oldExpiration: bigint, newExpiration: bigint];
  interface OutputObject {
    oldExpiration: bigint;
    newExpiration: bigint;
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
export declare namespace TreasurySignerUpdatedEvent {
  type InputTuple = [oldSigner: AddressLike, newSigner: AddressLike];
  type OutputTuple = [oldSigner: string, newSigner: string];
  interface OutputObject {
    oldSigner: string;
    newSigner: string;
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
export interface TreasuryController extends BaseContract {
  connect(runner?: ContractRunner | null): TreasuryController;
  waitForDeployment(): Promise<this>;
  interface: TreasuryControllerInterface;
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
  ASIA_FLEX_TOKEN: TypedContractMethod<[], [string], "view">;
  DEFAULT_ADMIN_ROLE: TypedContractMethod<[], [string], "view">;
  TREASURY_MANAGER_ROLE: TypedContractMethod<[], [string], "view">;
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
  emergencyBurn: TypedContractMethod<
    [from: AddressLike, amount: BigNumberish, attestationHash: BytesLike],
    [void],
    "nonpayable"
  >;
  emergencyMint: TypedContractMethod<
    [to: AddressLike, amount: BigNumberish, attestationHash: BytesLike],
    [void],
    "nonpayable"
  >;
  executeMint: TypedContractMethod<
    [request: ITreasuryController.MintRequestStruct, signature: BytesLike],
    [void],
    "nonpayable"
  >;
  executeRedeem: TypedContractMethod<
    [request: ITreasuryController.RedeemRequestStruct, signature: BytesLike],
    [void],
    "nonpayable"
  >;
  getMintRequestHash: TypedContractMethod<[request: ITreasuryController.MintRequestStruct], [string], "view">;
  getRedeemRequestHash: TypedContractMethod<[request: ITreasuryController.RedeemRequestStruct], [string], "view">;
  getRequestExpiration: TypedContractMethod<[], [bigint], "view">;
  getRoleAdmin: TypedContractMethod<[role: BytesLike], [string], "view">;
  getTreasurySigner: TypedContractMethod<[], [string], "view">;
  grantRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  hasRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  isRedeemRequestUsed: TypedContractMethod<
    [request: ITreasuryController.RedeemRequestStruct, signature: BytesLike],
    [boolean],
    "view"
  >;
  isRequestUsed: TypedContractMethod<
    [request: ITreasuryController.MintRequestStruct, signature: BytesLike],
    [boolean],
    "view"
  >;
  pause: TypedContractMethod<[], [void], "nonpayable">;
  paused: TypedContractMethod<[], [boolean], "view">;
  renounceRole: TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  requestExpiration: TypedContractMethod<[], [bigint], "view">;
  revokeRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  setRequestExpiration: TypedContractMethod<[newExpiration: BigNumberish], [void], "nonpayable">;
  setTreasurySigner: TypedContractMethod<[newSigner: AddressLike], [void], "nonpayable">;
  supportsInterface: TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  treasurySigner: TypedContractMethod<[], [string], "view">;
  unpause: TypedContractMethod<[], [void], "nonpayable">;
  usedRequests: TypedContractMethod<[arg0: BytesLike], [boolean], "view">;
  verifyMintSignature: TypedContractMethod<
    [request: ITreasuryController.MintRequestStruct, signature: BytesLike],
    [boolean],
    "view"
  >;
  verifyRedeemSignature: TypedContractMethod<
    [request: ITreasuryController.RedeemRequestStruct, signature: BytesLike],
    [boolean],
    "view"
  >;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "ASIA_FLEX_TOKEN"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "DEFAULT_ADMIN_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "TREASURY_MANAGER_ROLE"): TypedContractMethod<[], [string], "view">;
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
  getFunction(
    nameOrSignature: "emergencyBurn"
  ): TypedContractMethod<[from: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "emergencyMint"
  ): TypedContractMethod<[to: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "executeMint"
  ): TypedContractMethod<[request: ITreasuryController.MintRequestStruct, signature: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "executeRedeem"
  ): TypedContractMethod<
    [request: ITreasuryController.RedeemRequestStruct, signature: BytesLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "getMintRequestHash"
  ): TypedContractMethod<[request: ITreasuryController.MintRequestStruct], [string], "view">;
  getFunction(
    nameOrSignature: "getRedeemRequestHash"
  ): TypedContractMethod<[request: ITreasuryController.RedeemRequestStruct], [string], "view">;
  getFunction(nameOrSignature: "getRequestExpiration"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getRoleAdmin"): TypedContractMethod<[role: BytesLike], [string], "view">;
  getFunction(nameOrSignature: "getTreasurySigner"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "grantRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "hasRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "isRedeemRequestUsed"
  ): TypedContractMethod<[request: ITreasuryController.RedeemRequestStruct, signature: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "isRequestUsed"
  ): TypedContractMethod<[request: ITreasuryController.MintRequestStruct, signature: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "pause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "paused"): TypedContractMethod<[], [boolean], "view">;
  getFunction(
    nameOrSignature: "renounceRole"
  ): TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "requestExpiration"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "revokeRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setRequestExpiration"
  ): TypedContractMethod<[newExpiration: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setTreasurySigner"
  ): TypedContractMethod<[newSigner: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "supportsInterface"): TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "treasurySigner"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "unpause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "usedRequests"): TypedContractMethod<[arg0: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "verifyMintSignature"
  ): TypedContractMethod<[request: ITreasuryController.MintRequestStruct, signature: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "verifyRedeemSignature"
  ): TypedContractMethod<[request: ITreasuryController.RedeemRequestStruct, signature: BytesLike], [boolean], "view">;
  getEvent(
    key: "EIP712DomainChanged"
  ): TypedContractEvent<
    EIP712DomainChangedEvent.InputTuple,
    EIP712DomainChangedEvent.OutputTuple,
    EIP712DomainChangedEvent.OutputObject
  >;
  getEvent(
    key: "MintExecuted"
  ): TypedContractEvent<MintExecutedEvent.InputTuple, MintExecutedEvent.OutputTuple, MintExecutedEvent.OutputObject>;
  getEvent(
    key: "Paused"
  ): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
  getEvent(
    key: "RedeemExecuted"
  ): TypedContractEvent<
    RedeemExecutedEvent.InputTuple,
    RedeemExecutedEvent.OutputTuple,
    RedeemExecutedEvent.OutputObject
  >;
  getEvent(
    key: "RequestExpirationUpdated"
  ): TypedContractEvent<
    RequestExpirationUpdatedEvent.InputTuple,
    RequestExpirationUpdatedEvent.OutputTuple,
    RequestExpirationUpdatedEvent.OutputObject
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
    key: "TreasurySignerUpdated"
  ): TypedContractEvent<
    TreasurySignerUpdatedEvent.InputTuple,
    TreasurySignerUpdatedEvent.OutputTuple,
    TreasurySignerUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "Unpaused"
  ): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  filters: {
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
    "MintExecuted(address,uint256,bytes32)": TypedContractEvent<
      MintExecutedEvent.InputTuple,
      MintExecutedEvent.OutputTuple,
      MintExecutedEvent.OutputObject
    >;
    MintExecuted: TypedContractEvent<
      MintExecutedEvent.InputTuple,
      MintExecutedEvent.OutputTuple,
      MintExecutedEvent.OutputObject
    >;
    "Paused(address)": TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    "RedeemExecuted(address,uint256,bytes32)": TypedContractEvent<
      RedeemExecutedEvent.InputTuple,
      RedeemExecutedEvent.OutputTuple,
      RedeemExecutedEvent.OutputObject
    >;
    RedeemExecuted: TypedContractEvent<
      RedeemExecutedEvent.InputTuple,
      RedeemExecutedEvent.OutputTuple,
      RedeemExecutedEvent.OutputObject
    >;
    "RequestExpirationUpdated(uint256,uint256)": TypedContractEvent<
      RequestExpirationUpdatedEvent.InputTuple,
      RequestExpirationUpdatedEvent.OutputTuple,
      RequestExpirationUpdatedEvent.OutputObject
    >;
    RequestExpirationUpdated: TypedContractEvent<
      RequestExpirationUpdatedEvent.InputTuple,
      RequestExpirationUpdatedEvent.OutputTuple,
      RequestExpirationUpdatedEvent.OutputObject
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
    "TreasurySignerUpdated(address,address)": TypedContractEvent<
      TreasurySignerUpdatedEvent.InputTuple,
      TreasurySignerUpdatedEvent.OutputTuple,
      TreasurySignerUpdatedEvent.OutputObject
    >;
    TreasurySignerUpdated: TypedContractEvent<
      TreasurySignerUpdatedEvent.InputTuple,
      TreasurySignerUpdatedEvent.OutputTuple,
      TreasurySignerUpdatedEvent.OutputObject
    >;
    "Unpaused(address)": TypedContractEvent<
      UnpausedEvent.InputTuple,
      UnpausedEvent.OutputTuple,
      UnpausedEvent.OutputObject
    >;
    Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  };
}
//# sourceMappingURL=TreasuryController.d.ts.map
