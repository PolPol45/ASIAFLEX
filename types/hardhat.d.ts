import "hardhat/types/runtime";
import type * as EthersT from "ethers";
import type { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    ethers: typeof EthersT & HardhatEthersHelpers;
  }
}
