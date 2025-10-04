import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketSystemFixture } from "../fixtures/BasketFixture";
import { basketTreasuryDomain, signMintRedeem, type MintRedeemRequest } from "../../scripts/helpers/eip712";

describe("Basket end-to-end flows", () => {
  it("executes mint and redeem via BasketTreasuryController", async () => {
    const { controllerContract, treasurySigner, admin, user, basketId, manager, token, navAdapter } =
      await loadFixture(deployBasketSystemFixture);

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = basketTreasuryDomain(chainId, await controllerContract.getAddress());

    const nav = ethers.parseUnits("1.10", 18);
    await (await navAdapter.updateNAV(basketId, nav)).wait();

    const mintRequest: MintRedeemRequest = {
      basketId,
      to: user.address,
      notional: ethers.parseUnits("1000", 18),
      nav,
      deadline: BigInt((await time.latest()) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 1n,
    };

    const mintSignature = await signMintRedeem(treasurySigner, domain, mintRequest);
    await controllerContract.connect(admin).mintWithProof(mintRequest, mintSignature, treasurySigner.address);

    const mintedShares = await token.balanceOf(user.address);
    const expectedShares = await manager.quoteMint(basketId, mintRequest.notional);
    expect(mintedShares).to.equal(expectedShares);

    const redeemRequest: MintRedeemRequest = {
      basketId,
      to: user.address,
      notional: ethers.parseUnits("400", 18),
      nav,
      deadline: BigInt((await time.latest()) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 2n,
    };

    const redeemSignature = await signMintRedeem(treasurySigner, domain, redeemRequest);
    const redeemShares = await manager.quoteMint(basketId, redeemRequest.notional);
    await controllerContract.connect(admin).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);

    const remainingShares = await token.balanceOf(user.address);
    expect(remainingShares).to.equal(mintedShares - redeemShares);

    // controller role on manager remains admin + contract; ensure manager reflects supply reduction
    const supply = await token.totalSupply();
    expect(supply).to.equal(remainingShares);
  });
});
