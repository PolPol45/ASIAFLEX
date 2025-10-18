"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketE2E_fixture_1 = require("../fixtures/BasketE2E.fixture");
const quote_1 = require("../helpers/quote");
describe("BasketManager limits", () => {
  it("allows governance to update basket limits", async () => {
    const { manager, admin, basketId } = await (0, hardhat_network_helpers_1.loadFixture)(
      BasketE2E_fixture_1.deployBasketE2EFixture
    );
    const newLimits = {
      dailyMintCap: (0, quote_1.toWei)("500000"),
      dailyNetInflowCap: (0, quote_1.toWei)("1000000"),
      totalCap: (0, quote_1.toWei)("2000000"),
    };
    await (0, chai_1.expect)(manager.connect(admin).setBasketLimits(basketId, newLimits)).to.emit(
      manager,
      "BasketLimitsUpdated"
    );
    const limits = await manager.getBasketLimits(basketId);
    (0, chai_1.expect)(limits.dailyMintCap).to.equal(newLimits.dailyMintCap);
    (0, chai_1.expect)(limits.dailyNetInflowCap).to.equal(newLimits.dailyNetInflowCap);
    (0, chai_1.expect)(limits.totalCap).to.equal(newLimits.totalCap);
  });
  it("allows governance to pause and resume baskets", async () => {
    const { manager, admin, basketId } = await (0, hardhat_network_helpers_1.loadFixture)(
      BasketE2E_fixture_1.deployBasketE2EFixture
    );
    await (0, chai_1.expect)(manager.connect(admin).setBasketPause(basketId, true))
      .to.emit(manager, "BasketPauseSet")
      .withArgs(basketId, true);
    const pausedState = await manager.getBasketState(basketId);
    (0, chai_1.expect)(pausedState.paused).to.equal(true);
    await (await manager.connect(admin).setBasketPause(basketId, false)).wait();
    const resumedState = await manager.getBasketState(basketId);
    (0, chai_1.expect)(resumedState.paused).to.equal(false);
  });
  it("reverts controller calls when basket is paused", async () => {
    const { manager, admin, controller, basketId } = await (0, hardhat_network_helpers_1.loadFixture)(
      BasketE2E_fixture_1.deployBasketE2EFixture
    );
    await (await manager.connect(admin).setBasketPause(basketId, true)).wait();
    await (0, chai_1.expect)(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "BasketPaused");
  });
});
