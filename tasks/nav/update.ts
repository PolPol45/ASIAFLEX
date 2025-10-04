import { task } from "hardhat/config";
import { runFeeder } from "../../scripts/ops/price-feeder-main";

task("nav:update", "Update MedianOracle prices via price feeder")
  .addOptionalParam("symbols", "Comma separated list of basket asset identifiers", "")
  .addOptionalParam("addresses", "Override path for deployment addresses", "")
  .addFlag("commit", "Submit the transaction (omit for dry-run)")
  .setAction(async ({ symbols, addresses, commit }, hre) => {
    const symbolList = (symbols as string)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const options = {
      network: hre.network.name,
      addressesPath: addresses ? (addresses as string) : undefined,
      symbols: symbolList.length > 0 ? symbolList : undefined,
      commit: Boolean(commit),
    };

    console.log(`🔄 Running price feeder on network ${options.network} (${options.commit ? "commit" : "dry-run"})`);
    if (options.symbols) {
      console.log(`   Symbols: ${options.symbols.join(", ")}`);
    }

    const summary = await runFeeder(options);
    console.log(`✅ ${summary.updated}/${summary.total} assets updated${summary.dryRun ? " (dry-run)" : ""}`);
  });

export {};
