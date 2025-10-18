"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const price_feeder_main_1 = require("../../scripts/ops/price-feeder-main");
class NullProvider {
  constructor(name) {
    this.calls = 0;
    this.name = name;
  }
  async get() {
    this.calls += 1;
    return null;
  }
}
class FixedProvider {
  constructor(name, sample) {
    this.sample = sample;
    this.calls = 0;
    this.name = name;
  }
  async get() {
    this.calls += 1;
    return this.sample;
  }
}
describe("price feeder override providers", () => {
  it("falls back to override provider and marks sample as degraded", async () => {
    const fallbackSample = {
      symbol: "EURUSD",
      value: hardhat_1.ethers.parseUnits("1.2345", 6),
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };
    const primary = new NullProvider("stooq");
    const fallback = new FixedProvider("exchange-rate", fallbackSample);
    const summary = await (0, price_feeder_main_1.runFeeder)({
      network: "hardhat",
      symbols: ["EURUSD"],
      commit: false,
      overrideProviders: {
        stooq: primary,
        "exchange-rate": fallback,
      },
    });
    (0, chai_1.expect)(primary.calls).to.equal(1);
    (0, chai_1.expect)(fallback.calls).to.equal(1);
    (0, chai_1.expect)(summary.updated).to.equal(1);
    (0, chai_1.expect)(summary.degraded).to.equal(1);
    (0, chai_1.expect)(summary.skipped).to.equal(0);
    (0, chai_1.expect)(summary.dryRun).to.equal(true);
  });
});
