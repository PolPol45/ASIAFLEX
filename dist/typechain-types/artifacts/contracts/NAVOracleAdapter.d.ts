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
export interface NAVOracleAdapterInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DEFAULT_ADMIN_ROLE"
      | "ORACLE_MANAGER_ROLE"
      | "ORACLE_UPDATER_ROLE"
      | "deviationThreshold"
      | "forceUpdateNAV"
      | "getCurrentDeviation"
      | "getDeviationThreshold"
      | "getNAV"
      | "getRoleAdmin"
      | "getStalenessThreshold"
      | "getTimeSinceLastUpdate"
      | "grantRole"
      | "hasRole"
      | "isStale"
      | "isValidUpdate"
      | "pause"
      | "paused"
      | "renounceRole"
      | "revokeRole"
      | "setDeviationThreshold"
      | "setStalenessThreshold"
      | "stalenessThreshold"
      | "supportsInterface"
      | "unpause"
      | "updateNAV"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic:
      | "DeviationThresholdUpdated"
      | "NAVUpdated"
      | "Paused"
      | "RoleAdminChanged"
      | "RoleGranted"
      | "RoleRevoked"
      | "StalenessThresholdUpdated"
      | "Unpaused"
  ): EventFragment;
  encodeFunctionData(functionFragment: "DEFAULT_ADMIN_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "ORACLE_MANAGER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "ORACLE_UPDATER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "deviationThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "forceUpdateNAV", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "getCurrentDeviation", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "getDeviationThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "getNAV", values?: undefined): string;
  encodeFunctionData(functionFragment: "getRoleAdmin", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "getStalenessThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "getTimeSinceLastUpdate", values?: undefined): string;
  encodeFunctionData(functionFragment: "grantRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "hasRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "isStale", values?: undefined): string;
  encodeFunctionData(functionFragment: "isValidUpdate", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "pause", values?: undefined): string;
  encodeFunctionData(functionFragment: "paused", values?: undefined): string;
  encodeFunctionData(functionFragment: "renounceRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "revokeRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "setDeviationThreshold", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "setStalenessThreshold", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "stalenessThreshold", values?: undefined): string;
  encodeFunctionData(functionFragment: "supportsInterface", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "unpause", values?: undefined): string;
  encodeFunctionData(functionFragment: "updateNAV", values: [BigNumberish]): string;
  decodeFunctionResult(functionFragment: "DEFAULT_ADMIN_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "ORACLE_MANAGER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "ORACLE_UPDATER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "deviationThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "forceUpdateNAV", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getCurrentDeviation", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getDeviationThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getNAV", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRoleAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getStalenessThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getTimeSinceLastUpdate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "grantRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isStale", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "isValidUpdate", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "paused", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "renounceRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "revokeRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setDeviationThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setStalenessThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "stalenessThreshold", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "supportsInterface", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "unpause", data: BytesLike): Result;
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
export interface NAVOracleAdapter extends BaseContract {
  connect(runner?: ContractRunner | null): NAVOracleAdapter;
  waitForDeployment(): Promise<this>;
  interface: NAVOracleAdapterInterface;
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
  DEFAULT_ADMIN_ROLE: TypedContractMethod<[], [string], "view">;
  ORACLE_MANAGER_ROLE: TypedContractMethod<[], [string], "view">;
  ORACLE_UPDATER_ROLE: TypedContractMethod<[], [string], "view">;
  deviationThreshold: TypedContractMethod<[], [bigint], "view">;
  forceUpdateNAV: TypedContractMethod<[newNav: BigNumberish], [void], "nonpayable">;
  getCurrentDeviation: TypedContractMethod<[newNav: BigNumberish], [bigint], "view">;
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
  getRoleAdmin: TypedContractMethod<[role: BytesLike], [string], "view">;
  getStalenessThreshold: TypedContractMethod<[], [bigint], "view">;
  getTimeSinceLastUpdate: TypedContractMethod<[], [bigint], "view">;
  grantRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  hasRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  isStale: TypedContractMethod<[], [boolean], "view">;
  isValidUpdate: TypedContractMethod<[newNav: BigNumberish], [boolean], "view">;
  pause: TypedContractMethod<[], [void], "nonpayable">;
  paused: TypedContractMethod<[], [boolean], "view">;
  renounceRole: TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  revokeRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  setDeviationThreshold: TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  setStalenessThreshold: TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  stalenessThreshold: TypedContractMethod<[], [bigint], "view">;
  supportsInterface: TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  unpause: TypedContractMethod<[], [void], "nonpayable">;
  updateNAV: TypedContractMethod<[newNav: BigNumberish], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "DEFAULT_ADMIN_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "ORACLE_MANAGER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "ORACLE_UPDATER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "deviationThreshold"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "forceUpdateNAV"): TypedContractMethod<[newNav: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "getCurrentDeviation"): TypedContractMethod<[newNav: BigNumberish], [bigint], "view">;
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
  getFunction(nameOrSignature: "getRoleAdmin"): TypedContractMethod<[role: BytesLike], [string], "view">;
  getFunction(nameOrSignature: "getStalenessThreshold"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getTimeSinceLastUpdate"): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "grantRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "hasRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  getFunction(nameOrSignature: "isStale"): TypedContractMethod<[], [boolean], "view">;
  getFunction(nameOrSignature: "isValidUpdate"): TypedContractMethod<[newNav: BigNumberish], [boolean], "view">;
  getFunction(nameOrSignature: "pause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "paused"): TypedContractMethod<[], [boolean], "view">;
  getFunction(
    nameOrSignature: "renounceRole"
  ): TypedContractMethod<[role: BytesLike, callerConfirmation: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "revokeRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setDeviationThreshold"
  ): TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setStalenessThreshold"
  ): TypedContractMethod<[threshold: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "stalenessThreshold"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "supportsInterface"): TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "unpause"): TypedContractMethod<[], [void], "nonpayable">;
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
    key: "Paused"
  ): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
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
    key: "StalenessThresholdUpdated"
  ): TypedContractEvent<
    StalenessThresholdUpdatedEvent.InputTuple,
    StalenessThresholdUpdatedEvent.OutputTuple,
    StalenessThresholdUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "Unpaused"
  ): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
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
    "Paused(address)": TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
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
    "Unpaused(address)": TypedContractEvent<
      UnpausedEvent.InputTuple,
      UnpausedEvent.OutputTuple,
      UnpausedEvent.OutputObject
    >;
    Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  };
}
//# sourceMappingURL=NAVOracleAdapter.d.ts.map
