import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MockMedianOracle__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockMedianOracle__factory";
import { MockERC20__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockERC20__factory";
import { BasketManager__factory } from "../../typechain-types/factories/artifacts/contracts/baskets/BasketManager__factory";
import { BasketToken__factory } from "../../typechain-types/factories/artifacts/contracts/baskets/BasketToken__factory";
import type { MockMedianOracle } from "../../typechain-types/artifacts/contracts/mocks/MockMedianOracle";
import type { MockERC20 } from "../../typechain-types/artifacts/contracts/mocks/MockERC20";
import type { BasketManager } from "../../typechain-types/artifacts/contracts/baskets/BasketManager";
import type { BasketToken } from "../../typechain-types/artifacts/contracts/baskets/BasketToken";
import { main as runSetOraclePrices, PRICES } from "../../scripts/ops/set-oracle-prices";
import { main as runRegisterBaskets, ALLOCATIONS, DEFAULT_CONFIG } from "../../scripts/ops/register-baskets";
import { BASKETS, encodeAssetId, toWeightedAssets } from "../../scripts/ops/basket-helpers";

const setEnv = (buffer: string[], key: string, value: string): void => {
  buffer.push(key);
  process.env[key] = value;
};

describe("Ops scripts end-to-end", function () {
  this.timeout(120000);

  let admin: HardhatEthersSigner;
  let envKeys: string[];

  beforeEach(async function () {
    envKeys = [];
    await ethers.provider.send("hardhat_reset", []);
    [admin] = await ethers.getSigners();
  });

  afterEach(function () {
    for (const key of envKeys) {
      delete process.env[key];
    }
  });

  it("seeds oracle prices via the ops script", async function () {
    const oracleFactory = new MockMedianOracle__factory(admin);
    const oracle = await oracleFactory.deploy(admin.address);
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();

    setEnv(envKeys, "ORACLE", oracleAddress);

    await runSetOraclePrices();

    for (const [symbol, config] of Object.entries(PRICES)) {
      const assetId = encodeAssetId(symbol);
      const priceData = await oracle.getPriceData(assetId);
      const expectedDecimals = BigInt(config.decimals ?? 18);
      const expectedPrice = ethers.parseUnits(config.price.toString(), Number(expectedDecimals));

      expect(priceData.price).to.equal(expectedPrice);
      expect(priceData.decimals).to.equal(Number(expectedDecimals));
      expect(priceData.degraded).to.equal(false);
      expect(priceData.updatedAt).to.be.a("bigint");
      expect(priceData.updatedAt).to.be.greaterThan(0n);
    }
  });

  it("registers all baskets via the ops script", async function () {
    const baseAssetFactory = new MockERC20__factory(admin);
    const baseAsset: MockERC20 = await baseAssetFactory.deploy("Mock USD", "mUSD");
    await baseAsset.waitForDeployment();

    const oracleFactory = new MockMedianOracle__factory(admin);
    const oracle: MockMedianOracle = await oracleFactory.deploy(admin.address);
    await oracle.waitForDeployment();

    const managerFactory = new BasketManager__factory(admin);
    const manager: BasketManager = await managerFactory.deploy(
      admin.address,
      0,
      await baseAsset.getAddress(),
      await oracle.getAddress()
    );
    await manager.waitForDeployment();

    const managerAddress = await manager.getAddress();
    setEnv(envKeys, "BASKET_MANAGER", managerAddress);
    const oracleAddress = await oracle.getAddress();
    setEnv(envKeys, "ORACLE", oracleAddress);

    const tokenFactory = new BasketToken__factory(admin);
    const tokenAddresses: Record<string, string> = {};

    for (const basket of BASKETS) {
      const token: BasketToken = await tokenFactory.deploy(`${basket.label} Token`, basket.key, managerAddress);
      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();
      tokenAddresses[basket.key] = tokenAddress;
      setEnv(envKeys, basket.tokenEnv, tokenAddress);
    }

    await runSetOraclePrices();
    await runRegisterBaskets();

    for (const basket of BASKETS) {
      const basketId = await manager.basketId(basket.region, basket.strategy);
      const state = await manager.basketState(basketId);
      expect(state.token).to.equal(tokenAddresses[basket.key]);

      const onChainConfig = await manager.basketConfig(basketId);
      expect(onChainConfig.stalenessThreshold).to.equal(DEFAULT_CONFIG.stalenessThreshold);
      expect(onChainConfig.rebalanceInterval).to.equal(DEFAULT_CONFIG.rebalanceInterval);

      const expectedAssets = toWeightedAssets(ALLOCATIONS[basket.key]);
      const onChainAssets = await manager.basketAllocations(basketId);
      expect(onChainAssets.length).to.equal(expectedAssets.length);

      for (let i = 0; i < expectedAssets.length; i += 1) {
        const expected = expectedAssets[i];
        const actual = onChainAssets[i];
        expect(actual.assetId).to.equal(expected.assetId);
        expect(actual.weightBps).to.equal(expected.weightBps);
        expect(actual.isBond).to.equal(expected.isBond);
        expect(actual.accrualBps).to.equal(expected.accrualBps);
      }
    }

    // Re-run to exercise the update path
    await runRegisterBaskets();
  });
});
