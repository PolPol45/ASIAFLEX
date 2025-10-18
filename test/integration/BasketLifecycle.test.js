"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketFixture_1 = require("../fixtures/BasketFixture");
const eip712_1 = require("../../scripts/helpers/eip712");
describe("Basket end-to-end flows", () => {
  it("executes mint and redeem via BasketTreasuryController", async () => {
    const { controllerContract, treasurySigner, admin, user, basketId, manager, token, navAdapter } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketFixture_1.deployBasketSystemFixture);
    const chainId = (await hardhat_1.ethers.provider.getNetwork()).chainId;
    const domain = (0, eip712_1.basketTreasuryDomain)(chainId, await controllerContract.getAddress());
    const nav = hardhat_1.ethers.parseUnits("1.10", 18);
    await (await navAdapter.updateNAV(basketId, nav)).wait();
    const mintRequest = {
      basketId,
      to: user.address,
      notional: hardhat_1.ethers.parseUnits("1000", 18),
      nav,
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 1n,
    };
    const mintSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, mintRequest);
    await controllerContract.connect(admin).mintWithProof(mintRequest, mintSignature, treasurySigner.address);
    const mintedShares = await token.balanceOf(user.address);
    const expectedShares = await manager.quoteMint(basketId, mintRequest.notional);
    (0, chai_1.expect)(mintedShares).to.equal(expectedShares);
    const redeemRequest = {
      basketId,
      to: user.address,
      notional: hardhat_1.ethers.parseUnits("400", 18),
      nav,
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 2n,
    };
    const redeemSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, redeemRequest);
    const redeemShares = await manager.quoteMint(basketId, redeemRequest.notional);
    await controllerContract.connect(admin).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);
    const remainingShares = await token.balanceOf(user.address);
    (0, chai_1.expect)(remainingShares).to.equal(mintedShares - redeemShares);
    // controller role on manager remains admin + contract; ensure manager reflects supply reduction
    const supply = await token.totalSupply();
    (0, chai_1.expect)(supply).to.equal(remainingShares);
  });
});
