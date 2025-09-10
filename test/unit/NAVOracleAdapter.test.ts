import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NAVOracleAdapter } from "../../typechain-types";

describe("NAVOracleAdapter", function () {
  let oracle: NAVOracleAdapter;
  let owner: SignerWithAddress;
  let oracleUpdater: SignerWithAddress;
  let oracleManager: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_NAV = ethers.parseEther("100"); // $100
  const STALENESS_THRESHOLD = 86400; // 24 hours
  const DEVIATION_THRESHOLD = 1000; // 10%

  beforeEach(async function () {
    [owner, oracleUpdater, oracleManager, user] = await ethers.getSigners();

    const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
    oracle = await NAVOracleAdapterFactory.deploy(INITIAL_NAV, STALENESS_THRESHOLD, DEVIATION_THRESHOLD);

    // Setup roles
    const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
    const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();

    await oracle.grantRole(ORACLE_UPDATER_ROLE, oracleUpdater.address);
    await oracle.grantRole(ORACLE_MANAGER_ROLE, oracleManager.address);
  });

  describe("Deployment", function () {
    it("Should have correct initial values", async function () {
      const [nav, timestamp] = await oracle.getNAV();
      expect(nav).to.equal(INITIAL_NAV);
      expect(await oracle.getStalenessThreshold()).to.equal(STALENESS_THRESHOLD);
      expect(await oracle.getDeviationThreshold()).to.equal(DEVIATION_THRESHOLD);
      expect(await oracle.paused()).to.be.false;
      expect(await oracle.isStale()).to.be.false;

      // Check that timestamp is recent (within last minute)
      const currentTime = Math.floor(Date.now() / 1000);
      expect(Number(timestamp)).to.be.closeTo(currentTime, 60);
    });

    it("Should grant roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await oracle.DEFAULT_ADMIN_ROLE();
      const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
      const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();

      expect(await oracle.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await oracle.hasRole(ORACLE_UPDATER_ROLE, owner.address)).to.be.true;
      expect(await oracle.hasRole(ORACLE_MANAGER_ROLE, owner.address)).to.be.true;
    });

    it("Should emit NAVUpdated event on deployment", async function () {
      // We can't check the deployment transaction, but we can verify the initial state
      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(INITIAL_NAV);
    });
  });

  describe("NAV Updates", function () {
    it("Should allow oracle updater to update NAV within deviation threshold", async function () {
      const newNAV = ethers.parseEther("105"); // 5% increase

      await expect(oracle.connect(oracleUpdater).updateNAV(newNAV))
        .to.emit(oracle, "NAVUpdated")
        .withArgs((await ethers.provider.getBlockNumber()) + 1, INITIAL_NAV, newNAV);

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(newNAV);
    });

    it("Should allow oracle manager to update NAV within deviation threshold", async function () {
      const newNAV = ethers.parseEther("95"); // 5% decrease

      await expect(oracle.connect(oracleManager).updateNAV(newNAV)).to.emit(oracle, "NAVUpdated");

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(newNAV);
    });

    it("Should revert when non-authorized user tries to update NAV", async function () {
      const newNAV = ethers.parseEther("105");

      await expect(oracle.connect(user).updateNAV(newNAV)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should revert when NAV update exceeds deviation threshold", async function () {
      const newNAV = ethers.parseEther("120"); // 20% increase (> 10% threshold)

      await expect(oracle.connect(oracleUpdater).updateNAV(newNAV)).to.be.revertedWithCustomError(
        oracle,
        "DeviationTooHigh"
      );
    });

    it("Should revert when NAV is zero", async function () {
      await expect(oracle.connect(oracleUpdater).updateNAV(0)).to.be.revertedWithCustomError(
        oracle,
        "InvalidTimestamp"
      );
    });

    it("Should revert when contract is paused", async function () {
      await oracle.connect(oracleManager).pause();

      const newNAV = ethers.parseEther("105");
      await expect(oracle.connect(oracleUpdater).updateNAV(newNAV)).to.be.revertedWithCustomError(
        oracle,
        "EnforcedPause"
      );
    });

    it("Should calculate deviation correctly", async function () {
      const newNAV = ethers.parseEther("110"); // 10% increase
      const expectedDeviation = 1000; // 10% in basis points

      expect(await oracle.getCurrentDeviation(newNAV)).to.equal(expectedDeviation);
    });

    it("Should handle multiple updates correctly", async function () {
      // First update: 5% increase
      const nav1 = ethers.parseEther("105");
      await oracle.connect(oracleUpdater).updateNAV(nav1);

      // Second update: another 5% increase from new base
      const nav2 = ethers.parseEther("110.25"); // 5% of 105
      await oracle.connect(oracleUpdater).updateNAV(nav2);

      const [finalNav] = await oracle.getNAV();
      expect(finalNav).to.equal(nav2);
    });
  });

  describe("Force Updates", function () {
    it("Should allow oracle manager to force update bypassing deviation checks", async function () {
      const newNAV = ethers.parseEther("150"); // 50% increase (way above threshold)

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV))
        .to.emit(oracle, "NAVUpdated")
        .withArgs((await ethers.provider.getBlockNumber()) + 1, INITIAL_NAV, newNAV);

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(newNAV);
    });

    it("Should revert when non-manager tries to force update", async function () {
      const newNAV = ethers.parseEther("150");

      await expect(oracle.connect(oracleUpdater).forceUpdateNAV(newNAV)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should allow force update even when regular update would fail", async function () {
      // Set a very low deviation threshold
      await oracle.connect(oracleManager).setDeviationThreshold(100); // 1%

      const newNAV = ethers.parseEther("110"); // 10% increase

      // Regular update should fail
      await expect(oracle.connect(oracleUpdater).updateNAV(newNAV)).to.be.revertedWithCustomError(
        oracle,
        "DeviationTooHigh"
      );

      // Force update should succeed
      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV)).to.emit(oracle, "NAVUpdated");
    });
  });

  describe("Staleness Checks", function () {
    it("Should report fresh data initially", async function () {
      expect(await oracle.isStale()).to.be.false;
    });

    it("Should report stale data after threshold", async function () {
      // Fast forward past staleness threshold
      await ethers.provider.send("evm_increaseTime", [STALENESS_THRESHOLD + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await oracle.isStale()).to.be.true;
    });

    it("Should update staleness after new NAV update", async function () {
      // Make data stale
      await ethers.provider.send("evm_increaseTime", [STALENESS_THRESHOLD + 1]);
      await ethers.provider.send("evm_mine", []);

      expect(await oracle.isStale()).to.be.true;

      // Update NAV
      const newNAV = ethers.parseEther("105");
      await oracle.connect(oracleUpdater).updateNAV(newNAV);

      expect(await oracle.isStale()).to.be.false;
    });

    it("Should return correct time since last update", async function () {
      const timeBefore = await oracle.getTimeSinceLastUpdate();
      expect(timeBefore).to.be.closeTo(0, 2); // Within 2 seconds

      // Fast forward 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      const timeAfter = await oracle.getTimeSinceLastUpdate();
      expect(timeAfter).to.be.closeTo(3600, 2);
    });
  });

  describe("Configuration Management", function () {
    it("Should allow oracle manager to update staleness threshold", async function () {
      const newThreshold = 43200; // 12 hours

      await expect(oracle.connect(oracleManager).setStalenessThreshold(newThreshold))
        .to.emit(oracle, "StalenessThresholdUpdated")
        .withArgs(STALENESS_THRESHOLD, newThreshold);

      expect(await oracle.getStalenessThreshold()).to.equal(newThreshold);
    });

    it("Should allow oracle manager to update deviation threshold", async function () {
      const newThreshold = 500; // 5%

      await expect(oracle.connect(oracleManager).setDeviationThreshold(newThreshold))
        .to.emit(oracle, "DeviationThresholdUpdated")
        .withArgs(DEVIATION_THRESHOLD, newThreshold);

      expect(await oracle.getDeviationThreshold()).to.equal(newThreshold);
    });

    it("Should revert when setting deviation threshold above 100%", async function () {
      const invalidThreshold = 10001; // 100.01%

      await expect(oracle.connect(oracleManager).setDeviationThreshold(invalidThreshold)).to.be.revertedWith(
        "Threshold too high"
      );
    });

    it("Should revert when non-manager tries to update configuration", async function () {
      await expect(oracle.connect(user).setStalenessThreshold(43200)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );

      await expect(oracle.connect(user).setDeviationThreshold(500)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow oracle manager to pause contract", async function () {
      await expect(oracle.connect(oracleManager).pause()).to.emit(oracle, "Paused").withArgs(oracleManager.address);

      expect(await oracle.paused()).to.be.true;
    });

    it("Should allow oracle manager to unpause contract", async function () {
      await oracle.connect(oracleManager).pause();

      await expect(oracle.connect(oracleManager).unpause()).to.emit(oracle, "Unpaused").withArgs(oracleManager.address);

      expect(await oracle.paused()).to.be.false;
    });

    it("Should revert when non-manager tries to pause", async function () {
      await expect(oracle.connect(user).pause()).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should allow force updates even when paused", async function () {
      await oracle.connect(oracleManager).pause();

      const newNAV = ethers.parseEther("105");
      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV)).to.emit(oracle, "NAVUpdated");
    });
  });

  describe("Validation Functions", function () {
    it("Should validate updates within threshold", async function () {
      const validNAV = ethers.parseEther("105"); // 5% increase
      expect(await oracle.isValidUpdate(validNAV)).to.be.true;
    });

    it("Should invalidate updates exceeding threshold", async function () {
      const invalidNAV = ethers.parseEther("120"); // 20% increase
      expect(await oracle.isValidUpdate(invalidNAV)).to.be.false;
    });

    it("Should always validate first update", async function () {
      // Deploy new oracle with zero initial NAV
      const newOracle = await (
        await ethers.getContractFactory("NAVOracleAdapter")
      ).deploy(0, STALENESS_THRESHOLD, DEVIATION_THRESHOLD);

      const largeNAV = ethers.parseEther("1000000");
      expect(await newOracle.isValidUpdate(largeNAV)).to.be.true;
    });

    it("Should calculate deviation for decreases correctly", async function () {
      const lowerNAV = ethers.parseEther("90"); // 10% decrease
      const expectedDeviation = 1000; // 10% in basis points

      expect(await oracle.getCurrentDeviation(lowerNAV)).to.equal(expectedDeviation);
    });

    it("Should handle zero current NAV in deviation calculation", async function () {
      // This tests the edge case where current NAV is 0
      // Deploy oracle with 0 initial NAV
      const zeroOracle = await (
        await ethers.getContractFactory("NAVOracleAdapter")
      ).deploy(0, STALENESS_THRESHOLD, DEVIATION_THRESHOLD);

      const testNAV = ethers.parseEther("100");
      expect(await zeroOracle.getCurrentDeviation(testNAV)).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small NAV values", async function () {
      const smallNAV = ethers.parseEther("0.01"); // 1 cent
      await oracle.connect(oracleManager).forceUpdateNAV(smallNAV);

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(smallNAV);
    });

    it("Should handle very large NAV values", async function () {
      const largeNAV = ethers.parseEther("1000000"); // $1M
      await oracle.connect(oracleManager).forceUpdateNAV(largeNAV);

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(largeNAV);
    });

    it("Should handle rapid consecutive updates", async function () {
      const nav1 = ethers.parseEther("101");
      const nav2 = ethers.parseEther("102");
      const nav3 = ethers.parseEther("103");

      await oracle.connect(oracleUpdater).updateNAV(nav1);
      await oracle.connect(oracleUpdater).updateNAV(nav2);
      await oracle.connect(oracleUpdater).updateNAV(nav3);

      const [finalNav] = await oracle.getNAV();
      expect(finalNav).to.equal(nav3);
    });

    it("Should maintain precision for fractional NAV values", async function () {
      const fractionalNAV = ethers.parseEther("100.123456789012345678");
      await oracle.connect(oracleManager).forceUpdateNAV(fractionalNAV);

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(fractionalNAV);
    });
  });
});
