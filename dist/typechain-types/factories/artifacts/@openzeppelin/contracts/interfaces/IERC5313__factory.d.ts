import { type ContractRunner } from "ethers";
import type { IERC5313, IERC5313Interface } from "../../../../../artifacts/@openzeppelin/contracts/interfaces/IERC5313";
export declare class IERC5313__factory {
  static readonly abi: readonly [
    {
      readonly inputs: readonly [];
      readonly name: "owner";
      readonly outputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
  ];
  static createInterface(): IERC5313Interface;
  static connect(address: string, runner?: ContractRunner | null): IERC5313;
}
//# sourceMappingURL=IERC5313__factory.d.ts.map
