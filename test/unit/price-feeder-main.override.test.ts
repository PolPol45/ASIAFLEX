import { expect } from "chai";
import { ethers } from "hardhat";
import { runFeeder } from "../../scripts/ops/price-feeder-main";
import type { PriceSample, Provider } from "../../scripts/ops/providers/Provider";

class NullProvider implements Provider {
  public readonly name: string;
  public calls = 0;

  constructor(name: string) {
    this.name = name;
  }

  async get(): Promise<PriceSample | null> {
    this.calls += 1;
    return null;
  }
}

class FixedProvider implements Provider {
  public readonly name: string;
  public calls = 0;

  constructor(
    name: string,
    private readonly sample: PriceSample
  ) {
    this.name = name;
  }

  async get(): Promise<PriceSample | null> {
    this.calls += 1;
    return this.sample;
  }
}

describe("price feeder override providers", () => {
  it("falls back to override provider and marks sample as degraded", async () => {
    const fallbackSample: PriceSample = {
      symbol: "EURUSD",
      value: ethers.parseUnits("1.2345", 6),
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };

    const primary = new NullProvider("stooq");
    const fallback = new FixedProvider("exchange-rate", fallbackSample);

    const summary = await runFeeder({
      network: "hardhat",
      symbols: ["EURUSD"],
      commit: false,
      overrideProviders: {
        stooq: primary,
        "exchange-rate": fallback,
      },
    });

    expect(primary.calls).to.equal(1);
    expect(fallback.calls).to.equal(1);
    expect(summary.updated).to.equal(1);
    expect(summary.degraded).to.equal(1);
    expect(summary.skipped).to.equal(0);
    expect(summary.dryRun).to.equal(true);
  });
});
