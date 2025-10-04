import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

import { deployBasketSystemFixture } from "../fixtures/BasketFixture";
import {
  basketTreasuryDomain,
  encodeMintRedeemDigest,
  signMintRedeem,
  type MintRedeemRequest,
} from "../../scripts/helpers/eip712";

describe("BasketTreasuryController EIP-712", () => {
  it("verifies signatures and prevents replay", async () => {
    const { controllerContract, treasurySigner, admin, basketId, manager, token, navAdapter } =
      await loadFixture(deployBasketSystemFixture);

    const chainId = (await ethers.provider.getNetwork()).chainId;
    const domain = basketTreasuryDomain(chainId, await controllerContract.getAddress());

    const request: MintRedeemRequest = {
      basketId,
      to: admin.address,
      notional: ethers.parseUnits("1000", 18),
      nav: ethers.parseUnits("1.05", 18),
      deadline: BigInt((await time.latest()) + 3600),
      proofHash: ethers.ZeroHash,
      nonce: 1n,
    };

    await (await navAdapter.updateNAV(basketId, request.nav)).wait();

    const signature = await signMintRedeem(treasurySigner, domain, request);
    const digest = encodeMintRedeemDigest(domain, request);
    expect(await controllerContract.computeDigest(request)).to.equal(digest);

    expect(await controllerContract.verifySignature(treasurySigner.address, request, signature)).to.equal(true);

    await expect(controllerContract.mintWithProof(request, signature, treasurySigner.address)).to.emit(
      controllerContract,
      "MintValidated"
    );

    expect(await token.balanceOf(request.to)).to.be.greaterThan(0n);
    expect(await token.totalSupply()).to.be.greaterThan(0n);

    await expect(
      controllerContract.mintWithProof(request, signature, treasurySigner.address)
    ).to.be.revertedWithCustomError(controllerContract, "SignatureAlreadyUsed");

    await manager.connect(admin).setBasketPause(basketId, true);
    const replayDeadline = BigInt((await time.latest()) + 3600);
    const replayRequest: MintRedeemRequest = { ...request, nonce: 2n, deadline: replayDeadline };
    const replaySignature = await signMintRedeem(treasurySigner, domain, replayRequest);

    await expect(
      controllerContract.mintWithProof(replayRequest, replaySignature, treasurySigner.address)
    ).to.be.revertedWithCustomError(manager, "BasketPaused");
  });

  it("rejects expired or impersonated signatures", async () => {
    const { controllerContract, treasurySigner, basketId } = await loadFixture(deployBasketSystemFixture);
    const [, , , , malicious] = await ethers.getSigners();

    const domain = basketTreasuryDomain(
      (await ethers.provider.getNetwork()).chainId,
      await controllerContract.getAddress()
    );
    const baseRequest: MintRedeemRequest = {
      basketId,
      to: malicious.address,
      notional: ethers.parseUnits("500", 18),
      nav: ethers.parseUnits("1", 18),
      deadline: BigInt((await time.latest()) + 10),
      proofHash: ethers.ZeroHash,
      nonce: 1n,
    };

    const signature = await signMintRedeem(treasurySigner, domain, baseRequest);
    await time.increase(11);

    await expect(
      controllerContract.mintWithProof(baseRequest, signature, treasurySigner.address)
    ).to.be.revertedWithCustomError(controllerContract, "SignatureExpired");

    const forgedSignature = await signMintRedeem(malicious, domain, {
      ...baseRequest,
      deadline: BigInt((await time.latest()) + 3600),
    });
    await expect(
      controllerContract.mintWithProof(
        { ...baseRequest, deadline: BigInt((await time.latest()) + 3600) },
        forgedSignature,
        treasurySigner.address
      )
    ).to.be.revertedWithCustomError(controllerContract, "InvalidSignature");
  });
});
