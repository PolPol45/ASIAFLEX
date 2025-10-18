import { task, types } from "hardhat/config";
import { TASK_RUN } from "hardhat/builtin-tasks/task-names";

task(TASK_RUN)
  .addOptionalParam("symbols", "Comma separated list of price symbols", undefined, types.string)
  .addOptionalParam("addresses", "Unified deployment addresses path", undefined, types.string)
  .addFlag("commit", "Forward commit flag to scripts")
  .setAction(async ({ symbols, addresses, commit, ...rest }, hre, runSuper) => {
    if (symbols) {
      process.env.FEEDER_SYMBOLS = symbols as string;
    } else {
      delete process.env.FEEDER_SYMBOLS;
    }

    if (addresses) {
      process.env.FEEDER_ADDRESSES = addresses as string;
    } else {
      delete process.env.FEEDER_ADDRESSES;
    }

    if (commit) {
      process.env.FEEDER_COMMIT_FLAG = "1";
    } else {
      delete process.env.FEEDER_COMMIT_FLAG;
    }

    return runSuper(rest);
  });
