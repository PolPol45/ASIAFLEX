import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketE2EFixture } from "../fixtures/BasketE2E.fixture";
import { quoteShares, toWei } from "../helpers/quote";

describe("BasketManager", () => {
  it("quotes, mints, and burns basket shares based on NAV", async () => {
    const { manager, controller, basketToken, basketId, seedFreshNAV } = await loadFixture(deployBasketE2EFixture);

    const nav = toWei("1.25");
    await seedFreshNAV("EUFX", nav);

    const notional = toWei("1000");
    const expectedShares = quoteShares(notional, nav);

    const quotedShares = await manager.quoteMint(basketId, notional);
    expect(quotedShares).to.equal(expectedShares);

    await (await manager.connect(controller).mintBasket(basketId, controller.address, quotedShares)).wait();
    expect(await basketToken.totalSupply()).to.equal(quotedShares);
    expect(await basketToken.balanceOf(controller.address)).to.equal(quotedShares);

    await (await manager.connect(controller).burnBasket(basketId, controller.address, quotedShares / 2n)).wait();
    expect(await basketToken.totalSupply()).to.equal(quotedShares / 2n);
    expect(await basketToken.balanceOf(controller.address)).to.equal(quotedShares / 2n);
  });

  it("enforces daily mint cap and resets on new day", async () => {
    const { manager, controller, basketId, seedFreshNAV } = await loadFixture(deployBasketE2EFixture);

    await seedFreshNAV("EUFX", toWei("1"));
    const limits = await manager.getBasketLimits(basketId);
    expect(limits.dailyMintCap).to.be.greaterThan(0n);

    await (await manager.connect(controller).mintBasket(basketId, controller.address, limits.dailyMintCap)).wait();

    await expect(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "DailyMintCapExceeded");

    await time.increase(24 * 60 * 60 + 10);
    await (await manager.connect(controller).mintBasket(basketId, controller.address, 1n)).wait();
  });

  it("tracks net inflow caps across mint and burn", async () => {
    const { manager, controller, basketId, seedFreshNAV, setBasketLimits } = await loadFixture(deployBasketE2EFixture);

    await seedFreshNAV("EUFX", toWei("1"));

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

    await expect(
      manager.connect(controller).mintBasket(basketId, controller.address, 1n)
    ).to.be.revertedWithCustomError(manager, "DailyNetInflowExceeded");

    await (await manager.connect(controller).burnBasket(basketId, controller.address, halfCap)).wait();
    await (await manager.connect(controller).mintBasket(basketId, controller.address, halfCap)).wait();
  });
});
