import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { BasketManager, BasketToken, MockERC20, MockMedianOracle } from "../../typechain-types";

const { ZeroHash, MaxUint256 } = ethers;

const REGION = { EU: 0, ASIA: 1, EURO_ASIA: 2 } as const;
const STRATEGY = { FX: 0, BOND: 1, MIX: 2 } as const;

const ASSET_EURUSD = ethers.id("EURUSD");
const ASSET_GBPUSD = ethers.id("GBPUSD");
const ASSET_JPYUSD = ethers.id("JPYUSD");
const ASSET_SGDUSD = ethers.id("SGDUSD");
const ASSET_EU_BOND = ethers.id("EU_GOV_BOND");
const ASSET_EU_CORP = ethers.id("EU_CORP_BOND");
const ASSET_ASIA_BOND = ethers.id("ASIA_GOV_BOND");
const ASSET_ASIA_INFRA = ethers.id("ASIA_INFRA");
const ASSET_CN_EQ = ethers.id("CN_EQUITY");
const ASSET_IN_EQ = ethers.id("IN_EQUITY");

const ORACLE_PRICES: Record<string, string> = {
  [ASSET_EURUSD]: "1.00",
  [ASSET_GBPUSD]: "1.08",
  [ASSET_JPYUSD]: "0.009",
  [ASSET_SGDUSD]: "0.74",
  [ASSET_EU_BOND]: "1.02",
  [ASSET_EU_CORP]: "1.01",
  [ASSET_ASIA_BOND]: "1.01",
  [ASSET_ASIA_INFRA]: "1.04",
  [ASSET_CN_EQ]: "1.25",
  [ASSET_IN_EQ]: "1.18",
};

const DEFAULT_CONFIG = {
  stalenessThreshold: 3_600n,
  rebalanceInterval: 86_400n,
} as const;

type AssetAllocation = {
  readonly assetId: string;
  readonly weightBps: number;
  readonly isBond: boolean;
  readonly accrualBps: number;
};

type BasketDefinition = {
  name: string;
  symbol: string;
  region: number;
  strategy: number;
  assets: AssetAllocation[];
  token?: BasketToken;
};

const BASKET_BLUEPRINTS: Omit<BasketDefinition, "token">[] = [
  {
    name: "AsiaFlex Euro FX Basket",
    symbol: "EUFX",
    region: REGION.EU,
    strategy: STRATEGY.FX,
    assets: [
      { assetId: ASSET_EURUSD, weightBps: 6000, isBond: false, accrualBps: 0 },
      { assetId: ASSET_GBPUSD, weightBps: 4000, isBond: false, accrualBps: 0 },
    ],
  },
  {
    name: "AsiaFlex Asia FX Basket",
    symbol: "ASFX",
    region: REGION.ASIA,
    strategy: STRATEGY.FX,
    assets: [
      { assetId: ASSET_JPYUSD, weightBps: 5500, isBond: false, accrualBps: 0 },
      { assetId: ASSET_SGDUSD, weightBps: 4500, isBond: false, accrualBps: 0 },
    ],
  },
  {
    name: "AsiaFlex Euro Bond Basket",
    symbol: "EUBOND",
    region: REGION.EU,
    strategy: STRATEGY.BOND,
    assets: [
      { assetId: ASSET_EU_BOND, weightBps: 7000, isBond: true, accrualBps: 50 },
      { assetId: ASSET_EU_CORP, weightBps: 3000, isBond: true, accrualBps: 35 },
    ],
  },
  {
    name: "AsiaFlex Asia Bond Basket",
    symbol: "ASBOND",
    region: REGION.ASIA,
    strategy: STRATEGY.BOND,
    assets: [
      { assetId: ASSET_ASIA_BOND, weightBps: 6500, isBond: true, accrualBps: 40 },
      { assetId: ASSET_ASIA_INFRA, weightBps: 3500, isBond: true, accrualBps: 45 },
    ],
  },
  {
    name: "AsiaFlex Euro-Asia Strategic Basket",
    symbol: "EUAS",
    region: REGION.EURO_ASIA,
    strategy: STRATEGY.MIX,
    assets: [
      { assetId: ASSET_CN_EQ, weightBps: 5000, isBond: false, accrualBps: 0 },
      { assetId: ASSET_IN_EQ, weightBps: 5000, isBond: false, accrualBps: 0 },
    ],
  },
];

