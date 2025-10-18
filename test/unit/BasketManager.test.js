"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketE2E_fixture_1 = require("../fixtures/BasketE2E.fixture");
const quote_1 = require("../helpers/quote");
describe("BasketManager", () => {
  it("quotes, mints, and burns basket shares based on NAV", async () => {
    const { manager, controller, basketToken, basketId, seedFreshNAV } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketE2E_fixture_1.deployBasketE2EFixture);
    const nav = (0, quote_1.toWei)("1.25");
    await seedFreshNAV("EUFX", nav);
    const notional = (0, quote_1.toWei)("1000");
    const expectedShares = (0, quote_1.quoteShares)(notional, nav);
    const quotedShares = await manager.quoteMint(basketId, notional);
    (0, chai_1.expect)(quotedShares).to.equal(expectedShares);
    await (await manager.connect(controller).mintBasket(basketId, controller.address, quotedShares)).wait();
    (0, chai_1.expect)(await basketToken.totalSupply()).to.equal(quotedShares);
    (0, chai_1.expect)(await basketToken.balanceOf(controller.address)).to.equal(quotedShares);
    await (await manager.connect(controller).burnBasket(basketId, controller.address, quotedShares / 2n)).wait();
    (0, chai_1.expect)(await basketToken.totalSupply()).to.equal(quotedShares / 2n);
    (0, chai_1.expect)(await basketToken.balanceOf(controller.address)).to.equal(quotedShares / 2n);
  });
  it("enforces daily mint cap and resets on new day", async () => {
    const { manager, controller, basketId, seedFreshNAV } = await (0, hardhat_network_helpers_1.loadFixture)(
      BasketE2E_fixture_1.deployBasketE2EFixture
    );
    await seedFreshNAV("EUFX", (0, quote_1.toWei)("1"));
    const limits = await manager.getBasketLimits(basketId);
    (0, chai_1.expect)(limits.dailyMintCap).to.be.greaterThan(0n);
    await (await manager.connect(controller).mintBasket(basketId, controller.address, limits.dailyMintCap)).wait();
    await (0, chai_1.expect)(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "DailyMintCapExceeded");
    await hardhat_network_helpers_1.time.increase(24 * 60 * 60 + 10);
    await (await manager.connect(controller).mintBasket(basketId, controller.address, 1n)).wait();
  });
  it("tracks net inflow caps across mint and burn", async () => {
    const { manager, controller, basketId, seedFreshNAV, setBasketLimits } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketE2E_fixture_1.deployBasketE2EFixture);
    await seedFreshNAV("EUFX", (0, quote_1.toWei)("1"));
    const limits = await manager.getBasketLimits(basketId);
    await setBasketLimits({
      dailyMintCap: limits.dailyNetInflowCap * 2n,
      dailyNetInflowCap: limits.dailyNetInflowCap,
      totalCap: limits.totalCap,
    });
    const updatedLimits = await manager.getBasketLimits(basketId);
    const halfCap = updatedLimits.dailyNetInflowCap / 2n;
    await (await manager.connect(controller).mintBasket(basketId, controller.address, halfCap)).wait();
    await (await manager.connect(controller).mintBasket(basketId, controller.address, halfCap)).wait();
    await (0, chai_1.expect)(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "DailyNetInflowExceeded");
    await (await manager.connect(controller).burnBasket(basketId, controller.address, halfCap)).wait();
    await (await manager.connect(controller).mintBasket(basketId, controller.address, halfCap)).wait();
  });
});
