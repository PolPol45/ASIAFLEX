import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketE2EFixture } from "../fixtures/BasketE2E.fixture";
import { toWei } from "../helpers/quote";
import { basketTreasuryDomain, signMintRedeem, type MintRedeemRequest } from "../../scripts/helpers/eip712";

describe("BasketTreasuryController quoteMint integration", () => {
  it("returns the same share calculation as BasketManager", async () => {
    const { treasury, manager, treasurySigner, basketId, seedFreshNAV } = await loadFixture(deployBasketE2EFixture);

    const nav = toWei("0.95");
    await seedFreshNAV("EUFX", nav);

    const request: MintRedeemRequest = {
      basketId,
      to: treasurySigner.address,
      notional: toWei("500"),
      nav,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 1n,
    };

    const expectedShares = await manager.quoteMint(basketId, request.notional);

    const domain = basketTreasuryDomain((await ethers.provider.getNetwork()).chainId, await treasury.getAddress());
    const signature = await signMintRedeem(treasurySigner, domain, request);

    await treasury.mintWithProof(request, signature, treasurySigner.address);
    const redeemedNotional = await manager.quoteRedeem(basketId, expectedShares);
    expect([request.notional, request.notional - 1n]).to.include(redeemedNotional);
    await expect(treasury.mintWithProof(request, signature, treasurySigner.address)).to.be.revertedWithCustomError(
      treasury,
      "SignatureAlreadyUsed"
    );
  });
});
