import { expect } from "chai";
import { ethers } from "hardhat";
import fs from "fs";
import os from "os";
import path from "path";
import { runFeeder } from "../../scripts/ops/price-feeder-main";
import type { PriceSample, Provider } from "../../scripts/ops/providers/Provider";
import { saveAddress } from "../../scripts/helpers/addresses";

class NullProvider implements Provider {
  constructor(public readonly name: string) {}
  async get(): Promise<PriceSample | null> {
    return null;
  }
}

class FixedProvider implements Provider {
  constructor(
    public readonly name: string,
    private readonly sample: PriceSample
  ) {}
  async get(): Promise<PriceSample | null> {
    return this.sample;
  }
}

describe("price feeder integration", () => {
  it("updates MedianOracle using fallback provider", async () => {
    const [deployer] = await ethers.getSigners();
    const OracleFactory = await ethers.getContractFactory("MedianOracle");
    const oracle = await OracleFactory.deploy(deployer.address);
    await oracle.waitForDeployment();
    await (await oracle.setUpdater(deployer.address, true)).wait();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "feeder-"));
    const addressesPath = path.join(tmpDir, "addresses.json");
    saveAddress("hardhat", "MedianOracle", await oracle.getAddress(), addressesPath);

    const priceSample: PriceSample = {
      symbol: "EURUSD",
      value: ethers.parseUnits("1.2345", 6),
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };

    const summary = await runFeeder({
      network: "hardhat",
      addressesPath,
      symbols: ["EURUSD"],
      commit: true,
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new FixedProvider("stooq", priceSample),
      },
    });

    expect(summary.updated).to.equal(1);
    expect(summary.degraded).to.equal(1);

    const assetId = ethers.keccak256(ethers.toUtf8Bytes("EURUSD"));
    const priceData = await oracle.getPrice(assetId);
    const expected = ethers.parseUnits("1.2345", 18);
    expect(priceData[0]).to.equal(expected);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clamps future timestamps and enforces monotonicity", async () => {
    const [deployer] = await ethers.getSigners();
    const OracleFactory = await ethers.getContractFactory("MedianOracle");
    const oracle = await OracleFactory.deploy(deployer.address);
    await oracle.waitForDeployment();
    await (await oracle.setUpdater(deployer.address, true)).wait();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "feeder-"));
    const addressesPath = path.join(tmpDir, "addresses.json");
    saveAddress("hardhat", "MedianOracle", await oracle.getAddress(), addressesPath);

    const futureTs = Math.floor(Date.now() / 1000) + 3600;
    const initialSample: PriceSample = {
      symbol: "EURUSD",
      value: ethers.parseUnits("1.1000", 6),
      decimals: 6,
      ts: futureTs,
    };

    await runFeeder({
      network: "hardhat",
      addressesPath,
      symbols: ["EURUSD"],
      commit: true,
      overrideProviders: {
        stooq: new FixedProvider("stooq", initialSample),
      },
    });

    const assetId = ethers.keccak256(ethers.toUtf8Bytes("EURUSD"));
    const firstPrice = await oracle.getPrice(assetId);
    const firstTimestamp = Number(firstPrice[1]);
    const latestBlockAfterFirst = await ethers.provider.getBlock("latest");
    expect(firstTimestamp).to.be.at.most(Number(latestBlockAfterFirst!.timestamp));

    const staleSample: PriceSample = {
      symbol: "EURUSD",
      value: ethers.parseUnits("1.1200", 6),
      decimals: 6,
      ts: firstTimestamp - 100,
    };

    await runFeeder({
      network: "hardhat",
      addressesPath,
      symbols: ["EURUSD"],
      commit: true,
      overrideProviders: {
        stooq: new FixedProvider("stooq", staleSample),
      },
    });

    const secondPrice = await oracle.getPrice(assetId);
    const secondTimestamp = Number(secondPrice[1]);
    expect(secondTimestamp).to.equal(firstTimestamp + 1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("supports forced timestamp with advance-time helper", async () => {
    const [deployer] = await ethers.getSigners();
    const OracleFactory = await ethers.getContractFactory("MedianOracle");
    const oracle = await OracleFactory.deploy(deployer.address);
    await oracle.waitForDeployment();
    await (await oracle.setUpdater(deployer.address, true)).wait();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "feeder-"));
    const addressesPath = path.join(tmpDir, "addresses.json");
    saveAddress("hardhat", "MedianOracle", await oracle.getAddress(), addressesPath);

    const blockBefore = await ethers.provider.getBlock("latest");
    const baseTs = Number(blockBefore!.timestamp);

    const sample: PriceSample = {
      symbol: "USDJPY",
      value: ethers.parseUnits("150.1234", 6),
      decimals: 6,
      ts: baseTs - 500,
    };

    await runFeeder({
      network: "hardhat",
      addressesPath,
      symbols: ["USDJPY"],
      commit: true,
      forceTimestamp: "now",
      advanceTime: true,
      overrideProviders: {
        stooq: new FixedProvider("stooq", sample),
      },
    });

    const assetId = ethers.keccak256(ethers.toUtf8Bytes("USDJPY"));
    const priceData = await oracle.getPrice(assetId);
    const storedTimestamp = Number(priceData[1]);
    const latestBlock = await ethers.provider.getBlock("latest");
    expect(storedTimestamp).to.equal(Number(latestBlock!.timestamp));

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
