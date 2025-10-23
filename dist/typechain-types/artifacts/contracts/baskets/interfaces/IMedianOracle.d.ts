import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "../../../../common";
export declare namespace IMedianOracle {
  type PriceDataStruct = {
    price: BigNumberish;
    updatedAt: BigNumberish;
    decimals: BigNumberish;
    degraded: boolean;
  };
  type PriceDataStructOutput = [price: bigint, updatedAt: bigint, decimals: bigint, degraded: boolean] & {
    price: bigint;
    updatedAt: bigint;
    decimals: bigint;
    degraded: boolean;
  };
}
export interface IMedianOracleInterface extends Interface {
  getFunction(nameOrSignature: "getPrice" | "getPriceData" | "hasPrice"): FunctionFragment;
  encodeFunctionData(functionFragment: "getPrice", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "getPriceData", values: [BytesLike]): string;
  encodeFunctionData(functionFragment: "hasPrice", values: [BytesLike]): string;
  decodeFunctionResult(functionFragment: "getPrice", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPriceData", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "hasPrice", data: BytesLike): Result;
}
export interface IMedianOracle extends BaseContract {
  connect(runner?: ContractRunner | null): IMedianOracle;
  waitForDeployment(): Promise<this>;
  interface: IMedianOracleInterface;
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
  getPrice: TypedContractMethod<
    [assetId: BytesLike],
    [
      [bigint, bigint, bigint, boolean] & {
        price: bigint;
        updatedAt: bigint;
        decimals: bigint;
        degraded: boolean;
      },
    ],
    "view"
  >;
  getPriceData: TypedContractMethod<[assetId: BytesLike], [IMedianOracle.PriceDataStructOutput], "view">;
  hasPrice: TypedContractMethod<[assetId: BytesLike], [boolean], "view">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "getPrice"): TypedContractMethod<
    [assetId: BytesLike],
    [
      [bigint, bigint, bigint, boolean] & {
        price: bigint;
        updatedAt: bigint;
        decimals: bigint;
        degraded: boolean;
      },
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "getPriceData"
  ): TypedContractMethod<[assetId: BytesLike], [IMedianOracle.PriceDataStructOutput], "view">;
  getFunction(nameOrSignature: "hasPrice"): TypedContractMethod<[assetId: BytesLike], [boolean], "view">;
  filters: {};
}
//# sourceMappingURL=IMedianOracle.d.ts.map
