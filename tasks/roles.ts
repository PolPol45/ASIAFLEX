import { task } from "hardhat/config";

task("roles", "Displays role information for AsiaFlex contracts")
  .addOptionalParam("contract", "Contract address", "")
  .setAction(async (taskArgs, hre) => {
    console.log("Role management task - to be implemented");
  });

export {};