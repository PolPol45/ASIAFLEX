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
} from "../../../common";
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
export interface ITreasuryControllerInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "executeMint"
      | "executeRedeem"
      | "getRequestExpiration"
      | "getTreasurySigner"
      | "setRequestExpiration"
      | "setTreasurySigner"
      | "verifyMintSignature"
      | "verifyRedeemSignature"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic: "MintExecuted" | "RedeemExecuted" | "RequestExpirationUpdated" | "TreasurySignerUpdated"
  ): EventFragment;
  encodeFunctionData(
    functionFragment: "executeMint",
    values: [ITreasuryController.MintRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "executeRedeem",
    values: [ITreasuryController.RedeemRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "getRequestExpiration", values?: undefined): string;
  encodeFunctionData(functionFragment: "getTreasurySigner", values?: undefined): string;
  encodeFunctionData(functionFragment: "setRequestExpiration", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setTreasurySigner", values: [AddressLike]): string;
  encodeFunctionData(
    functionFragment: "verifyMintSignature",
    values: [ITreasuryController.MintRequestStruct, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "verifyRedeemSignature",
    values: [ITreasuryController.RedeemRequestStruct, BytesLike]
  ): string;
  decodeFunctionResult(functionFragment: "executeMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "executeRedeem", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRequestExpiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getTreasurySigner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setRequestExpiration", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setTreasurySigner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "verifyMintSignature", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "verifyRedeemSignature", data: BytesLike): Result;
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
export interface ITreasuryController extends BaseContract {
  connect(runner?: ContractRunner | null): ITreasuryController;
  waitForDeployment(): Promise<this>;
  interface: ITreasuryControllerInterface;
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
  getRequestExpiration: TypedContractMethod<[], [bigint], "view">;
  getTreasurySigner: TypedContractMethod<[], [string], "view">;
  setRequestExpiration: TypedContractMethod<[newExpiration: BigNumberish], [void], "nonpayable">;
  setTreasurySigner: TypedContractMethod<[newSigner: AddressLike], [void], "nonpayable">;
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
  getFunction(nameOrSignature: "getRequestExpiration"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getTreasurySigner"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "setRequestExpiration"
  ): TypedContractMethod<[newExpiration: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setTreasurySigner"
  ): TypedContractMethod<[newSigner: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "verifyMintSignature"
  ): TypedContractMethod<[request: ITreasuryController.MintRequestStruct, signature: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "verifyRedeemSignature"
  ): TypedContractMethod<[request: ITreasuryController.RedeemRequestStruct, signature: BytesLike], [boolean], "view">;
  getEvent(
    key: "MintExecuted"
  ): TypedContractEvent<MintExecutedEvent.InputTuple, MintExecutedEvent.OutputTuple, MintExecutedEvent.OutputObject>;
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
    key: "TreasurySignerUpdated"
  ): TypedContractEvent<
    TreasurySignerUpdatedEvent.InputTuple,
    TreasurySignerUpdatedEvent.OutputTuple,
    TreasurySignerUpdatedEvent.OutputObject
  >;
  filters: {
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
  };
}
//# sourceMappingURL=ITreasuryController.d.ts.map
