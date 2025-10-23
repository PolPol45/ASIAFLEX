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
export interface IAsiaFlexTokenInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "burn"
      | "getRemainingDailyMint"
      | "getRemainingDailyNetInflows"
      | "isBlacklisted"
      | "mint"
      | "setBlacklisted"
      | "setMaxDailyMint"
      | "setMaxDailyNetInflows"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic: "BlacklistUpdated" | "Burn" | "DailyCapUpdated" | "DailyNetInflowCapUpdated" | "Mint"
  ): EventFragment;
  encodeFunctionData(functionFragment: "burn", values: [AddressLike, BigNumberish, BytesLike]): string;
  encodeFunctionData(functionFragment: "getRemainingDailyMint", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRemainingDailyNetInflows", values?: undefined): string;
  encodeFunctionData(functionFragment: "isBlacklisted", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "mint", values: [AddressLike, BigNumberish, BytesLike]): string;
  encodeFunctionData(functionFragment: "setBlacklisted", values: [AddressLike, boolean]): string;
  encodeFunctionData(functionFragment: "setMaxDailyMint", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setMaxDailyNetInflows", values: [BigNumberish]): string;
  decodeFunctionResult(functionFragment: "burn", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRemainingDailyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRemainingDailyNetInflows", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isBlacklisted", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setBlacklisted", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setMaxDailyMint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setMaxDailyNetInflows", data: BytesLike): Result;
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
export interface IAsiaFlexToken extends BaseContract {
  connect(runner?: ContractRunner | null): IAsiaFlexToken;
  waitForDeployment(): Promise<this>;
  interface: IAsiaFlexTokenInterface;
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
  burn: TypedContractMethod<
    [from: AddressLike, amount: BigNumberish, attestationHash: BytesLike],
    [void],
    "nonpayable"
  >;
  getRemainingDailyMint: TypedContractMethod<[], [bigint], "view">;
  getRemainingDailyNetInflows: TypedContractMethod<[], [bigint], "view">;
  isBlacklisted: TypedContractMethod<[account: AddressLike], [boolean], "view">;
  mint: TypedContractMethod<[to: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  setBlacklisted: TypedContractMethod<[account: AddressLike, isBlacklisted: boolean], [void], "nonpayable">;
  setMaxDailyMint: TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  setMaxDailyNetInflows: TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(
    nameOrSignature: "burn"
  ): TypedContractMethod<[from: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "getRemainingDailyMint"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getRemainingDailyNetInflows"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "isBlacklisted"): TypedContractMethod<[account: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "mint"
  ): TypedContractMethod<[to: AddressLike, amount: BigNumberish, attestationHash: BytesLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setBlacklisted"
  ): TypedContractMethod<[account: AddressLike, isBlacklisted: boolean], [void], "nonpayable">;
  getFunction(nameOrSignature: "setMaxDailyMint"): TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setMaxDailyNetInflows"
  ): TypedContractMethod<[newCap: BigNumberish], [void], "nonpayable">;
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
  getEvent(key: "Mint"): TypedContractEvent<MintEvent.InputTuple, MintEvent.OutputTuple, MintEvent.OutputObject>;
  filters: {
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
    "Mint(address,uint256,bytes32)": TypedContractEvent<
      MintEvent.InputTuple,
      MintEvent.OutputTuple,
      MintEvent.OutputObject
    >;
    Mint: TypedContractEvent<MintEvent.InputTuple, MintEvent.OutputTuple, MintEvent.OutputObject>;
  };
}
//# sourceMappingURL=IAsiaFlexToken.d.ts.map
