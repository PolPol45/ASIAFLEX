"use strict";
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const price_feeder_main_1 = require("../../scripts/ops/price-feeder-main");
const addresses_1 = require("../../scripts/helpers/addresses");
class NullProvider {
  constructor(name) {
    this.name = name;
  }
  async get() {
    return null;
  }
}
class FixedProvider {
  constructor(name, sample) {
    this.name = name;
    this.sample = sample;
  }
  async get() {
    return this.sample;
  }
}
describe("price feeder integration", () => {
  it("updates MedianOracle using fallback provider", async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const OracleFactory = await hardhat_1.ethers.getContractFactory("MedianOracle");
    const oracle = await OracleFactory.deploy(deployer.address);
    await oracle.waitForDeployment();
    await (await oracle.setUpdater(deployer.address, true)).wait();
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "feeder-"));
    const addressesPath = path_1.default.join(tmpDir, "addresses.json");
    (0, addresses_1.saveAddress)("hardhat", "MedianOracle", await oracle.getAddress(), addressesPath);
    const priceSample = {
      symbol: "EURUSD",
      value: hardhat_1.ethers.parseUnits("1.2345", 6),
      decimals: 6,
      ts: Math.floor(Date.now() / 1000),
    };
    const summary = await (0, price_feeder_main_1.runFeeder)({
      network: "hardhat",
      addressesPath,
      symbols: ["EURUSD"],
      commit: true,
      overrideProviders: {
        "exchange-rate": new NullProvider("exchange-rate"),
        stooq: new FixedProvider("stooq", priceSample),
      },
    });
    (0, chai_1.expect)(summary.updated).to.equal(1);
    (0, chai_1.expect)(summary.degraded).to.equal(1);
    const assetId = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("EURUSD"));
    const priceData = await oracle.getPrice(assetId);
    const expected = hardhat_1.ethers.parseUnits("1.2345", 18);
    (0, chai_1.expect)(priceData[0]).to.equal(expected);
    fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
  });
});
