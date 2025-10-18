"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const price_feeder_main_1 = require("../../scripts/ops/price-feeder-main");
class NullProvider {
  constructor(name) {
    this.name = name;
  }
  async get() {
    return null;
  }
}
class StaticProvider {
  constructor(name, sample) {
    this.name = name;
    this.sample = sample;
  }
  async get() {
    return this.sample;
  }
}
describe("Provider fallbacks", () => {
  it("falls back to secondary provider when primary has no data", async () => {
    const sample = {
      symbol: "EURUSD",
      value: 123456n,
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };
    const summary = await (0, price_feeder_main_1.runFeeder)({
      network: "hardhat",
      commit: false,
      symbols: ["EURUSD"],
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new StaticProvider("stooq", sample),
      },
    });
    (0, chai_1.expect)(summary.updated).to.equal(1);
    (0, chai_1.expect)(summary.degraded).to.equal(1);
    (0, chai_1.expect)(summary.skipped).to.equal(0);
  });
  it("skips symbol when all providers return null", async () => {
    const summary = await (0, price_feeder_main_1.runFeeder)({
      network: "hardhat",
      commit: false,
      symbols: ["USDJPY"],
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new NullProvider("stooq"),
      },
    });
    (0, chai_1.expect)(summary.updated).to.equal(0);
    (0, chai_1.expect)(summary.skipped).to.equal(1);
  });
});
