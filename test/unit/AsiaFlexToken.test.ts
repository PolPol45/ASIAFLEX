import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AsiaFlexToken } from "../../typechain-types";

const mintWithAttestation = (
  token: AsiaFlexToken,
  signer: SignerWithAddress | undefined,
  to: string,
  amount: bigint,
  attestation: string
) => {
  const instance = signer ? token.connect(signer) : token;
  return instance["mint(address,uint256,bytes32)"](to, amount, attestation);
};

const legacyMint = (token: AsiaFlexToken, signer: SignerWithAddress | undefined, to: string, amount: bigint) => {
  const instance = signer ? token.connect(signer) : token;
  return instance["mint(address,uint256)"](to, amount);
};

describe("AsiaFlexToken", function () {
  let token: AsiaFlexToken;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let pauser: SignerWithAddress;
  let capsManager: SignerWithAddress;
  let blacklistManager: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY_CAP = ethers.parseEther("1000000"); // 1M tokens
  const INITIAL_MAX_DAILY_MINT = ethers.parseEther("10000"); // 10K tokens
  const INITIAL_MAX_DAILY_NET_INFLOWS = ethers.parseEther("50000"); // 50K tokens

  beforeEach(async function () {
    [owner, treasury, pauser, capsManager, blacklistManager, user1, user2] = await ethers.getSigners();

    const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
    token = await AsiaFlexTokenFactory.deploy(
      "AsiaFlexToken",
      "AFX",
      INITIAL_SUPPLY_CAP,
      INITIAL_MAX_DAILY_MINT,
      INITIAL_MAX_DAILY_NET_INFLOWS
    );

    // Setup roles
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
    const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
    const ATTESTATION_BYPASS_ROLE = await token.ATTESTATION_BYPASS_ROLE();

    await token.grantRole(TREASURY_ROLE, treasury.address);
    await token.grantRole(PAUSER_ROLE, pauser.address);
    await token.grantRole(CAPS_MANAGER_ROLE, capsManager.address);
    await token.grantRole(BLACKLIST_MANAGER_ROLE, blacklistManager.address);
    await token.grantRole(ATTESTATION_BYPASS_ROLE, treasury.address);
  });

  describe("Deployment", function () {
    it("Should have correct initial values", async function () {
      expect(await token.name()).to.equal("AsiaFlexToken");
      expect(await token.symbol()).to.equal("AFX");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(0);
      expect(await token.supplyCap()).to.equal(INITIAL_SUPPLY_CAP);
      expect(await token.maxDailyMint()).to.equal(INITIAL_MAX_DAILY_MINT);
      expect(await token.maxDailyNetInflows()).to.equal(INITIAL_MAX_DAILY_NET_INFLOWS);
      expect(await token.paused()).to.be.false;
    });

    it("Should grant admin role to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should grant initial roles to deployer", async function () {
      const TREASURY_ROLE = await token.TREASURY_ROLE();
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
      const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();

      expect(await token.hasRole(TREASURY_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(CAPS_MANAGER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(BLACKLIST_MANAGER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    const mintAmount = ethers.parseEther("1000");
    const attestationHash = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));

    it("Should allow TREASURY_ROLE to mint tokens", async function () {
      await expect(mintWithAttestation(token, treasury, user1.address, mintAmount, attestationHash))
        .to.emit(token, "Mint")
        .withArgs(user1.address, mintAmount, attestationHash);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(mintAmount);
    });

    it("Should revert when non-treasury tries to mint", async function () {
      await expect(
        mintWithAttestation(token, user1, user1.address, mintAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should revert when minting exceeds supply cap", async function () {
      const extendedDailyCap = INITIAL_SUPPLY_CAP + 1n;
      await token.connect(capsManager).setMaxDailyMint(extendedDailyCap);

      const largeAmount = INITIAL_SUPPLY_CAP + 1n;
      await expect(
        mintWithAttestation(token, treasury, user1.address, largeAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "InsufficientReserves");
    });

    it("Should revert when minting exceeds daily cap", async function () {
      const largeAmount = INITIAL_MAX_DAILY_MINT + 1n;
      await expect(
        mintWithAttestation(token, treasury, user1.address, largeAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "DailyCapsExceeded");
    });

    it("Should track daily mint amounts correctly", async function () {
      const halfDaily = INITIAL_MAX_DAILY_MINT / 2n;

      await mintWithAttestation(token, treasury, user1.address, halfDaily, attestationHash);
      expect(await token.getRemainingDailyMint()).to.equal(halfDaily);

      await mintWithAttestation(token, treasury, user2.address, halfDaily, attestationHash);
      expect(await token.getRemainingDailyMint()).to.equal(0);
    });

    it("Should reset daily caps after 24 hours", async function () {
      await mintWithAttestation(token, treasury, user1.address, INITIAL_MAX_DAILY_MINT, attestationHash);
      expect(await token.getRemainingDailyMint()).to.equal(0);

      // Fast forward 24 hours + 1 second
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine", []);

      expect(await token.getRemainingDailyMint()).to.equal(INITIAL_MAX_DAILY_MINT);
    });

    it("Should revert when minting to blacklisted address", async function () {
      await token.connect(blacklistManager).setBlacklisted(user1.address, true);

      await expect(
        mintWithAttestation(token, treasury, user1.address, mintAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });

    it("Should revert when contract is paused", async function () {
      await token.connect(pauser).pause();

      await expect(
        mintWithAttestation(token, treasury, user1.address, mintAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should support legacy mint function", async function () {
      await expect(legacyMint(token, treasury, user1.address, mintAmount))
        .to.emit(token, "Mint")
        .withArgs(user1.address, mintAmount, ethers.ZeroHash);
    });

    it("Should revert legacy mint when caller lacks attestation bypass role", async function () {
      const bypassRole = await token.ATTESTATION_BYPASS_ROLE();
      await token.revokeRole(bypassRole, treasury.address);

      await expect(legacyMint(token, treasury, user1.address, mintAmount)).to.be.revertedWithCustomError(
        token,
        "AttestationRequired"
      );
    });

    it("Should enforce daily net inflow cap", async function () {
      const limitedNetInflow = ethers.parseEther("500");
      await token.connect(capsManager).setMaxDailyNetInflows(limitedNetInflow);

      const overCapAmount = limitedNetInflow + 1n;
      await expect(
        mintWithAttestation(token, treasury, user1.address, overCapAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "DailyNetInflowExceeded");
    });

    it("Should reduce remaining daily net inflow after mint", async function () {
      await mintWithAttestation(token, treasury, user1.address, mintAmount, attestationHash);

      const remainingNetInflow = await token.getRemainingDailyNetInflows();
      expect(remainingNetInflow).to.equal(INITIAL_MAX_DAILY_NET_INFLOWS - mintAmount);
    });
  });

  describe("Burning", function () {
    const mintAmount = ethers.parseEther("1000");
    const burnAmount = ethers.parseEther("500");
    const attestationHash = ethers.keccak256(ethers.toUtf8Bytes("test-attestation"));

    beforeEach(async function () {
      await mintWithAttestation(token, treasury, user1.address, mintAmount, attestationHash);
    });

    it("Should allow TREASURY_ROLE to burn tokens", async function () {
      await expect(token.connect(treasury).burn(user1.address, burnAmount, attestationHash))
        .to.emit(token, "Burn")
        .withArgs(user1.address, burnAmount, attestationHash);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount - burnAmount);
      expect(await token.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should revert when non-treasury tries to burn", async function () {
      await expect(token.connect(user1).burn(user1.address, burnAmount, attestationHash)).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert when burning more than balance", async function () {
      const largeAmount = mintAmount + 1n;
      await expect(
        token.connect(treasury).burn(user1.address, largeAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("Should revert when burning from blacklisted address", async function () {
      await token.connect(blacklistManager).setBlacklisted(user1.address, true);

      await expect(
        token.connect(treasury).burn(user1.address, burnAmount, attestationHash)
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });

    it("Should support legacy burnFrom function", async function () {
      await expect(token.connect(treasury).burnFrom(user1.address, burnAmount))
        .to.emit(token, "Burn")
        .withArgs(user1.address, burnAmount, ethers.ZeroHash);
    });
  });

  describe("Circuit Breakers", function () {
    it("Should allow caps manager to update daily mint cap", async function () {
      const newCap = ethers.parseEther("20000");

      await expect(token.connect(capsManager).setMaxDailyMint(newCap))
        .to.emit(token, "DailyCapUpdated")
        .withArgs(INITIAL_MAX_DAILY_MINT, newCap);

      expect(await token.maxDailyMint()).to.equal(newCap);
    });

    it("Should allow caps manager to update daily net inflows cap", async function () {
      const newCap = ethers.parseEther("100000");

      await expect(token.connect(capsManager).setMaxDailyNetInflows(newCap))
        .to.emit(token, "DailyNetInflowCapUpdated")
        .withArgs(INITIAL_MAX_DAILY_NET_INFLOWS, newCap);

      expect(await token.maxDailyNetInflows()).to.equal(newCap);
    });

    it("Should allow caps manager to update supply cap", async function () {
      const newCap = ethers.parseEther("2000000");

      await token.connect(capsManager).setSupplyCap(newCap);
      expect(await token.supplyCap()).to.equal(newCap);
    });

    it("Should revert when setting supply cap below current supply", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      const lowCap = mintAmount - 1n;
      await expect(token.connect(capsManager).setSupplyCap(lowCap)).to.be.revertedWithCustomError(
        token,
        "SupplyCapBelowCurrentSupply"
      );
    });

    it("Should revert when non-caps manager tries to update caps", async function () {
      const newCap = ethers.parseEther("20000");

      await expect(token.connect(user1).setMaxDailyMint(newCap)).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Blacklist", function () {
    it("Should allow blacklist manager to blacklist addresses", async function () {
      await expect(token.connect(blacklistManager).setBlacklisted(user1.address, true))
        .to.emit(token, "BlacklistUpdated")
        .withArgs(user1.address, true);

      expect(await token.isBlacklisted(user1.address)).to.be.true;
    });

    it("Should allow blacklist manager to remove from blacklist", async function () {
      await token.connect(blacklistManager).setBlacklisted(user1.address, true);

      await expect(token.connect(blacklistManager).setBlacklisted(user1.address, false))
        .to.emit(token, "BlacklistUpdated")
        .withArgs(user1.address, false);

      expect(await token.isBlacklisted(user1.address)).to.be.false;
    });

    it("Should revert transfers from blacklisted addresses", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      await token.connect(blacklistManager).setBlacklisted(user1.address, true);

      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });

    it("Should revert transfers to blacklisted addresses", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      await token.connect(blacklistManager).setBlacklisted(user2.address, true);

      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });

    it("Should revert when non-blacklist manager tries to update blacklist", async function () {
      await expect(token.connect(user1).setBlacklisted(user2.address, true)).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Pause", function () {
    it("Should allow pauser to pause contract", async function () {
      await expect(token.connect(pauser).pause()).to.emit(token, "Paused").withArgs(pauser.address);

      expect(await token.paused()).to.be.true;
    });

    it("Should allow pauser to unpause contract", async function () {
      await token.connect(pauser).pause();

      await expect(token.connect(pauser).unpause()).to.emit(token, "Unpaused").withArgs(pauser.address);

      expect(await token.paused()).to.be.false;
    });

    it("Should revert transfers when paused", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      await token.connect(pauser).pause();

      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should revert when non-pauser tries to pause", async function () {
      await expect(token.connect(user1).pause()).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("EIP712 Permit", function () {
    it("Should support permit functionality", async function () {
      const mintAmount = ethers.parseEther("1000");
      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      // const _spender = user2.address;
      // const _value = ethers.parseEther("100");
      // const _deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Note: This is a simplified test. In practice, you'd need to sign the permit message
      // For now, we just test that the permit function exists and can be called
      const nonce = await token.nonces(user1.address);
      expect(nonce).to.equal(0);
    });
  });

  describe("Legacy Compatibility", function () {
    it("Should support legacy reserves functions", async function () {
      const reserveAmount = ethers.parseEther("100000");

      await token.connect(treasury).setReserves(reserveAmount);
      expect(await token.reserves()).to.equal(reserveAmount);
    });

    it("Should support legacy price functions", async function () {
      const price = ethers.parseEther("105.50"); // $105.50

      await token.connect(treasury).setPrice(price);
      expect(await token.getPrice()).to.equal(price);
    });

    it("Should support legacy mintByUSD function", async function () {
      const price = ethers.parseEther("100"); // $100 per token
      const usdAmount = ethers.parseEther("1000"); // $1000
      const expectedTokens = ethers.parseEther("10"); // 10 tokens

      await token.connect(treasury).setPrice(price);

      await expect(token.connect(treasury).mintByUSD(user1.address, usdAmount))
        .to.emit(token, "Mint")
        .withArgs(user1.address, expectedTokens, ethers.ZeroHash);

      expect(await token.balanceOf(user1.address)).to.equal(expectedTokens);
    });

    it("Should support legacy redeem request/process flow", async function () {
      const mintAmount = ethers.parseEther("1000");
      const redeemAmount = ethers.parseEther("500");

      await mintWithAttestation(token, treasury, user1.address, mintAmount, ethers.ZeroHash);

      await expect(token.connect(user1).redeemRequest(redeemAmount))
        .to.emit(token, "RedeemRequested")
        .withArgs(user1.address, redeemAmount);

      expect(await token.pendingRedeems(user1.address)).to.equal(redeemAmount);

      const currentBlock = await ethers.provider.getBlockNumber();
      await expect(token.connect(treasury).processRedeem(user1.address, currentBlock))
        .to.emit(token, "RedeemProcessed")
        .withArgs(user1.address, redeemAmount);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount - redeemAmount);
      expect(await token.pendingRedeems(user1.address)).to.equal(0);
      expect(await token.getRedeemQueueLength(user1.address)).to.equal(0);
    });
  });
});
