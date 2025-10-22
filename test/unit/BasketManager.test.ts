import { expect } from "chai";
import { ethers } from "hardhat";
import type { BasketManager, BasketToken, MockERC20, MockMedianOracle } from "../../typechain-types";

const { ZeroHash } = ethers;

describe("BasketManager", function () {
  let admin: string;
  let treasury: string;
  let user: string;
  let baseAsset: MockERC20;
  let oracle: MockMedianOracle;
  let manager: BasketManager;
  let basketToken: BasketToken;

  const ASSET_EURUSD = ethers.id("EURUSD");
  const ASSET_GBPUSD = ethers.id("GBPUSD");

  const DEFAULT_CONFIG = {
    stalenessThreshold: 3600n,
    rebalanceInterval: 86_400n,
  } as const;

  beforeEach(async function () {
    const [deployer, treasurySigner, userSigner] = await ethers.getSigners();
    admin = deployer.address;
    treasury = treasurySigner.address;
    user = userSigner.address;

    baseAsset = await ethers.deployContract("MockERC20", ["USD Stable", "USDS"]);
    await baseAsset.mint(user, ethers.parseEther("1000"));

    oracle = await ethers.deployContract("MockMedianOracle");

    manager = await ethers.deployContract("BasketManager", [
      admin,
      0,
      await baseAsset.getAddress(),
      await oracle.getAddress(),
    ]);

    basketToken = await ethers.deployContract("BasketToken", ["EU FX Basket", "EUFX", await manager.getAddress()]);

    // grant treasury role for completeness
    await manager.grantRole(await manager.TREASURY_ROLE(), treasury);

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    await oracle.setPrice(ASSET_EURUSD, ethers.parseEther("1.00"), now, 18, false);
    await oracle.setPrice(ASSET_GBPUSD, ethers.parseEther("1.10"), now, 18, false);
  });

  async function registerDefaultBasket() {
    const assets = [
      { assetId: ASSET_EURUSD, weightBps: 6000, isBond: false, accrualBps: 0 },
      { assetId: ASSET_GBPUSD, weightBps: 4000, isBond: false, accrualBps: 0 },
    ];

    await manager.registerBasket(0, 0, basketToken, assets, DEFAULT_CONFIG);

    return assets;
  }

  it("registers a basket and stores allocation", async function () {
    const assets = await registerDefaultBasket();
    const id = await manager.basketId(0, 0);
    const stored = await manager.basketAllocations(id);

    expect(stored).to.have.lengthOf(assets.length);
    for (let i = 0; i < assets.length; i++) {
      expect(stored[i].assetId).to.equal(assets[i].assetId);
      expect(stored[i].weightBps).to.equal(assets[i].weightBps);
    }

    const state = await manager.basketState(id);
    expect(state.token).to.equal(await basketToken.getAddress());
    expect(state.nav).to.equal(0n);
  });

  it("mints basket tokens using base asset deposits", async function () {
    await registerDefaultBasket();
    const id = await manager.basketId(0, 0);

    const baseAmount = ethers.parseEther("100");
    await baseAsset.connect(await ethers.getSigner(user)).approve(await manager.getAddress(), baseAmount);

    await expect(manager.connect(await ethers.getSigner(user)).mint(0, 0, baseAmount, 0n, user, ZeroHash)).to.emit(
      manager,
      "MintExecuted"
    );

    const minted = await basketToken.balanceOf(user);
    expect(minted).to.be.greaterThan(0n);
    const nav = (await manager.basketState(id)).nav;
    expect(nav).to.be.greaterThan(0n);

    const contractBalance = await baseAsset.balanceOf(await manager.getAddress());
    expect(contractBalance).to.equal(baseAmount);
  });

  it("redeems basket tokens back into base asset", async function () {
    await registerDefaultBasket();
    const id = await manager.basketId(0, 0);

    const baseAmount = ethers.parseEther("250");
    await baseAsset.connect(await ethers.getSigner(user)).approve(await manager.getAddress(), baseAmount);
    await manager.connect(await ethers.getSigner(user)).mint(0, 0, baseAmount, 0n, user, ZeroHash);

    const minted = await basketToken.balanceOf(user);

    const balanceBefore = await baseAsset.balanceOf(user);
    const tx = await manager.connect(await ethers.getSigner(user)).redeem(0, 0, minted, 0n, user);
    await expect(tx).to.emit(manager, "RedeemExecuted");

    const balanceAfter = await baseAsset.balanceOf(user);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);

    const state = await manager.basketState(id);
    expect(state.nav).to.be.greaterThan(0n);
    expect(await basketToken.balanceOf(user)).to.equal(0n);
  });

  it("reports proof-of-reserve health", async function () {
    await registerDefaultBasket();
    const id = await manager.basketId(0, 0);

    const baseAmount = ethers.parseEther("50");
    await baseAsset.connect(await ethers.getSigner(user)).approve(await manager.getAddress(), baseAmount);
    await manager.connect(await ethers.getSigner(user)).mint(0, 0, baseAmount, 0n, user, ZeroHash);

    const proof = await manager.proofOfReserves(id);
    expect(proof.isHealthy).to.equal(true);
    expect(proof.backing).to.equal(baseAmount);
    expect(proof.requiredBacking).to.be.greaterThan(0n);
  });

  it("rejects allocations that do not sum to 100%", async function () {
    const assets = [{ assetId: ASSET_EURUSD, weightBps: 5000, isBond: false, accrualBps: 0 }];

    await expect(manager.registerBasket(0, 0, basketToken, assets, DEFAULT_CONFIG)).to.be.revertedWithCustomError(
      manager,
      "InvalidWeightsSum"
    );
  });
});
