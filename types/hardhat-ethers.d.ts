import "hardhat/types/runtime";
import type { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";

type EthersStatic = typeof import("ethers");

declare module "@nomicfoundation/hardhat-ethers/types" {
  interface HardhatEthersHelpers extends EthersStatic {}
}

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    ethers: HardhatEthersHelpers;
  }
}
