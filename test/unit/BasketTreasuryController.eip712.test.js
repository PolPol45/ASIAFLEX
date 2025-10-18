"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const BasketFixture_1 = require("../fixtures/BasketFixture");
const eip712_1 = require("../../scripts/helpers/eip712");
describe("BasketTreasuryController EIP-712", () => {
  it("verifies signatures and prevents replay", async () => {
    const { controllerContract, treasurySigner, admin, basketId, manager, token, navAdapter } = await (0,
    hardhat_network_helpers_1.loadFixture)(BasketFixture_1.deployBasketSystemFixture);
    const chainId = (await hardhat_1.ethers.provider.getNetwork()).chainId;
    const domain = (0, eip712_1.basketTreasuryDomain)(chainId, await controllerContract.getAddress());
    const request = {
      basketId,
      to: admin.address,
      notional: hardhat_1.ethers.parseUnits("1000", 18),
      nav: hardhat_1.ethers.parseUnits("1.05", 18),
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 1n,
    };
    await (await navAdapter.updateNAV(basketId, request.nav)).wait();
    const signature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, request);
    const digest = (0, eip712_1.encodeMintRedeemDigest)(domain, request);
    (0, chai_1.expect)(await controllerContract.computeDigest(request)).to.equal(digest);
    (0, chai_1.expect)(await controllerContract.verifySignature(treasurySigner.address, request, signature)).to.equal(
      true
    );
    await (0, chai_1.expect)(controllerContract.mintWithProof(request, signature, treasurySigner.address)).to.emit(
      controllerContract,
      "MintValidated"
    );
    (0, chai_1.expect)(await token.balanceOf(request.to)).to.be.greaterThan(0n);
    (0, chai_1.expect)(await token.totalSupply()).to.be.greaterThan(0n);
    await (0, chai_1.expect)(
      controllerContract.mintWithProof(request, signature, treasurySigner.address)
    ).to.be.revertedWithCustomError(controllerContract, "SignatureAlreadyUsed");
    await manager.connect(admin).setBasketPause(basketId, true);
    const replayDeadline = BigInt((await hardhat_network_helpers_1.time.latest()) + 3600);
    const replayRequest = { ...request, nonce: 2n, deadline: replayDeadline };
    const replaySignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, replayRequest);
    await (0, chai_1.expect)(
      controllerContract.mintWithProof(replayRequest, replaySignature, treasurySigner.address)
    ).to.be.revertedWithCustomError(manager, "BasketPaused");
  });
  it("rejects expired or impersonated signatures", async () => {
    const { controllerContract, treasurySigner, basketId } = await (0, hardhat_network_helpers_1.loadFixture)(
      BasketFixture_1.deployBasketSystemFixture
    );
    const [, , , , malicious] = await hardhat_1.ethers.getSigners();
    const domain = (0, eip712_1.basketTreasuryDomain)(
      (await hardhat_1.ethers.provider.getNetwork()).chainId,
      await controllerContract.getAddress()
    );
    const baseRequest = {
      basketId,
      to: malicious.address,
      notional: hardhat_1.ethers.parseUnits("500", 18),
      nav: hardhat_1.ethers.parseUnits("1", 18),
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 10),
      proofHash: hardhat_1.ethers.ZeroHash,
      nonce: 1n,
    };
    const signature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, baseRequest);
    await hardhat_network_helpers_1.time.increase(11);
    await (0, chai_1.expect)(
      controllerContract.mintWithProof(baseRequest, signature, treasurySigner.address)
    ).to.be.revertedWithCustomError(controllerContract, "SignatureExpired");
    const forgedSignature = await (0, eip712_1.signMintRedeem)(malicious, domain, {
      ...baseRequest,
      deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600),
    });
    await (0, chai_1.expect)(
      controllerContract.mintWithProof(
        { ...baseRequest, deadline: BigInt((await hardhat_network_helpers_1.time.latest()) + 3600) },
        forgedSignature,
        treasurySigner.address
      )
    ).to.be.revertedWithCustomError(controllerContract, "InvalidSignature");
  });
});
