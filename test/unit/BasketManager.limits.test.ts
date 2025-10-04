import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketE2EFixture } from "../fixtures/BasketE2E.fixture";
import { toWei } from "../helpers/quote";

describe("BasketManager limits", () => {
  it("allows governance to update basket limits", async () => {
    const { manager, admin, basketId } = await loadFixture(deployBasketE2EFixture);
    const newLimits = {
      dailyMintCap: toWei("500000"),
      dailyNetInflowCap: toWei("1000000"),
      totalCap: toWei("2000000"),
    };

    await expect(manager.connect(admin).setBasketLimits(basketId, newLimits)).to.emit(manager, "BasketLimitsUpdated");

    const limits = await manager.getBasketLimits(basketId);
    expect(limits.dailyMintCap).to.equal(newLimits.dailyMintCap);
    expect(limits.dailyNetInflowCap).to.equal(newLimits.dailyNetInflowCap);
    expect(limits.totalCap).to.equal(newLimits.totalCap);
  });

  it("allows governance to pause and resume baskets", async () => {
    const { manager, admin, basketId } = await loadFixture(deployBasketE2EFixture);

    await expect(manager.connect(admin).setBasketPause(basketId, true))
      .to.emit(manager, "BasketPauseSet")
      .withArgs(basketId, true);

    const pausedState = await manager.getBasketState(basketId);
    expect(pausedState.paused).to.equal(true);

    await (await manager.connect(admin).setBasketPause(basketId, false)).wait();
    const resumedState = await manager.getBasketState(basketId);
    expect(resumedState.paused).to.equal(false);
  });

  it("reverts controller calls when basket is paused", async () => {
    const { manager, admin, controller, basketId } = await loadFixture(deployBasketE2EFixture);

    await (await manager.connect(admin).setBasketPause(basketId, true)).wait();

    await expect(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "BasketPaused");
  });
});
