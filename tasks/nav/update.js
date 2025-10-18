"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const price_feeder_main_1 = require("../../scripts/ops/price-feeder-main");
(0, config_1.task)("nav:update", "Update MedianOracle prices via price feeder")
  .addOptionalParam("symbols", "Comma separated list of basket asset identifiers", "")
  .addOptionalParam("addresses", "Override path for deployment addresses", "")
  .addFlag("commit", "Submit the transaction (omit for dry-run)")
  .setAction(async ({ symbols, addresses, commit }, hre) => {
    const symbolList = symbols
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const options = {
      network: hre.network.name,
      addressesPath: addresses ? addresses : undefined,
      symbols: symbolList.length > 0 ? symbolList : undefined,
      commit: Boolean(commit),
    };
    console.log(`🔄 Running price feeder on network ${options.network} (${options.commit ? "commit" : "dry-run"})`);
    if (options.symbols) {
      console.log(`   Symbols: ${options.symbols.join(", ")}`);
    }
    const summary = await (0, price_feeder_main_1.runFeeder)(options);
    console.log(`✅ ${summary.updated}/${summary.total} assets updated${summary.dryRun ? " (dry-run)" : ""}`);
  });
