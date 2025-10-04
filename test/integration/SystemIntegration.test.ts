import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketE2EFixture } from "../fixtures/BasketE2E.fixture";
import { basketTreasuryDomain, signMintRedeem, type MintRedeemRequest } from "../../scripts/helpers/eip712";
import { toWei } from "../helpers/quote";

describe("Basket-first system integration", () => {
  it("mints and redeems baskets via attested treasury flow", async () => {
    const { manager, treasury, controller, treasurySigner, user, basketToken, basketId, seedFreshNAV } =
      await loadFixture(deployBasketE2EFixture);

    const nav = toWei("1.08");
    await seedFreshNAV("EUFX", nav);

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = basketTreasuryDomain(chainId, await treasury.getAddress());

    const mintRequest: MintRedeemRequest = {
      basketId,
      to: user.address,
      notional: toWei("1000"),
      nav,
      deadline: BigInt((await time.latest()) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 1n,
    };

    const mintSignature = await signMintRedeem(treasurySigner, domain, mintRequest);
    await treasury.connect(controller).mintWithProof(mintRequest, mintSignature, treasurySigner.address);

    const mintedShares = await basketToken.balanceOf(user.address);
    const expectedShares = await manager.quoteMint(basketId, mintRequest.notional);
    expect(mintedShares).to.equal(expectedShares);

    const redeemRequest: MintRedeemRequest = {
      basketId,
      to: user.address,
      notional: toWei("400"),
      nav,
      deadline: BigInt((await time.latest()) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 2n,
    };

    const redeemSignature = await signMintRedeem(treasurySigner, domain, redeemRequest);
    await treasury.connect(controller).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);

    const remainingShares = await basketToken.balanceOf(user.address);
    const expectedRedeemShares = await manager.quoteMint(basketId, redeemRequest.notional);
    expect(remainingShares).to.equal(mintedShares - expectedRedeemShares);

    const redeemedNotional = await manager.quoteRedeem(basketId, expectedRedeemShares);
    expect(redeemedNotional).to.equal(redeemRequest.notional);

    const totalSupply = await basketToken.totalSupply();
    expect(totalSupply).to.equal(remainingShares);
  });
});
