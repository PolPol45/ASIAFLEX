import { expect } from "chai";
import { runFeeder } from "../../scripts/ops/price-feeder-main";
import type { PriceSample, Provider } from "../../scripts/ops/providers/Provider";

class NullProvider implements Provider {
  constructor(public readonly name: string) {}
  async get(): Promise<PriceSample | null> {
    return null;
  }
}

class StaticProvider implements Provider {
  constructor(
    public readonly name: string,
    private readonly sample: PriceSample
  ) {}
  async get(): Promise<PriceSample | null> {
    return this.sample;
  }
}

describe("Provider fallbacks", () => {
  it("falls back to secondary provider when primary has no data", async () => {
    const sample: PriceSample = {
      symbol: "EURUSD",
      value: 123_456n,
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };

    const summary = await runFeeder({
      network: "hardhat",
      commit: false,
      symbols: ["EURUSD"],
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new StaticProvider("stooq", sample),
      },
    });

    expect(summary.updated).to.equal(1);
    expect(summary.degraded).to.equal(1);
    expect(summary.skipped).to.equal(0);
  });

  it("skips symbol when all providers return null", async () => {
    const summary = await runFeeder({
      network: "hardhat",
      commit: false,
      symbols: ["USDJPY"],
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new NullProvider("stooq"),
      },
    });

    expect(summary.updated).to.equal(0);
    expect(summary.skipped).to.equal(1);
  });
});