describe("BasketManager multi-basket flows", function () {
  this.timeout(120000);
  let adminSigner: HardhatEthersSigner;
  let treasurySigner: HardhatEthersSigner;
  let userSigner: HardhatEthersSigner;
  let recipientSigner: HardhatEthersSigner;
  let baseAsset: MockERC20;
  let oracle: MockMedianOracle;
  let manager: BasketManager;
  let baskets: BasketDefinition[];

  beforeEach(async function () {
    [adminSigner, treasurySigner, userSigner, recipientSigner] = await ethers.getSigners();

    baseAsset = await ethers.deployContract("MockERC20", ["USD Stable", "USDS"]);
    await baseAsset.mint(userSigner.address, ethers.parseEther("1000"));

    oracle = (await ethers.deployContract("MockMedianOracle", [adminSigner.address])) as unknown as MockMedianOracle;
    manager = await ethers.deployContract("BasketManager", [
      adminSigner.address,
      0,
      await baseAsset.getAddress(),
      await oracle.getAddress(),
    ]);

    await manager.grantRole(await manager.TREASURY_ROLE(), treasurySigner.address);

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    for (const [assetId, price] of Object.entries(ORACLE_PRICES)) {
      await oracle.setPrice(assetId as string, ethers.parseEther(price), now, 18, false);
    }

    baskets = BASKET_BLUEPRINTS.map((blueprint) => ({
      ...blueprint,
      assets: blueprint.assets.map((asset) => ({ ...asset })),
    }));

    const managerAddress = await manager.getAddress();
    for (const basket of baskets) {
      const token = await ethers.deployContract("BasketToken", [basket.name, basket.symbol, managerAddress]);
      basket.token = token;
      await manager.registerBasket(basket.region, basket.strategy, token, basket.assets, DEFAULT_CONFIG);
    }
  });

  it("deploys five baskets and executes mint, transfer, redeem, and burn flows", async function () {
    const managerAddress = await manager.getAddress();
    await baseAsset.connect(userSigner).approve(managerAddress, MaxUint256);

    for (const basket of baskets) {
      const token = basket.token!;
      const baseDeposit = ethers.parseEther("100");
      const userBaseBefore = await baseAsset.balanceOf(userSigner.address);
      const managerBalanceBefore = await baseAsset.balanceOf(managerAddress);

      await expect(
        manager.connect(userSigner).mint(basket.region, basket.strategy, baseDeposit, 0n, userSigner.address, ZeroHash)
      ).to.emit(manager, "MintExecuted");

      const minted = await token.balanceOf(userSigner.address);
      expect(minted).to.be.greaterThan(0n);

      const transferAmount = minted / 2n;
      expect(transferAmount).to.be.greaterThan(0n);

      await token.connect(userSigner).transfer(recipientSigner.address, transferAmount);
      expect(await token.balanceOf(recipientSigner.address)).to.equal(transferAmount);

      const recipientBaseBefore = await baseAsset.balanceOf(recipientSigner.address);
      await expect(
        manager
          .connect(recipientSigner)
          .redeem(basket.region, basket.strategy, transferAmount, 0n, recipientSigner.address)
      ).to.emit(manager, "RedeemExecuted");

      expect(await token.balanceOf(recipientSigner.address)).to.equal(0n);
      const recipientBaseAfter = await baseAsset.balanceOf(recipientSigner.address);
      expect(recipientBaseAfter).to.be.greaterThan(recipientBaseBefore);

      const remaining = await token.balanceOf(userSigner.address);
      expect(remaining).to.be.greaterThan(0n);

      await expect(
        manager.connect(userSigner).redeem(basket.region, basket.strategy, remaining, 0n, userSigner.address)
      ).to.emit(manager, "RedeemExecuted");

      expect(await token.balanceOf(userSigner.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);

      const managerBalanceAfter = await baseAsset.balanceOf(managerAddress);
      const delta = managerBalanceAfter - managerBalanceBefore;
      expect(delta).to.be.at.least(0n);
      expect(delta).to.be.lessThan(ethers.parseEther("1.1"));

      const userBaseAfter = await baseAsset.balanceOf(userSigner.address);
      expect(userBaseAfter).to.be.at.most(userBaseBefore);
    }
  });
});
