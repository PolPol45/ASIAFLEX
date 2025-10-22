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
} from "../../common";
export interface ProofOfReserveInterface extends Interface {
  getFunction(nameOrSignature: "getReserve" | "owner" | "reserveUSD" | "setReserve"): FunctionFragment;
  encodeFunctionData(functionFragment: "getReserve", values?: undefined): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(functionFragment: "reserveUSD", values?: undefined): string;
  encodeFunctionData(functionFragment: "setReserve", values: [BigNumberish]): string;
  decodeFunctionResult(functionFragment: "getReserve", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "reserveUSD", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "setReserve", data: BytesLike): Result;
}
export interface ProofOfReserve extends BaseContract {
  connect(runner?: ContractRunner | null): ProofOfReserve;
  waitForDeployment(): Promise<this>;
  interface: ProofOfReserveInterface;
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
  getReserve: TypedContractMethod<[], [bigint], "view">;
  owner: TypedContractMethod<[], [string], "view">;
  reserveUSD: TypedContractMethod<[], [bigint], "view">;
  setReserve: TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;
  getFunction(nameOrSignature: "getReserve"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "owner"): TypedContractMethod<[], [string], "view">;
  getFunction(nameOrSignature: "reserveUSD"): TypedContractMethod<[], [bigint], "view">;
  getFunction(nameOrSignature: "setReserve"): TypedContractMethod<[amount: BigNumberish], [void], "nonpayable">;
  filters: {};
}
//# sourceMappingURL=ProofOfReserve.d.ts.map
