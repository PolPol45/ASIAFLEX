import { ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AsiaFlexToken, NAVOracleAdapter, TreasuryController } from "../../typechain-types";

type LegacyMintParams = {
  token: AsiaFlexToken;
  recipient: string;
  amount: bigint;
};

const legacyMint = ({ token, recipient, amount }: LegacyMintParams) =>
  token["mint(address,uint256)"](recipient, amount);

describe("AsiaFlex Integration Tests", function () {
  let token: AsiaFlexToken;
  let oracle: NAVOracleAdapter;
  let treasury: TreasuryController;

  let deployer: SignerWithAddress;
  let treasurySigner: SignerWithAddress;
  let oracleUpdater: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const SUPPLY_CAP = ethers.parseEther("1000000"); // 1M tokens
  const MAX_DAILY_MINT = ethers.parseEther("10000"); // 10K tokens
  const MAX_DAILY_NET_INFLOWS = ethers.parseEther("50000"); // 50K tokens
  const INITIAL_NAV = ethers.parseEther("100"); // $100
  const STALENESS_THRESHOLD = 86400; // 24 hours
  const DEVIATION_THRESHOLD = 1000; // 10%
  const REQUEST_EXPIRATION = 3600; // 1 hour

  beforeEach(async function () {
    [deployer, treasurySigner, oracleUpdater, user1, user2] = await ethers.getSigners();

    // Deploy AsiaFlexToken
    const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
    token = await AsiaFlexTokenFactory.deploy(
      "AsiaFlexToken",
      "AFX",
      SUPPLY_CAP,
      MAX_DAILY_MINT,
      MAX_DAILY_NET_INFLOWS
    );

    // Deploy NAVOracleAdapter
    const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
    oracle = await NAVOracleAdapterFactory.deploy(INITIAL_NAV, STALENESS_THRESHOLD, DEVIATION_THRESHOLD);

    // Deploy TreasuryController
    const TreasuryControllerFactory = await ethers.getContractFactory("TreasuryController");
    treasury = await TreasuryControllerFactory.deploy(
      await token.getAddress(),
      treasurySigner.address,
      REQUEST_EXPIRATION
    );

    // Setup roles
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();

    await token.grantRole(TREASURY_ROLE, await treasury.getAddress());
    await oracle.grantRole(ORACLE_UPDATER_ROLE, oracleUpdater.address);
  });

  describe("Full System Workflow", function () {
    it("Should handle complete NAV update → mint → transfer → redeem cycle", async function () {
      console.log("🚀 Starting full system integration test");

      // Step 1: Update NAV
      console.log("📊 Step 1: Update NAV to $105");
      const newNAV = ethers.parseEther("105");
      await expect(oracle.connect(oracleUpdater).updateNAV(newNAV)).to.emit(oracle, "NAVUpdated");

      const [currentNAV] = await oracle.getNAV();
      expect(currentNAV).to.equal(newNAV);
      console.log(`✅ NAV updated to $${ethers.formatEther(currentNAV)}`);

      // Step 2: Execute mint through TreasuryController
      console.log("🪙 Step 2: Execute mint via TreasuryController");
      const mintAmount = ethers.parseEther("1000");
      const reserveHash = ethers.keccak256(ethers.toUtf8Bytes("reserve-proof-12345"));

      const mintTimestamp = await time.latest();
      const mintRequest = {
        to: user1.address,
        amount: mintAmount,
        timestamp: mintTimestamp,
        reserveHash: reserveHash,
      };

      const mintSignature = await signMintRequest(mintRequest, treasurySigner);

      await expect(treasury.executeMint(mintRequest, mintSignature))
        .to.emit(treasury, "MintExecuted")
        .withArgs(user1.address, mintAmount, reserveHash)
        .and.to.emit(token, "Mint")
        .withArgs(user1.address, mintAmount, reserveHash);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
      console.log(`✅ Minted ${ethers.formatEther(mintAmount)} AFX to user1`);

      // Step 3: User transfers tokens
      console.log("💸 Step 3: User1 transfers tokens to User2");
      const transferAmount = ethers.parseEther("300");

      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      expect(await token.balanceOf(user1.address)).to.equal(mintAmount - transferAmount);
      expect(await token.balanceOf(user2.address)).to.equal(transferAmount);
      console.log(`✅ Transferred ${ethers.formatEther(transferAmount)} AFX from user1 to user2`);

      // Step 4: Execute redeem through TreasuryController
      console.log("🔥 Step 4: Execute redeem via TreasuryController");
      const redeemAmount = ethers.parseEther("200");
      const redeemHash = ethers.keccak256(ethers.toUtf8Bytes("redeem-proof-67890"));

      const redeemTimestamp = await time.latest();
      const redeemRequest = {
        from: user1.address,
        amount: redeemAmount,
        timestamp: redeemTimestamp,
        reserveHash: redeemHash,
      };

      const redeemSignature = await signRedeemRequest(redeemRequest, treasurySigner);

      const user1BalanceBefore = await token.balanceOf(user1.address);
      await expect(treasury.executeRedeem(redeemRequest, redeemSignature))
        .to.emit(treasury, "RedeemExecuted")
        .withArgs(user1.address, redeemAmount, redeemHash)
        .and.to.emit(token, "Burn")
        .withArgs(user1.address, redeemAmount, redeemHash);

      expect(await token.balanceOf(user1.address)).to.equal(user1BalanceBefore - redeemAmount);
      console.log(`✅ Redeemed ${ethers.formatEther(redeemAmount)} AFX from user1`);

      // Step 5: Verify final state
      console.log("📋 Step 5: Verify final system state");
      const totalSupply = await token.totalSupply();
      const expectedSupply = mintAmount - redeemAmount; // 1000 - 200 = 800

      expect(totalSupply).to.equal(expectedSupply);
      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("500")); // 1000 - 300 - 200
      expect(await token.balanceOf(user2.address)).to.equal(ethers.parseEther("300")); // transferred amount

      console.log(`✅ Final total supply: ${ethers.formatEther(totalSupply)} AFX`);
      console.log(`✅ User1 balance: ${ethers.formatEther(await token.balanceOf(user1.address))} AFX`);
      console.log(`✅ User2 balance: ${ethers.formatEther(await token.balanceOf(user2.address))} AFX`);
      console.log("🎉 Full system integration test completed successfully!");
    });

    it("Should handle circuit breaker scenarios", async function () {
      console.log("🔒 Testing circuit breaker scenarios");

      // Test daily mint cap
      const largeAmount = MAX_DAILY_MINT + ethers.parseEther("1");
      const largeRequestTimestamp = await time.latest();
      const mintRequest = {
        to: user1.address,
        amount: largeAmount,
        timestamp: largeRequestTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("test")),
      };

      const signature = await signMintRequest(mintRequest, treasurySigner);

      await expect(treasury.executeMint(mintRequest, signature)).to.be.revertedWithCustomError(
        token,
        "DailyCapsExceeded"
      );

      console.log("✅ Daily mint cap enforced correctly");

      // Test successful mint within cap
      const validAmount = MAX_DAILY_MINT;
      const validRequestTimestamp = await time.latest();
      const validRequest = {
        to: user1.address,
        amount: validAmount,
        timestamp: validRequestTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("test-valid")),
      };

      const validSignature = await signMintRequest(validRequest, treasurySigner);

      await expect(treasury.executeMint(validRequest, validSignature)).to.emit(token, "Mint");

      console.log("✅ Valid mint within cap executed successfully");

      // Verify remaining capacity
      const remaining = await token.getRemainingDailyMint();
      expect(remaining).to.equal(0);
      console.log("✅ Daily mint capacity fully utilized");
    });

    it("Should handle oracle staleness and deviation checks", async function () {
      console.log("🔮 Testing oracle staleness and deviation scenarios");

      // Test normal update
      const validNAV = ethers.parseEther("105"); // 5% increase
      await expect(oracle.connect(oracleUpdater).updateNAV(validNAV)).to.emit(oracle, "NAVUpdated");

      console.log("✅ Valid NAV update executed");

      // Test deviation threshold
      const invalidNAV = ethers.parseEther("120"); // 20% increase (> 10% threshold)
      await expect(oracle.connect(oracleUpdater).updateNAV(invalidNAV)).to.be.revertedWithCustomError(
        oracle,
        "DeviationTooHigh"
      );

      console.log("✅ Deviation threshold enforced correctly");

      // Test staleness
      expect(await oracle.isStale()).to.be.false;

      // Fast forward past staleness threshold
      await network.provider.send("evm_increaseTime", [STALENESS_THRESHOLD + 1]);
      await network.provider.send("evm_mine");

      expect(await oracle.isStale()).to.be.true;
      console.log("✅ Staleness detection working correctly");

      // Fresh update should reset staleness
      const freshNAV = ethers.parseEther("106");
      await expect(oracle.connect(oracleUpdater).updateNAV(freshNAV)).to.emit(oracle, "NAVUpdated");

      expect(await oracle.isStale()).to.be.false;
      console.log("✅ Fresh update resets staleness");
    });

    it("Should handle pause/unpause scenarios across all contracts", async function () {
      console.log("⏸️ Testing system-wide pause scenarios");

      // Setup: mint some tokens first
      const mintAmount = ethers.parseEther("1000");
      const initialMintTimestamp = await time.latest();
      const mintRequest = {
        to: user1.address,
        amount: mintAmount,
        timestamp: initialMintTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("initial-mint")),
      };
      const signature = await signMintRequest(mintRequest, treasurySigner);
      await treasury.executeMint(mintRequest, signature);

      // Test 1: Pause token contract
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      await token.grantRole(PAUSER_ROLE, deployer.address);
      await token.pause();

      // Transfers should fail
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      // Mints through treasury should fail
      const pausedMintTimestamp = await time.latest();
      const newMintRequest = {
        to: user2.address,
        amount: ethers.parseEther("500"),
        timestamp: pausedMintTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("paused-mint")),
      };
      const newSignature = await signMintRequest(newMintRequest, treasurySigner);
      await expect(treasury.executeMint(newMintRequest, newSignature)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause"
      );

      console.log("✅ Token pause prevents transfers and mints");

      // Unpause token
      await token.unpause();

      // Now transfers should work
      await expect(token.connect(user1).transfer(user2.address, ethers.parseEther("100"))).to.emit(token, "Transfer");

      console.log("✅ Token unpause restores functionality");

      // Test 2: Pause oracle
      const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();
      await oracle.grantRole(ORACLE_MANAGER_ROLE, deployer.address);
      await oracle.pause();

      // NAV updates should fail
      await expect(oracle.connect(oracleUpdater).updateNAV(ethers.parseEther("110"))).to.be.revertedWithCustomError(
        oracle,
        "EnforcedPause"
      );

      console.log("✅ Oracle pause prevents NAV updates");

      // Force update should still work for emergency
      await expect(oracle.forceUpdateNAV(ethers.parseEther("110"))).to.emit(oracle, "NAVUpdated");

      console.log("✅ Emergency force update works even when paused");

      // Test 3: Pause treasury
      const TREASURY_MANAGER_ROLE = await treasury.TREASURY_MANAGER_ROLE();
      await treasury.grantRole(TREASURY_MANAGER_ROLE, deployer.address);
      await treasury.pause();

      // Normal operations should fail
      const treasuryPausedTimestamp = await time.latest();
      const pausedMintRequest = {
        to: user2.address,
        amount: ethers.parseEther("500"),
        timestamp: treasuryPausedTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("treasury-paused")),
      };
      const pausedSignature = await signMintRequest(pausedMintRequest, treasurySigner);
      await expect(treasury.executeMint(pausedMintRequest, pausedSignature)).to.be.revertedWithCustomError(
        treasury,
        "EnforcedPause"
      );

      // Emergency functions should work
      await expect(
        treasury.emergencyMint(
          user2.address,
          ethers.parseEther("500"),
          ethers.keccak256(ethers.toUtf8Bytes("emergency"))
        )
      ).to.emit(treasury, "MintExecuted");

      console.log("✅ Treasury pause prevents normal operations but allows emergency functions");
    });

    it("Should handle blacklist scenarios", async function () {
      console.log("🚫 Testing blacklist scenarios");

      // Mint tokens to user1
      const mintAmount = ethers.parseEther("1000");
      const blacklistMintTimestamp = await time.latest();
      const mintRequest = {
        to: user1.address,
        amount: mintAmount,
        timestamp: blacklistMintTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("blacklist-test")),
      };
      const signature = await signMintRequest(mintRequest, treasurySigner);
      await treasury.executeMint(mintRequest, signature);

      // Blacklist user1
      const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
      await token.grantRole(BLACKLIST_MANAGER_ROLE, deployer.address);
      await token.setBlacklisted(user1.address, true);

      // Transfers should fail
      await expect(
        token.connect(user1).transfer(user2.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccountBlacklisted");

      // Mints to blacklisted user should fail
      const blacklistedMintTimestamp = await time.latest();
      const blacklistedMintRequest = {
        to: user1.address,
        amount: ethers.parseEther("500"),
        timestamp: blacklistedMintTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("blacklisted-mint")),
      };
      const blacklistedSignature = await signMintRequest(blacklistedMintRequest, treasurySigner);
      await expect(treasury.executeMint(blacklistedMintRequest, blacklistedSignature)).to.be.revertedWithCustomError(
        token,
        "AccountBlacklisted"
      );

      // Burns from blacklisted user should fail
      const blacklistedBurnTimestamp = await time.latest();
      const burnRequest = {
        from: user1.address,
        amount: ethers.parseEther("500"),
        timestamp: blacklistedBurnTimestamp,
        reserveHash: ethers.keccak256(ethers.toUtf8Bytes("blacklisted-burn")),
      };
      const burnSignature = await signRedeemRequest(burnRequest, treasurySigner);
      await expect(treasury.executeRedeem(burnRequest, burnSignature)).to.be.revertedWithCustomError(
        token,
        "AccountBlacklisted"
      );

      console.log("✅ Blacklist prevents all token operations");

      // Remove from blacklist
      await token.setBlacklisted(user1.address, false);

      // Operations should work again
      await expect(token.connect(user1).transfer(user2.address, ethers.parseEther("100"))).to.emit(token, "Transfer");

      console.log("✅ Removing from blacklist restores functionality");
    });
  });

  describe("Legacy Compatibility", function () {
    it("Should maintain backward compatibility with existing scripts", async function () {
      console.log("🔄 Testing legacy compatibility");

      // Setup reserves and price (legacy pattern)
      await token.setReserves(ethers.parseEther("100000"));
      await token.setPrice(ethers.parseEther("100"));

      // Legacy mint
      await expect(legacyMint({ token, recipient: user1.address, amount: ethers.parseEther("500") }))
        .to.emit(token, "Mint")
        .withArgs(user1.address, ethers.parseEther("500"), ethers.ZeroHash);

      // Legacy mintByUSD
      await expect(token.mintByUSD(user1.address, ethers.parseEther("1000"))) // $1000
        .to.emit(token, "Mint")
        .withArgs(user1.address, ethers.parseEther("10"), ethers.ZeroHash); // 10 tokens at $100 each

      // Legacy burnFrom
      await expect(token.burnFrom(user1.address, ethers.parseEther("100")))
        .to.emit(token, "Burn")
        .withArgs(user1.address, ethers.parseEther("100"), ethers.ZeroHash);

      // Legacy redeem flow
      await expect(token.connect(user1).redeemRequest(ethers.parseEther("200"))).to.emit(token, "RedeemRequested");

      const currentBlock = await ethers.provider.getBlockNumber();
      await expect(token.processRedeem(user1.address, currentBlock)).to.emit(token, "RedeemProcessed");

      console.log("✅ All legacy functions work correctly");
    });
  });

  // Helper functions for signing requests
  async function signMintRequest(request: any, signer: SignerWithAddress) {
    const domain = {
      name: "TreasuryController",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
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

  async function signRedeemRequest(request: any, signer: SignerWithAddress) {
    const domain = {
      name: "TreasuryController",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
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
});
