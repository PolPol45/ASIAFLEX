"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketE2E_fixture_1 = require("../fixtures/BasketE2E.fixture");
const eip712_1 = require("../../scripts/helpers/eip712");
const quote_1 = require("../helpers/quote");
describe("Basket-first system integration", () => {
  it("mints and redeems baskets via attested treasury flow", async () => {
    const { manager, treasury, controller, treasurySigner, user, basketToken, basketId, seedFreshNAV } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketE2E_fixture_1.deployBasketE2EFixture);
    const nav = (0, quote_1.toWei)("1.08");
    await seedFreshNAV("EUFX", nav);
    const chainId = (await hardhat_1.ethers.provider.getNetwork()).chainId;
    const domain = (0, eip712_1.basketTreasuryDomain)(chainId, await treasury.getAddress());
    const mintRequest = {
      basketId,
      to: user.address,
      notional: (0, quote_1.toWei)("1000"),
      nav,
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 1n,
    };
    const mintSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, mintRequest);
    await treasury.connect(controller).mintWithProof(mintRequest, mintSignature, treasurySigner.address);
    const mintedShares = await basketToken.balanceOf(user.address);
    const expectedShares = await manager.quoteMint(basketId, mintRequest.notional);
    (0, chai_1.expect)(mintedShares).to.equal(expectedShares);
    const redeemRequest = {
      basketId,
      to: user.address,
      notional: (0, quote_1.toWei)("400"),
      nav,
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 2n,
    };
    const redeemSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, redeemRequest);
    await treasury.connect(controller).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);
    const remainingShares = await basketToken.balanceOf(user.address);
    const expectedRedeemShares = await manager.quoteMint(basketId, redeemRequest.notional);
    (0, chai_1.expect)(remainingShares).to.equal(mintedShares - expectedRedeemShares);
    const redeemedNotional = await manager.quoteRedeem(basketId, expectedRedeemShares);
    (0, chai_1.expect)(redeemedNotional).to.equal(redeemRequest.notional);
    const totalSupply = await basketToken.totalSupply();
    (0, chai_1.expect)(totalSupply).to.equal(remainingShares);
  });
});
