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
export declare namespace BasketManager {
  type WeightedAssetStruct = {
    assetId: BytesLike;
    weightBps: BigNumberish;
    isBond: boolean;
    accrualBps: BigNumberish;
  };
  type WeightedAssetStructOutput = [assetId: string, weightBps: bigint, isBond: boolean, accrualBps: bigint] & {
    assetId: string;
    weightBps: bigint;
    isBond: boolean;
    accrualBps: bigint;
  };
  type BasketConfigStruct = {
    stalenessThreshold: BigNumberish;
    rebalanceInterval: BigNumberish;
  };
  type BasketConfigStructOutput = [stalenessThreshold: bigint, rebalanceInterval: bigint] & {
    stalenessThreshold: bigint;
    rebalanceInterval: bigint;
  };
  type BasketStateStruct = {
    token: AddressLike;
    nav: BigNumberish;
    navTimestamp: BigNumberish;
    lastRebalance: BigNumberish;
    latestProofHash: BytesLike;
    latestProofUri: string;
  };
  type BasketStateStructOutput = [
    token: string,
    nav: bigint,
    navTimestamp: bigint,
    lastRebalance: bigint,
    latestProofHash: string,
    latestProofUri: string,
  ] & {
    token: string;
    nav: bigint;
    navTimestamp: bigint;
    lastRebalance: bigint;
    latestProofHash: string;
    latestProofUri: string;
  };
}
export interface BasketManagerInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "DEFAULT_ADMIN_ROLE"
      | "ORACLE_MANAGER_ROLE"
      | "RESERVE_AUDITOR_ROLE"
      | "TREASURY_ROLE"
      | "acceptDefaultAdminTransfer"
      | "baseAsset"
      | "basketAllocations"
      | "basketConfig"
      | "basketId"
      | "basketState"
      | "beginDefaultAdminTransfer"
      | "cancelDefaultAdminTransfer"
      | "changeDefaultAdminDelay"
      | "consumedProofs"
      | "defaultAdmin"
      | "defaultAdminDelay"
      | "defaultAdminDelayIncreaseWait"
      | "getNAV"
      | "getRoleAdmin"
      | "grantRole"
      | "hasRole"
      | "mint"
      | "owner"
      | "pause"
      | "paused"
      | "pendingDefaultAdmin"
      | "pendingDefaultAdminDelay"
      | "priceOracle"
      | "proofOfReserves"
      | "redeem"
      | "refreshNAV"
      | "registerBasket"
      | "registerProof"
      | "renounceRole"
      | "revokeRole"
      | "rollbackDefaultAdminDelay"
      | "setPriceOracle"
      | "supportsInterface"
      | "triggerRebalance"
      | "unpause"
      | "updateAllocation"
      | "updateConfig"
  ): FunctionFragment;
  getEvent(
    nameOrSignatureOrTopic:
      | "BasketAllocationUpdated"
      | "BasketConfigUpdated"
      | "BasketRegistered"
      | "DefaultAdminDelayChangeCanceled"
      | "DefaultAdminDelayChangeScheduled"
      | "DefaultAdminTransferCanceled"
      | "DefaultAdminTransferScheduled"
      | "MintExecuted"
      | "NAVRefreshed"
      | "Paused"
      | "PriceOracleUpdated"
      | "ProofRegistered"
      | "Rebalanced"
      | "RedeemExecuted"
      | "RoleAdminChanged"
      | "RoleGranted"
      | "RoleRevoked"
      | "Unpaused"
  ): EventFragment;
  encodeFunctionData(functionFragment: "DEFAULT_ADMIN_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "ORACLE_MANAGER_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "RESERVE_AUDITOR_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "TREASURY_ROLE", values?: undefined): string;
  encodeFunctionData(functionFragment: "acceptDefaultAdminTransfer", values?: undefined): string;
  encodeFunctionData(functionFragment: "baseAsset", values?: undefined): string;
  encodeFunctionData(functionFragment: "basketAllocations", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "basketConfig", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "basketId", values: [BigNumberish, BigNumberish]): string;
  encodeFunctionData(functionFragment: "basketState", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "beginDefaultAdminTransfer", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "cancelDefaultAdminTransfer", values?: undefined): string;
  encodeFunctionData(functionFragment: "changeDefaultAdminDelay", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "consumedProofs", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "defaultAdmin", values?: undefined): string;
  encodeFunctionData(functionFragment: "defaultAdminDelay", values?: undefined): string;
  encodeFunctionData(functionFragment: "defaultAdminDelayIncreaseWait", values?: undefined): string;
  encodeFunctionData(functionFragment: "getNAV", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "getRoleAdmin", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "grantRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "hasRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(
    functionFragment: "mint",
    values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish, AddressLike, BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(functionFragment: "pause", values?: undefined): string;
  encodeFunctionData(functionFragment: "paused", values?: undefined): string;
  encodeFunctionData(functionFragment: "pendingDefaultAdmin", values?: undefined): string;
  encodeFunctionData(functionFragment: "pendingDefaultAdminDelay", values?: undefined): string;
  encodeFunctionData(functionFragment: "priceOracle", values?: undefined): string;
  encodeFunctionData(functionFragment: "proofOfReserves", values: [BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "redeem",
    values: [BigNumberish, BigNumberish, BigNumberish, BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(functionFragment: "refreshNAV", values: [BigNumberish]): string;
  encodeFunctionData(
    functionFragment: "registerBasket",
    values: [
      BigNumberish,
      BigNumberish,
      AddressLike,
      BasketManager.WeightedAssetStruct[],
      BasketManager.BasketConfigStruct,
    ]
  ): string;
  encodeFunctionData(functionFragment: "registerProof", values: [BigNumberish, BytesLike, string]): string;
  encodeFunctionData(functionFragment: "renounceRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "revokeRole", values: [BytesLike, AddressLike]): string;
  encodeFunctionData(functionFragment: "rollbackDefaultAdminDelay", values?: undefined): string;
  encodeFunctionData(functionFragment: "setPriceOracle", values: [AddressLike]): string;
  encodeFunctionData(functionFragment: "supportsInterface", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "triggerRebalance", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "unpause", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "updateAllocation",
    values: [BigNumberish, BasketManager.WeightedAssetStruct[]]
  ): string;
  encodeFunctionData(
    functionFragment: "updateConfig",
    values: [BigNumberish, BasketManager.BasketConfigStruct]
  ): string;
  decodeFunctionResult(functionFragment: "DEFAULT_ADMIN_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "ORACLE_MANAGER_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "RESERVE_AUDITOR_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "TREASURY_ROLE", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "acceptDefaultAdminTransfer", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "baseAsset", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "basketAllocations", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "basketConfig", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "basketId", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "basketState", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "beginDefaultAdminTransfer", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "cancelDefaultAdminTransfer", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "changeDefaultAdminDelay", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "consumedProofs", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "defaultAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "defaultAdminDelay", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "defaultAdminDelayIncreaseWait", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getNAV", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getRoleAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "grantRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "mint", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "paused", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pendingDefaultAdmin", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pendingDefaultAdminDelay", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "priceOracle", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "proofOfReserves", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "redeem", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "refreshNAV", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "registerBasket", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "registerProof", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "renounceRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "revokeRole", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "rollbackDefaultAdminDelay", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setPriceOracle", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "supportsInterface", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "triggerRebalance", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "unpause", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "updateAllocation", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "updateConfig", data: BytesLike): Result;
}
export declare namespace BasketAllocationUpdatedEvent {
  type InputTuple = [basketId: BigNumberish, assetIds: BytesLike[], weights: BigNumberish[]];
  type OutputTuple = [basketId: bigint, assetIds: string[], weights: bigint[]];
  interface OutputObject {
    basketId: bigint;
    assetIds: string[];
    weights: bigint[];
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace BasketConfigUpdatedEvent {
  type InputTuple = [basketId: BigNumberish, stalenessThreshold: BigNumberish, rebalanceInterval: BigNumberish];
  type OutputTuple = [basketId: bigint, stalenessThreshold: bigint, rebalanceInterval: bigint];
  interface OutputObject {
    basketId: bigint;
    stalenessThreshold: bigint;
    rebalanceInterval: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace BasketRegisteredEvent {
  type InputTuple = [
    basketId: BigNumberish,
    token: AddressLike,
    stalenessThreshold: BigNumberish,
    rebalanceInterval: BigNumberish,
  ];
  type OutputTuple = [basketId: bigint, token: string, stalenessThreshold: bigint, rebalanceInterval: bigint];
  interface OutputObject {
    basketId: bigint;
    token: string;
    stalenessThreshold: bigint;
    rebalanceInterval: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DefaultAdminDelayChangeCanceledEvent {
  type InputTuple = [];
  type OutputTuple = [];
  interface OutputObject {}
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DefaultAdminDelayChangeScheduledEvent {
  type InputTuple = [newDelay: BigNumberish, effectSchedule: BigNumberish];
  type OutputTuple = [newDelay: bigint, effectSchedule: bigint];
  interface OutputObject {
    newDelay: bigint;
    effectSchedule: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DefaultAdminTransferCanceledEvent {
  type InputTuple = [];
  type OutputTuple = [];
  interface OutputObject {}
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace DefaultAdminTransferScheduledEvent {
  type InputTuple = [newAdmin: AddressLike, acceptSchedule: BigNumberish];
  type OutputTuple = [newAdmin: string, acceptSchedule: bigint];
  interface OutputObject {
    newAdmin: string;
    acceptSchedule: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace MintExecutedEvent {
  type InputTuple = [
    basketId: BigNumberish,
    payer: AddressLike,
    beneficiary: AddressLike,
    baseAmount: BigNumberish,
    tokensMinted: BigNumberish,
    nav: BigNumberish,
    proofHash: BytesLike,
  ];
  type OutputTuple = [
    basketId: bigint,
    payer: string,
    beneficiary: string,
    baseAmount: bigint,
    tokensMinted: bigint,
    nav: bigint,
    proofHash: string,
  ];
  interface OutputObject {
    basketId: bigint;
    payer: string;
    beneficiary: string;
    baseAmount: bigint;
    tokensMinted: bigint;
    nav: bigint;
    proofHash: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace NAVRefreshedEvent {
  type InputTuple = [basketId: BigNumberish, nav: BigNumberish, timestamp: BigNumberish];
  type OutputTuple = [basketId: bigint, nav: bigint, timestamp: bigint];
  interface OutputObject {
    basketId: bigint;
    nav: bigint;
    timestamp: bigint;
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
export declare namespace PriceOracleUpdatedEvent {
  type InputTuple = [oracle: AddressLike];
  type OutputTuple = [oracle: string];
  interface OutputObject {
    oracle: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace ProofRegisteredEvent {
  type InputTuple = [basketId: BigNumberish, proofHash: BytesLike, uri: string];
  type OutputTuple = [basketId: bigint, proofHash: string, uri: string];
  interface OutputObject {
    basketId: bigint;
    proofHash: string;
    uri: string;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RebalancedEvent {
  type InputTuple = [basketId: BigNumberish, timestamp: BigNumberish];
  type OutputTuple = [basketId: bigint, timestamp: bigint];
  interface OutputObject {
    basketId: bigint;
    timestamp: bigint;
  }
  type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  type Filter = TypedDeferredTopicFilter<Event>;
  type Log = TypedEventLog<Event>;
  type LogDescription = TypedLogDescription<Event>;
}
export declare namespace RedeemExecutedEvent {
  type InputTuple = [
    basketId: BigNumberish,
    from: AddressLike,
    recipient: AddressLike,
    tokensBurned: BigNumberish,
    baseAmount: BigNumberish,
    nav: BigNumberish,
  ];
  type OutputTuple = [
    basketId: bigint,
    from: string,
    recipient: string,
    tokensBurned: bigint,
    baseAmount: bigint,
    nav: bigint,
  ];
  interface OutputObject {
    basketId: bigint;
    from: string;
    recipient: string;
    tokensBurned: bigint;
    baseAmount: bigint;
    nav: bigint;
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
export interface BasketManager extends BaseContract {
  connect(runner?: ContractRunner | null): BasketManager;
  waitForDeployment(): Promise<this>;
  interface: BasketManagerInterface;
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
  RESERVE_AUDITOR_ROLE: TypedContractMethod<[], [string], "view">;
  TREASURY_ROLE: TypedContractMethod<[], [string], "view">;
  acceptDefaultAdminTransfer: TypedContractMethod<[], [void], "nonpayable">;
  baseAsset: TypedContractMethod<[], [string], "view">;
  basketAllocations: TypedContractMethod<[id: BigNumberish], [BasketManager.WeightedAssetStructOutput[]], "view">;
  basketConfig: TypedContractMethod<[id: BigNumberish], [BasketManager.BasketConfigStructOutput], "view">;
  basketId: TypedContractMethod<[region: BigNumberish, strategy: BigNumberish], [bigint], "view">;
  basketState: TypedContractMethod<[id: BigNumberish], [BasketManager.BasketStateStructOutput], "view">;
  beginDefaultAdminTransfer: TypedContractMethod<[newAdmin: AddressLike], [void], "nonpayable">;
  cancelDefaultAdminTransfer: TypedContractMethod<[], [void], "nonpayable">;
  changeDefaultAdminDelay: TypedContractMethod<[newDelay: BigNumberish], [void], "nonpayable">;
  consumedProofs: TypedContractMethod<[arg0: BytesLike], [boolean], "view">;
  defaultAdmin: TypedContractMethod<[], [string], "view">;
  defaultAdminDelay: TypedContractMethod<[], [bigint], "view">;
  defaultAdminDelayIncreaseWait: TypedContractMethod<[], [bigint], "view">;
  getNAV: TypedContractMethod<
    [id: BigNumberish],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  getRoleAdmin: TypedContractMethod<[role: BytesLike], [string], "view">;
  grantRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  hasRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  mint: TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      baseAmount: BigNumberish,
      minTokensOut: BigNumberish,
      beneficiary: AddressLike,
      proofHash: BytesLike,
    ],
    [bigint],
    "nonpayable"
  >;
  owner: TypedContractMethod<[], [string], "view">;
  pause: TypedContractMethod<[], [void], "nonpayable">;
  paused: TypedContractMethod<[], [boolean], "view">;
  pendingDefaultAdmin: TypedContractMethod<
    [],
    [
      [string, bigint] & {
        newAdmin: string;
        schedule: bigint;
      },
    ],
    "view"
  >;
  pendingDefaultAdminDelay: TypedContractMethod<
    [],
    [
      [bigint, bigint] & {
        newDelay: bigint;
        schedule: bigint;
      },
    ],
    "view"
  >;
  priceOracle: TypedContractMethod<[], [string], "view">;
  proofOfReserves: TypedContractMethod<
    [id: BigNumberish],
    [
      [boolean, bigint, bigint, bigint, bigint] & {
        isHealthy: boolean;
        backing: bigint;
        requiredBacking: bigint;
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  redeem: TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      tokenAmount: BigNumberish,
      minBaseAmount: BigNumberish,
      recipient: AddressLike,
    ],
    [bigint],
    "nonpayable"
  >;
  refreshNAV: TypedContractMethod<
    [id: BigNumberish],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "nonpayable"
  >;
  registerBasket: TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      token: AddressLike,
      assets: BasketManager.WeightedAssetStruct[],
      config: BasketManager.BasketConfigStruct,
    ],
    [void],
    "nonpayable"
  >;
  registerProof: TypedContractMethod<[id: BigNumberish, proofHash: BytesLike, uri: string], [void], "nonpayable">;
  renounceRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  revokeRole: TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  rollbackDefaultAdminDelay: TypedContractMethod<[], [void], "nonpayable">;
  setPriceOracle: TypedContractMethod<[newOracle: AddressLike], [void], "nonpayable">;
  supportsInterface: TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  triggerRebalance: TypedContractMethod<[id: BigNumberish], [void], "nonpayable">;
  unpause: TypedContractMethod<[], [void], "nonpayable">;
  updateAllocation: TypedContractMethod<
    [id: BigNumberish, assets: BasketManager.WeightedAssetStruct[]],
    [void],
    "nonpayable"
  >;
  updateConfig: TypedContractMethod<[id: BigNumberish, config: BasketManager.BasketConfigStruct], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "DEFAULT_ADMIN_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "ORACLE_MANAGER_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "RESERVE_AUDITOR_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "TREASURY_ROLE"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "acceptDefaultAdminTransfer"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "baseAsset"): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "basketAllocations"
  ): TypedContractMethod<[id: BigNumberish], [BasketManager.WeightedAssetStructOutput[]], "view">;
  getFunction(
    nameOrSignature: "basketConfig"
  ): TypedContractMethod<[id: BigNumberish], [BasketManager.BasketConfigStructOutput], "view">;
  getFunction(
    nameOrSignature: "basketId"
  ): TypedContractMethod<[region: BigNumberish, strategy: BigNumberish], [bigint], "view">;
  getFunction(
    nameOrSignature: "basketState"
  ): TypedContractMethod<[id: BigNumberish], [BasketManager.BasketStateStructOutput], "view">;
  getFunction(
    nameOrSignature: "beginDefaultAdminTransfer"
  ): TypedContractMethod<[newAdmin: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "cancelDefaultAdminTransfer"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "changeDefaultAdminDelay"
  ): TypedContractMethod<[newDelay: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "consumedProofs"): TypedContractMethod<[arg0: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "defaultAdmin"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "defaultAdminDelay"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "defaultAdminDelayIncreaseWait"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "getNAV"): TypedContractMethod<
    [id: BigNumberish],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  getFunction(nameOrSignature: "getRoleAdmin"): TypedContractMethod<[role: BytesLike], [string], "view">;
  getFunction(
    nameOrSignature: "grantRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "hasRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "mint"
  ): TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      baseAmount: BigNumberish,
      minTokensOut: BigNumberish,
      beneficiary: AddressLike,
      proofHash: BytesLike,
    ],
    [bigint],
    "nonpayable"
  >;
  getFunction(nameOrSignature: "owner"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "pause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "paused"): TypedContractMethod<[], [boolean], "view">;
  getFunction(nameOrSignature: "pendingDefaultAdmin"): TypedContractMethod<
    [],
    [
      [string, bigint] & {
        newAdmin: string;
        schedule: bigint;
      },
    ],
    "view"
  >;
  getFunction(nameOrSignature: "pendingDefaultAdminDelay"): TypedContractMethod<
    [],
    [
      [bigint, bigint] & {
        newDelay: bigint;
        schedule: bigint;
      },
    ],
    "view"
  >;
  getFunction(nameOrSignature: "priceOracle"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "proofOfReserves"): TypedContractMethod<
    [id: BigNumberish],
    [
      [boolean, bigint, bigint, bigint, bigint] & {
        isHealthy: boolean;
        backing: bigint;
        requiredBacking: bigint;
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "redeem"
  ): TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      tokenAmount: BigNumberish,
      minBaseAmount: BigNumberish,
      recipient: AddressLike,
    ],
    [bigint],
    "nonpayable"
  >;
  getFunction(nameOrSignature: "refreshNAV"): TypedContractMethod<
    [id: BigNumberish],
    [
      [bigint, bigint] & {
        nav: bigint;
        timestamp: bigint;
      },
    ],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "registerBasket"
  ): TypedContractMethod<
    [
      region: BigNumberish,
      strategy: BigNumberish,
      token: AddressLike,
      assets: BasketManager.WeightedAssetStruct[],
      config: BasketManager.BasketConfigStruct,
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "registerProof"
  ): TypedContractMethod<[id: BigNumberish, proofHash: BytesLike, uri: string], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "renounceRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "revokeRole"
  ): TypedContractMethod<[role: BytesLike, account: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "rollbackDefaultAdminDelay"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(nameOrSignature: "setPriceOracle"): TypedContractMethod<[newOracle: AddressLike], [void], "nonpayable">;
  getFunction(nameOrSignature: "supportsInterface"): TypedContractMethod<[interfaceId: BytesLike], [boolean], "view">;
  getFunction(nameOrSignature: "triggerRebalance"): TypedContractMethod<[id: BigNumberish], [void], "nonpayable">;
  getFunction(nameOrSignature: "unpause"): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "updateAllocation"
  ): TypedContractMethod<[id: BigNumberish, assets: BasketManager.WeightedAssetStruct[]], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "updateConfig"
  ): TypedContractMethod<[id: BigNumberish, config: BasketManager.BasketConfigStruct], [void], "nonpayable">;
  getEvent(
    key: "BasketAllocationUpdated"
  ): TypedContractEvent<
    BasketAllocationUpdatedEvent.InputTuple,
    BasketAllocationUpdatedEvent.OutputTuple,
    BasketAllocationUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "BasketConfigUpdated"
  ): TypedContractEvent<
    BasketConfigUpdatedEvent.InputTuple,
    BasketConfigUpdatedEvent.OutputTuple,
    BasketConfigUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "BasketRegistered"
  ): TypedContractEvent<
    BasketRegisteredEvent.InputTuple,
    BasketRegisteredEvent.OutputTuple,
    BasketRegisteredEvent.OutputObject
  >;
  getEvent(
    key: "DefaultAdminDelayChangeCanceled"
  ): TypedContractEvent<
    DefaultAdminDelayChangeCanceledEvent.InputTuple,
    DefaultAdminDelayChangeCanceledEvent.OutputTuple,
    DefaultAdminDelayChangeCanceledEvent.OutputObject
  >;
  getEvent(
    key: "DefaultAdminDelayChangeScheduled"
  ): TypedContractEvent<
    DefaultAdminDelayChangeScheduledEvent.InputTuple,
    DefaultAdminDelayChangeScheduledEvent.OutputTuple,
    DefaultAdminDelayChangeScheduledEvent.OutputObject
  >;
  getEvent(
    key: "DefaultAdminTransferCanceled"
  ): TypedContractEvent<
    DefaultAdminTransferCanceledEvent.InputTuple,
    DefaultAdminTransferCanceledEvent.OutputTuple,
    DefaultAdminTransferCanceledEvent.OutputObject
  >;
  getEvent(
    key: "DefaultAdminTransferScheduled"
  ): TypedContractEvent<
    DefaultAdminTransferScheduledEvent.InputTuple,
    DefaultAdminTransferScheduledEvent.OutputTuple,
    DefaultAdminTransferScheduledEvent.OutputObject
  >;
  getEvent(
    key: "MintExecuted"
  ): TypedContractEvent<MintExecutedEvent.InputTuple, MintExecutedEvent.OutputTuple, MintExecutedEvent.OutputObject>;
  getEvent(
    key: "NAVRefreshed"
  ): TypedContractEvent<NAVRefreshedEvent.InputTuple, NAVRefreshedEvent.OutputTuple, NAVRefreshedEvent.OutputObject>;
  getEvent(
    key: "Paused"
  ): TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
  getEvent(
    key: "PriceOracleUpdated"
  ): TypedContractEvent<
    PriceOracleUpdatedEvent.InputTuple,
    PriceOracleUpdatedEvent.OutputTuple,
    PriceOracleUpdatedEvent.OutputObject
  >;
  getEvent(
    key: "ProofRegistered"
  ): TypedContractEvent<
    ProofRegisteredEvent.InputTuple,
    ProofRegisteredEvent.OutputTuple,
    ProofRegisteredEvent.OutputObject
  >;
  getEvent(
    key: "Rebalanced"
  ): TypedContractEvent<RebalancedEvent.InputTuple, RebalancedEvent.OutputTuple, RebalancedEvent.OutputObject>;
  getEvent(
    key: "RedeemExecuted"
  ): TypedContractEvent<
    RedeemExecutedEvent.InputTuple,
    RedeemExecutedEvent.OutputTuple,
    RedeemExecutedEvent.OutputObject
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
    key: "Unpaused"
  ): TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  filters: {
    "BasketAllocationUpdated(uint8,bytes32[],uint16[])": TypedContractEvent<
      BasketAllocationUpdatedEvent.InputTuple,
      BasketAllocationUpdatedEvent.OutputTuple,
      BasketAllocationUpdatedEvent.OutputObject
    >;
    BasketAllocationUpdated: TypedContractEvent<
      BasketAllocationUpdatedEvent.InputTuple,
      BasketAllocationUpdatedEvent.OutputTuple,
      BasketAllocationUpdatedEvent.OutputObject
    >;
    "BasketConfigUpdated(uint8,uint256,uint256)": TypedContractEvent<
      BasketConfigUpdatedEvent.InputTuple,
      BasketConfigUpdatedEvent.OutputTuple,
      BasketConfigUpdatedEvent.OutputObject
    >;
    BasketConfigUpdated: TypedContractEvent<
      BasketConfigUpdatedEvent.InputTuple,
      BasketConfigUpdatedEvent.OutputTuple,
      BasketConfigUpdatedEvent.OutputObject
    >;
    "BasketRegistered(uint8,address,uint256,uint256)": TypedContractEvent<
      BasketRegisteredEvent.InputTuple,
      BasketRegisteredEvent.OutputTuple,
      BasketRegisteredEvent.OutputObject
    >;
    BasketRegistered: TypedContractEvent<
      BasketRegisteredEvent.InputTuple,
      BasketRegisteredEvent.OutputTuple,
      BasketRegisteredEvent.OutputObject
    >;
    "DefaultAdminDelayChangeCanceled()": TypedContractEvent<
      DefaultAdminDelayChangeCanceledEvent.InputTuple,
      DefaultAdminDelayChangeCanceledEvent.OutputTuple,
      DefaultAdminDelayChangeCanceledEvent.OutputObject
    >;
    DefaultAdminDelayChangeCanceled: TypedContractEvent<
      DefaultAdminDelayChangeCanceledEvent.InputTuple,
      DefaultAdminDelayChangeCanceledEvent.OutputTuple,
      DefaultAdminDelayChangeCanceledEvent.OutputObject
    >;
    "DefaultAdminDelayChangeScheduled(uint48,uint48)": TypedContractEvent<
      DefaultAdminDelayChangeScheduledEvent.InputTuple,
      DefaultAdminDelayChangeScheduledEvent.OutputTuple,
      DefaultAdminDelayChangeScheduledEvent.OutputObject
    >;
    DefaultAdminDelayChangeScheduled: TypedContractEvent<
      DefaultAdminDelayChangeScheduledEvent.InputTuple,
      DefaultAdminDelayChangeScheduledEvent.OutputTuple,
      DefaultAdminDelayChangeScheduledEvent.OutputObject
    >;
    "DefaultAdminTransferCanceled()": TypedContractEvent<
      DefaultAdminTransferCanceledEvent.InputTuple,
      DefaultAdminTransferCanceledEvent.OutputTuple,
      DefaultAdminTransferCanceledEvent.OutputObject
    >;
    DefaultAdminTransferCanceled: TypedContractEvent<
      DefaultAdminTransferCanceledEvent.InputTuple,
      DefaultAdminTransferCanceledEvent.OutputTuple,
      DefaultAdminTransferCanceledEvent.OutputObject
    >;
    "DefaultAdminTransferScheduled(address,uint48)": TypedContractEvent<
      DefaultAdminTransferScheduledEvent.InputTuple,
      DefaultAdminTransferScheduledEvent.OutputTuple,
      DefaultAdminTransferScheduledEvent.OutputObject
    >;
    DefaultAdminTransferScheduled: TypedContractEvent<
      DefaultAdminTransferScheduledEvent.InputTuple,
      DefaultAdminTransferScheduledEvent.OutputTuple,
      DefaultAdminTransferScheduledEvent.OutputObject
    >;
    "MintExecuted(uint8,address,address,uint256,uint256,uint256,bytes32)": TypedContractEvent<
      MintExecutedEvent.InputTuple,
      MintExecutedEvent.OutputTuple,
      MintExecutedEvent.OutputObject
    >;
    MintExecuted: TypedContractEvent<
      MintExecutedEvent.InputTuple,
      MintExecutedEvent.OutputTuple,
      MintExecutedEvent.OutputObject
    >;
    "NAVRefreshed(uint8,uint256,uint256)": TypedContractEvent<
      NAVRefreshedEvent.InputTuple,
      NAVRefreshedEvent.OutputTuple,
      NAVRefreshedEvent.OutputObject
    >;
    NAVRefreshed: TypedContractEvent<
      NAVRefreshedEvent.InputTuple,
      NAVRefreshedEvent.OutputTuple,
      NAVRefreshedEvent.OutputObject
    >;
    "Paused(address)": TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    Paused: TypedContractEvent<PausedEvent.InputTuple, PausedEvent.OutputTuple, PausedEvent.OutputObject>;
    "PriceOracleUpdated(address)": TypedContractEvent<
      PriceOracleUpdatedEvent.InputTuple,
      PriceOracleUpdatedEvent.OutputTuple,
      PriceOracleUpdatedEvent.OutputObject
    >;
    PriceOracleUpdated: TypedContractEvent<
      PriceOracleUpdatedEvent.InputTuple,
      PriceOracleUpdatedEvent.OutputTuple,
      PriceOracleUpdatedEvent.OutputObject
    >;
    "ProofRegistered(uint8,bytes32,string)": TypedContractEvent<
      ProofRegisteredEvent.InputTuple,
      ProofRegisteredEvent.OutputTuple,
      ProofRegisteredEvent.OutputObject
    >;
    ProofRegistered: TypedContractEvent<
      ProofRegisteredEvent.InputTuple,
      ProofRegisteredEvent.OutputTuple,
      ProofRegisteredEvent.OutputObject
    >;
    "Rebalanced(uint8,uint256)": TypedContractEvent<
      RebalancedEvent.InputTuple,
      RebalancedEvent.OutputTuple,
      RebalancedEvent.OutputObject
    >;
    Rebalanced: TypedContractEvent<
      RebalancedEvent.InputTuple,
      RebalancedEvent.OutputTuple,
      RebalancedEvent.OutputObject
    >;
    "RedeemExecuted(uint8,address,address,uint256,uint256,uint256)": TypedContractEvent<
      RedeemExecutedEvent.InputTuple,
      RedeemExecutedEvent.OutputTuple,
      RedeemExecutedEvent.OutputObject
    >;
    RedeemExecuted: TypedContractEvent<
      RedeemExecutedEvent.InputTuple,
      RedeemExecutedEvent.OutputTuple,
      RedeemExecutedEvent.OutputObject
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
    "Unpaused(address)": TypedContractEvent<
      UnpausedEvent.InputTuple,
      UnpausedEvent.OutputTuple,
      UnpausedEvent.OutputObject
    >;
    Unpaused: TypedContractEvent<UnpausedEvent.InputTuple, UnpausedEvent.OutputTuple, UnpausedEvent.OutputObject>;
  };
}
//# sourceMappingURL=BasketManager.d.ts.map
