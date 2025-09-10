import { task } from "hardhat/config";

task("nav:update", "Updates NAV oracle data")
  .addOptionalParam("oracle", "Oracle contract address", "")
  .setAction(async (taskArgs, hre) => {
    console.log("NAV update task - to be implemented");
  });

export {};
