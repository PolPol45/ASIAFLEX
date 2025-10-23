import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
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
export interface INAVOracleAdapterInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "getDeviationThreshold"
      | "getNAV"
      | "getStalenessThreshold"
      | "isStale"
      | "isValidUpdate"
      | "setDeviationThreshold"
      | "setStalenessThreshold"
      | "updateNAV"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic: "DeviationThresholdUpdated" | "NAVUpdated" | "StalenessThresholdUpdated"
  ): EventFragment;
  encodeFunctionData(functionFragment: "getDeviationThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "getNAV", values?: undefined): string;
  encodeFunctionData(functionFragment: "getStalenessThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "isStale", values?: undefined): string;
  encodeFunctionData(functionFragment: "isValidUpdate", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setDeviationThreshold", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setStalenessThreshold", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "updateNAV", values: [BigNumberish]): string;
  decodeFunctionResult(functionFragment: "getDeviationThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getNAV", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getStalenessThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isStale", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isValidUpdate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setDeviationThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setStalenessThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "updateNAV", data: BytesLike): Result;
}
export declare namespace DeviationThresholdUpdatedEvent {
  type InputTuple = [oldThreshold: BigNumberish, newThreshold: BigNumberish];
  type OutputTuple = [oldThreshold: bigint, newThreshold: bigint];
  interface OutputObject {
    oldThreshold: bigint;
    newThreshold: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace NAVUpdatedEvent {
  type InputTuple = [timestamp: BigNumberish, oldNav: BigNumberish, newNav: BigNumberish];
  type OutputTuple = [timestamp: bigint, oldNav: bigint, newNav: bigint];
  interface OutputObject {
    timestamp: bigint;
    oldNav: bigint;
    newNav: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace StalenessThresholdUpdatedEvent {
  type InputTuple = [oldThreshold: BigNumberish, newThreshold: BigNumberish];
  type OutputTuple = [oldThreshold: bigint, newThreshold: bigint];
  interface OutputObject {
    oldThreshold: bigint;
    newThreshold: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export interface INAVOracleAdapter extends BaseContract {
  connect(runner?: ContractRunner | null): INAVOracleAdapter;
  waitForDeployment(): Promise<this>;
  interface: INAVOracleAdapterInterface;
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
  getDeviationThreshold: TypedContractMethod<[], [bigint], "view">;
  getNAV: TypedContractMethod<
    [],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  getStalenessThreshold: TypedContractMethod<[], [bigint], "view">;
  isStale: TypedContractMethod<[], [boolean], "view">;
  isValidUpdate: TypedContractMethod<[newNav: BigNumberish], [boolean], "view">;
  setDeviationThreshold: TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  setStalenessThreshold: TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  updateNAV: TypedContractMethod<[newNav: BigNumberish], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "getDeviationThreshold"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getNAV"): TypedContractMethod<
    [],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  getFunction(nameOrSignature: "getStalenessThreshold"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "isStale"): TypedContractMethod<[], [boolean], "view">;
  getFunction(nameOrSignature: "isValidUpdate"): TypedContractMethod<[newNav: BigNumberish], [boolean], "view">;
  getFunction(
    nameOrSignature: "setDeviationThreshold"
  ): TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setStalenessThreshold"
  ): TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "updateNAV"): TypedContractMethod<[newNav: BigNumberish], [void], "nonpayable">;
  getEvent(
    key: "DeviationThresholdUpdated"
  ): TypedContractEvent<
    DeviationThresholdUpdatedEvent.InputTuple,
    DeviationThresholdUpdatedEvent.OutputTuple,
    DeviationThresholdUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "NAVUpdated"
  ): TypedContractEvent<NAVUpdatedEvent.InputTuple, NAVUpdatedEvent.OutputTuple, NAVUpdatedEvent.OutputObject>;
  getEvent(
    key: "StalenessThresholdUpdated"
  ): TypedContractEvent<
    StalenessThresholdUpdatedEvent.InputTuple,
    StalenessThresholdUpdatedEvent.OutputTuple,
    StalenessThresholdUpdatedEvent.OutputObject
  >;
  filters: {
    "DeviationThresholdUpdated(uint256,uint256)": TypedContractEvent<
      DeviationThresholdUpdatedEvent.InputTuple,
      DeviationThresholdUpdatedEvent.OutputTuple,
      DeviationThresholdUpdatedEvent.OutputObject
    >;
    DeviationThresholdUpdated: TypedContractEvent<
      DeviationThresholdUpdatedEvent.InputTuple,
      DeviationThresholdUpdatedEvent.OutputTuple,
      DeviationThresholdUpdatedEvent.OutputObject
    >;
    "NAVUpdated(uint256,uint256,uint256)": TypedContractEvent<
      NAVUpdatedEvent.InputTuple,
      NAVUpdatedEvent.OutputTuple,
      NAVUpdatedEvent.OutputObject
    >;
    NAVUpdated: TypedContractEvent<
      NAVUpdatedEvent.InputTuple,
      NAVUpdatedEvent.OutputTuple,
      NAVUpdatedEvent.OutputObject
    >;
    "StalenessThresholdUpdated(uint256,uint256)": TypedContractEvent<
      StalenessThresholdUpdatedEvent.InputTuple,
      StalenessThresholdUpdatedEvent.OutputTuple,
      StalenessThresholdUpdatedEvent.OutputObject
    >;
    StalenessThresholdUpdated: TypedContractEvent<
      StalenessThresholdUpdatedEvent.InputTuple,
      StalenessThresholdUpdatedEvent.OutputTuple,
      StalenessThresholdUpdatedEvent.OutputObject
    >;
  };
}
//# sourceMappingURL=INAVOracleAdapter.d.ts.map
