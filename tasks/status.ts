import { task } from "hardhat/config";

task("status", "Displays status information for AsiaFlex contracts")
  .addOptionalParam("contract", "Contract address", "")
  .setAction(async (taskArgs, hre) => {
    console.log("Status check task - to be implemented");
  });

export {};