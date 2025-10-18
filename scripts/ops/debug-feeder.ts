import hre from "hardhat";
import { runFeeder } from "./price-feeder-main";

async function main() {
  const originalGetContractAt = hre.ethers.getContractAt.bind(hre.ethers);
  hre.ethers.getContractAt = (async (...args: Parameters<typeof originalGetContractAt>) => {
    const contract = await originalGetContractAt(...args);
    if (args[0] === "MedianOracle") {
      const originalUpdate = contract.updatePrice.bind(contract);
      contract.updatePrice = (async (...updateArgs: Parameters<typeof originalUpdate>) => {
        console.log(
          "updatePrice call:",
          updateArgs.map((value) => value.toString?.() ?? value)
        );
        return originalUpdate(...updateArgs);
      }) as typeof contract.updatePrice;
    }
    return contract;
  }) as typeof hre.ethers.getContractAt;

  const originalGetBlock = hre.ethers.provider.getBlock.bind(hre.ethers.provider);
  hre.ethers.provider.getBlock = (async (...args: Parameters<typeof originalGetBlock>) => {
    const block = await originalGetBlock(...args);
    if (block) {
      console.log("getBlock", block.number, Number(block.timestamp));
    }
    return block;
  }) as typeof hre.ethers.provider.getBlock;

  try {
    const summary = await runFeeder({
      network: process.env.HARDHAT_NETWORK || "localhost",
      addressesPath: process.env.FEEDER_ADDRESSES,
      symbols: process.env.FEEDER_SYMBOLS
        ? process.env.FEEDER_SYMBOLS.split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined,
      commit: true,
    });
    console.log(summary);
  } catch (error) {
    console.error("Feeder error", error);
    if (typeof error === "object" && error && "error" in error) {
      console.error("Nested error:", (error as { error?: unknown }).error);
    }
    if (typeof error === "object" && error && "data" in error) {
      console.error("Error data:", (error as { data?: unknown }).data);
    }
  }
}

main().catch((error) => {
  console.error("Unexpected failure", error);
  process.exitCode = 1;
});
