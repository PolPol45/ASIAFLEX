"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const mintWithAttestation = (token, to, amount, attestation) =>
  token["mint(address,uint256,bytes32)"](to, amount, attestation);
describe("TreasuryController", function () {
  let treasury;
  let token;
  let owner;
  let treasurySigner;
  let treasuryManager;
  let user1;
  let user2;
  const REQUEST_EXPIRATION = 3600; // 1 hour
  const SUPPLY_CAP = hardhat_1.ethers.parseEther("1000000");
  const MAX_DAILY_MINT = hardhat_1.ethers.parseEther("10000");
  const MAX_DAILY_NET_INFLOWS = hardhat_1.ethers.parseEther("50000");
  beforeEach(async function () {
    [owner, treasurySigner, treasuryManager, user1, user2] = await hardhat_1.ethers.getSigners();
    // Deploy AsiaFlexToken first
    const AsiaFlexTokenFactory = await hardhat_1.ethers.getContractFactory("AsiaFlexToken");
    token = await AsiaFlexTokenFactory.deploy(
      "AsiaFlexToken",
      "AFX",
      SUPPLY_CAP,
      MAX_DAILY_MINT,
      MAX_DAILY_NET_INFLOWS
    );
    // Deploy TreasuryController
    const TreasuryControllerFactory = await hardhat_1.ethers.getContractFactory("TreasuryController");
    treasury = await TreasuryControllerFactory.deploy(
      await token.getAddress(),
      treasurySigner.address,
      REQUEST_EXPIRATION
    );
    // Setup roles
    const TREASURY_MANAGER_ROLE = await treasury.TREASURY_MANAGER_ROLE();
    await treasury.grantRole(TREASURY_MANAGER_ROLE, treasuryManager.address);
    // Grant TREASURY_ROLE to TreasuryController on the token
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    await token.grantRole(TREASURY_ROLE, await treasury.getAddress());
  });
  describe("Deployment", function () {
    it("Should have correct initial values", async function () {
      (0, chai_1.expect)(await treasury.ASIA_FLEX_TOKEN()).to.equal(await token.getAddress());
      (0, chai_1.expect)(await treasury.getTreasurySigner()).to.equal(treasurySigner.address);
      (0, chai_1.expect)(await treasury.getRequestExpiration()).to.equal(REQUEST_EXPIRATION);
      (0, chai_1.expect)(await treasury.paused()).to.be.false;
    });
    it("Should grant roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await treasury.DEFAULT_ADMIN_ROLE();
      const TREASURY_MANAGER_ROLE = await treasury.TREASURY_MANAGER_ROLE();
      (0, chai_1.expect)(await treasury.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      (0, chai_1.expect)(await treasury.hasRole(TREASURY_MANAGER_ROLE, owner.address)).to.be.true;
    });
  });
  describe("Mint Execution", function () {
    const mintAmount = hardhat_1.ethers.parseEther("1000");
    const reserveHash = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("reserve-proof-123"));
    async function createMintRequest(timestamp) {
      const currentTime = timestamp ?? (await hardhat_network_helpers_1.time.latest());
      return {
        to: user1.address,
        amount: mintAmount,
        timestamp: currentTime,
        reserveHash: reserveHash,
      };
    }
    async function signMintRequest(request, signer) {
      const domain = {
        name: "TreasuryController",
        version: "1",
        chainId: (await hardhat_1.ethers.provider.getNetwork()).chainId,
        verifyingContract: await treasury.getAddress(),
      };
      const types = {
        MintRequest: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "reserveHash", type: "bytes32" },
        ],
      };
      return await signer.signTypedData(domain, types, request);
    }
    it("Should execute valid mint request", async function () {
      const request = await createMintRequest();
      const signature = await signMintRequest(request, treasurySigner);
      await (0, chai_1.expect)(treasury.executeMint(request, signature))
        .to.emit(treasury, "MintExecuted")
        .withArgs(request.to, request.amount, request.reserveHash)
        .and.to.emit(token, "Mint")
        .withArgs(request.to, request.amount, request.reserveHash);
      (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(mintAmount);
    });
    it("Should revert with expired request", async function () {
      const expiredTime = (await hardhat_network_helpers_1.time.latest()) - REQUEST_EXPIRATION - 1;
      const request = await createMintRequest(expiredTime);
      const signature = await signMintRequest(request, treasurySigner);
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        treasury,
        "RequestExpired"
      );
    });
    it("Should revert with invalid signature", async function () {
      const request = await createMintRequest();
      const invalidSignature = await signMintRequest(request, user2); // Wrong signer
      await (0, chai_1.expect)(treasury.executeMint(request, invalidSignature)).to.be.revertedWithCustomError(
        treasury,
        "InvalidSignature"
      );
    });
    it("Should prevent replay attacks", async function () {
      const request = await createMintRequest();
      const signature = await signMintRequest(request, treasurySigner);
      // First execution should succeed
      await treasury.executeMint(request, signature);
      // Second execution should fail
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        treasury,
        "InvalidSignature"
      );
    });
    it("Should revert when contract is paused", async function () {
      await treasury.connect(treasuryManager).pause();
      const request = await createMintRequest();
      const signature = await signMintRequest(request, treasurySigner);
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        treasury,
        "EnforcedPause"
      );
    });
    it("Should verify mint signature correctly", async function () {
      const request = await createMintRequest();
      const validSignature = await signMintRequest(request, treasurySigner);
      const invalidSignature = await signMintRequest(request, user2);
      (0, chai_1.expect)(await treasury.verifyMintSignature(request, validSignature)).to.be.true;
      (0, chai_1.expect)(await treasury.verifyMintSignature(request, invalidSignature)).to.be.false;
    });
    it("Should check if request is used", async function () {
      const request = await createMintRequest();
      const signature = await signMintRequest(request, treasurySigner);
      (0, chai_1.expect)(await treasury.isRequestUsed(request, signature)).to.be.false;
      await treasury.executeMint(request, signature);
      (0, chai_1.expect)(await treasury.isRequestUsed(request, signature)).to.be.true;
    });
  });
  describe("Redeem Execution", function () {
    const redeemAmount = hardhat_1.ethers.parseEther("500");
    const reserveHash = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("reserve-proof-456"));
    beforeEach(async function () {
      // Mint some tokens first
      const mintAmount = hardhat_1.ethers.parseEther("1000");
      const mintHash = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("mint-proof"));
      await mintWithAttestation(token, user1.address, mintAmount, mintHash);
    });
    async function createRedeemRequest(timestamp) {
      const currentTime = timestamp ?? (await hardhat_network_helpers_1.time.latest());
      return {
        from: user1.address,
        amount: redeemAmount,
        timestamp: currentTime,
        reserveHash: reserveHash,
      };
    }
    async function signRedeemRequest(request, signer) {
      const domain = {
        name: "TreasuryController",
        version: "1",
        chainId: (await hardhat_1.ethers.provider.getNetwork()).chainId,
        verifyingContract: await treasury.getAddress(),
      };
      const types = {
        RedeemRequest: [
          { name: "from", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "reserveHash", type: "bytes32" },
        ],
      };
      return await signer.signTypedData(domain, types, request);
    }
    it("Should execute valid redeem request", async function () {
      const initialBalance = await token.balanceOf(user1.address);
      const request = await createRedeemRequest();
      const signature = await signRedeemRequest(request, treasurySigner);
      await (0, chai_1.expect)(treasury.executeRedeem(request, signature))
        .to.emit(treasury, "RedeemExecuted")
        .withArgs(request.from, request.amount, request.reserveHash)
        .and.to.emit(token, "Burn")
        .withArgs(request.from, request.amount, request.reserveHash);
      (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(initialBalance - redeemAmount);
    });
    it("Should revert with expired request", async function () {
      const expiredTime = (await hardhat_network_helpers_1.time.latest()) - REQUEST_EXPIRATION - 1;
      const request = await createRedeemRequest(expiredTime);
      const signature = await signRedeemRequest(request, treasurySigner);
      await (0, chai_1.expect)(treasury.executeRedeem(request, signature)).to.be.revertedWithCustomError(
        treasury,
        "RequestExpired"
      );
    });
    it("Should revert with invalid signature", async function () {
      const request = await createRedeemRequest();
      const invalidSignature = await signRedeemRequest(request, user2); // Wrong signer
      await (0, chai_1.expect)(treasury.executeRedeem(request, invalidSignature)).to.be.revertedWithCustomError(
        treasury,
        "InvalidSignature"
      );
    });
    it("Should prevent replay attacks", async function () {
      const request = await createRedeemRequest();
      const signature = await signRedeemRequest(request, treasurySigner);
      // First execution should succeed
      await treasury.executeRedeem(request, signature);
      // Second execution should fail
      await (0, chai_1.expect)(treasury.executeRedeem(request, signature)).to.be.revertedWithCustomError(
        treasury,
        "InvalidSignature"
      );
    });
    it("Should verify redeem signature correctly", async function () {
      const request = await createRedeemRequest();
      const validSignature = await signRedeemRequest(request, treasurySigner);
      const invalidSignature = await signRedeemRequest(request, user2);
      (0, chai_1.expect)(await treasury.verifyRedeemSignature(request, validSignature)).to.be.true;
      (0, chai_1.expect)(await treasury.verifyRedeemSignature(request, invalidSignature)).to.be.false;
    });
    it("Should check if redeem request is used", async function () {
      const request = await createRedeemRequest();
      const signature = await signRedeemRequest(request, treasurySigner);
      (0, chai_1.expect)(await treasury.isRedeemRequestUsed(request, signature)).to.be.false;
      await treasury.executeRedeem(request, signature);
      (0, chai_1.expect)(await treasury.isRedeemRequestUsed(request, signature)).to.be.true;
    });
  });
  describe("Configuration Management", function () {
    it("Should allow treasury manager to update treasury signer", async function () {
      const newSigner = user2.address;
      await (0, chai_1.expect)(treasury.connect(treasuryManager).setTreasurySigner(newSigner))
        .to.emit(treasury, "TreasurySignerUpdated")
        .withArgs(treasurySigner.address, newSigner);
      (0, chai_1.expect)(await treasury.getTreasurySigner()).to.equal(newSigner);
    });
    it("Should allow treasury manager to update request expiration", async function () {
      const newExpiration = 7200; // 2 hours
      await (0, chai_1.expect)(treasury.connect(treasuryManager).setRequestExpiration(newExpiration))
        .to.emit(treasury, "RequestExpirationUpdated")
        .withArgs(REQUEST_EXPIRATION, newExpiration);
      (0, chai_1.expect)(await treasury.getRequestExpiration()).to.equal(newExpiration);
    });
    it("Should revert when non-manager tries to update configuration", async function () {
      await (0, chai_1.expect)(treasury.connect(user1).setTreasurySigner(user2.address)).to.be.revertedWithCustomError(
        treasury,
        "AccessControlUnauthorizedAccount"
      );
      await (0, chai_1.expect)(treasury.connect(user1).setRequestExpiration(7200)).to.be.revertedWithCustomError(
        treasury,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
  describe("Pause Functionality", function () {
    it("Should allow treasury manager to pause contract", async function () {
      await (0, chai_1.expect)(treasury.connect(treasuryManager).pause())
        .to.emit(treasury, "Paused")
        .withArgs(treasuryManager.address);
      (0, chai_1.expect)(await treasury.paused()).to.be.true;
    });
    it("Should allow treasury manager to unpause contract", async function () {
      await treasury.connect(treasuryManager).pause();
      await (0, chai_1.expect)(treasury.connect(treasuryManager).unpause())
        .to.emit(treasury, "Unpaused")
        .withArgs(treasuryManager.address);
      (0, chai_1.expect)(await treasury.paused()).to.be.false;
    });
    it("Should revert when non-manager tries to pause", async function () {
      await (0, chai_1.expect)(treasury.connect(user1).pause()).to.be.revertedWithCustomError(
        treasury,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
  describe("Emergency Functions", function () {
    const emergencyAmount = hardhat_1.ethers.parseEther("1000");
    const emergencyHash = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("emergency-proof"));
    it("Should allow admin to emergency mint when paused", async function () {
      await treasury.connect(treasuryManager).pause();
      await (0, chai_1.expect)(treasury.emergencyMint(user1.address, emergencyAmount, emergencyHash))
        .to.emit(treasury, "MintExecuted")
        .withArgs(user1.address, emergencyAmount, emergencyHash);
      (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(emergencyAmount);
    });
    it("Should allow admin to emergency burn when paused", async function () {
      // First mint some tokens
      await mintWithAttestation(token, user1.address, emergencyAmount, emergencyHash);
      await treasury.connect(treasuryManager).pause();
      await (0, chai_1.expect)(treasury.emergencyBurn(user1.address, emergencyAmount, emergencyHash))
        .to.emit(treasury, "RedeemExecuted")
        .withArgs(user1.address, emergencyAmount, emergencyHash);
      (0, chai_1.expect)(await token.balanceOf(user1.address)).to.equal(0);
    });
    it("Should revert emergency functions when not paused", async function () {
      await (0, chai_1.expect)(
        treasury.emergencyMint(user1.address, emergencyAmount, emergencyHash)
      ).to.be.revertedWithCustomError(treasury, "ExpectedPause");
      await (0, chai_1.expect)(
        treasury.emergencyBurn(user1.address, emergencyAmount, emergencyHash)
      ).to.be.revertedWithCustomError(treasury, "ExpectedPause");
    });
    it("Should revert when non-admin tries emergency functions", async function () {
      await treasury.connect(treasuryManager).pause();
      await (0, chai_1.expect)(
        treasury.connect(user1).emergencyMint(user2.address, emergencyAmount, emergencyHash)
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
      await (0, chai_1.expect)(
        treasury.connect(user1).emergencyBurn(user2.address, emergencyAmount, emergencyHash)
      ).to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount");
    });
  });
  describe("View Functions", function () {
    it("Should return correct mint request hash", async function () {
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        to: user1.address,
        amount: hardhat_1.ethers.parseEther("1000"),
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const hash = await treasury.getMintRequestHash(request);
      (0, chai_1.expect)(hash).to.be.a("string");
      (0, chai_1.expect)(hash.length).to.equal(66); // 0x + 64 hex chars
    });
    it("Should return correct redeem request hash", async function () {
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        from: user1.address,
        amount: hardhat_1.ethers.parseEther("1000"),
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const hash = await treasury.getRedeemRequestHash(request);
      (0, chai_1.expect)(hash).to.be.a("string");
      (0, chai_1.expect)(hash.length).to.equal(66); // 0x + 64 hex chars
    });
  });
  describe("EIP712 Domain", function () {
    it("Should have correct domain separator", async function () {
      // This tests that EIP712 is properly implemented
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        to: user1.address,
        amount: hardhat_1.ethers.parseEther("1000"),
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const signature = await signMintRequest(request, treasurySigner);
      (0, chai_1.expect)(await treasury.verifyMintSignature(request, signature)).to.be.true;
      // Modify the request slightly and verify signature fails
      const modifiedRequest = { ...request, amount: hardhat_1.ethers.parseEther("999") };
      (0, chai_1.expect)(await treasury.verifyMintSignature(modifiedRequest, signature)).to.be.false;
    });
  });
  describe("Integration with AsiaFlexToken", function () {
    it("Should respect token circuit breakers", async function () {
      const largeAmount = MAX_DAILY_MINT + 1n;
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        to: user1.address,
        amount: largeAmount,
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const signature = await signMintRequest(request, treasurySigner);
      // Should fail due to token's daily mint cap
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        token,
        "DailyCapsExceeded"
      );
    });
    it("Should respect token pause state", async function () {
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      await token.grantRole(PAUSER_ROLE, owner.address);
      await token.pause();
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        to: user1.address,
        amount: hardhat_1.ethers.parseEther("1000"),
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const signature = await signMintRequest(request, treasurySigner);
      // Should fail due to token being paused
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause"
      );
    });
    it("Should respect token blacklist", async function () {
      const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
      await token.grantRole(BLACKLIST_MANAGER_ROLE, owner.address);
      await token.setBlacklisted(user1.address, true);
      const timestamp = await hardhat_network_helpers_1.time.latest();
      const request = {
        to: user1.address,
        amount: hardhat_1.ethers.parseEther("1000"),
        timestamp,
        reserveHash: hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("test")),
      };
      const signature = await signMintRequest(request, treasurySigner);
      // Should fail due to user being blacklisted
      await (0, chai_1.expect)(treasury.executeMint(request, signature)).to.be.revertedWithCustomError(
        token,
        "AccountBlacklisted"
      );
    });
  });
  // Helper function to sign mint requests
  async function signMintRequest(request, signer) {
    const domain = {
      name: "TreasuryController",
      version: "1",
      chainId: (await hardhat_1.ethers.provider.getNetwork()).chainId,
      verifyingContract: await treasury.getAddress(),
    };
    const types = {
      MintRequest: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "reserveHash", type: "bytes32" },
      ],
    };
    return await signer.signTypedData(domain, types, request);
  }
});
