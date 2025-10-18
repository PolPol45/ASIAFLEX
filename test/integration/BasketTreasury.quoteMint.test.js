"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketE2E_fixture_1 = require("../fixtures/BasketE2E.fixture");
const quote_1 = require("../helpers/quote");
const eip712_1 = require("../../scripts/helpers/eip712");
describe("BasketTreasuryController quoteMint integration", () => {
  it("returns the same share calculation as BasketManager", async () => {
    const { treasury, manager, treasurySigner, basketId, seedFreshNAV } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketE2E_fixture_1.deployBasketE2EFixture);
    const nav = (0, quote_1.toWei)("0.95");
    await seedFreshNAV("EUFX", nav);
    const request = {
      basketId,
      to: treasurySigner.address,
      notional: (0, quote_1.toWei)("500"),
      nav,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 1n,
    };
    const expectedShares = await manager.quoteMint(basketId, request.notional);
    const domain = (0, eip712_1.basketTreasuryDomain)(
      (await hardhat_1.ethers.provider.getNetwork()).chainId,
      await treasury.getAddress()
    );
    const signature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, request);
    await treasury.mintWithProof(request, signature, treasurySigner.address);
    const redeemedNotional = await manager.quoteRedeem(basketId, expectedShares);
    (0, chai_1.expect)([request.notional, request.notional - 1n]).to.include(redeemedNotional);
    await (0, chai_1.expect)(
      treasury.mintWithProof(request, signature, treasurySigner.address)
    ).to.be.revertedWithCustomError(treasury, "SignatureAlreadyUsed");
  });
});
