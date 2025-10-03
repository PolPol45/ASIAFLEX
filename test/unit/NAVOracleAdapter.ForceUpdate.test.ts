import { expect } from "chai";
import { ethers } from "hardhat";
import { NAVOracleAdapter } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NAVOracleAdapter - Force Update Enhancement", function () {
  let oracle: NAVOracleAdapter;
  let oracleUpdater: SignerWithAddress;
  let oracleManager: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_NAV = ethers.parseEther("100"); // $100
  const STALENESS_THRESHOLD = 86400; // 24 hours
  const DEVIATION_THRESHOLD = 1000; // 10%

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    oracleUpdater = signers[1];
    oracleManager = signers[2];
    user = signers[3];

    const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
    oracle = await NAVOracleAdapterFactory.deploy(INITIAL_NAV, STALENESS_THRESHOLD, DEVIATION_THRESHOLD);

    // Setup roles
    const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
    const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();

    await oracle.grantRole(ORACLE_UPDATER_ROLE, oracleUpdater.address);
    await oracle.grantRole(ORACLE_MANAGER_ROLE, oracleManager.address);
  });

  describe("Force Update with Reason", function () {
    it("Should allow manager to force update with reason", async function () {
      const newNAV = ethers.parseEther("150"); // +50% (exceeds deviation)
      const reason = "Emergency: API failure, manual verification from multiple sources";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason))
        .to.emit(oracle, "NAVUpdated")
        .withArgs((await ethers.provider.getBlock("latest"))!.timestamp + 1, INITIAL_NAV, newNAV);
    });

    it("Should emit NAVForceUpdated event with deviation and reason", async function () {
      const newNAV = ethers.parseEther("150"); // +50%
      const reason = "Emergency: Market conditions require immediate update";
      const expectedDeviation = 5000; // 50% = 5000 bps

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          INITIAL_NAV,
          newNAV,
          expectedDeviation,
          oracleManager.address,
          reason
        );
    });

    it("Should update NAV state correctly", async function () {
      const newNAV = ethers.parseEther("80"); // -20%
      const reason = "Verified manual update";

      await oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason);

      const [nav, timestamp] = await oracle.getNAV();
      expect(nav).to.equal(newNAV);
      expect(timestamp).to.be.closeTo(await ethers.provider.getBlock("latest").then((b) => b!.timestamp), 2);
    });

    it("Should reject force update from non-manager", async function () {
      const newNAV = ethers.parseEther("150");
      const reason = "Unauthorized attempt";

      await expect(oracle.connect(oracleUpdater).forceUpdateNAV(newNAV, reason)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );

      await expect(oracle.connect(user).forceUpdateNAV(newNAV, reason)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should allow force update even with extreme deviation", async function () {
      const extremeNAV = ethers.parseEther("200"); // +100% (far exceeds 10% limit)
      const reason = "Critical: Major market event, verified from official sources";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(extremeNAV, reason))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          INITIAL_NAV,
          extremeNAV,
          10000, // 100% = 10000 bps
          oracleManager.address,
          reason
        );

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(extremeNAV);
    });

    it("Should log empty reason if provided", async function () {
      const newNAV = ethers.parseEther("150");
      const reason = "";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason)).to.emit(oracle, "NAVForceUpdated");
    });

    it("Should handle multiple force updates", async function () {
      // First force update
      const nav1 = ethers.parseEther("150");
      const reason1 = "First emergency update";
      await oracle.connect(oracleManager).forceUpdateNAV(nav1, reason1);

      // Second force update
      const nav2 = ethers.parseEther("180");
      const reason2 = "Second emergency update";
      await expect(oracle.connect(oracleManager).forceUpdateNAV(nav2, reason2))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          nav1,
          nav2,
          2000, // 20% from nav1
          oracleManager.address,
          reason2
        );

      const [nav] = await oracle.getNAV();
      expect(nav).to.equal(nav2);
    });

    it("Should work when oracle is paused", async function () {
      // Pause oracle
      await oracle.connect(oracleManager).pause();

      // Regular update should fail
      await expect(oracle.connect(oracleUpdater).updateNAV(ethers.parseEther("105"))).to.be.revertedWithCustomError(
        oracle,
        "EnforcedPause"
      );

      // But force update should still fail when paused (it doesn't have whenNotPaused modifier in current implementation)
      // This is actually a potential issue - force update can bypass pause
      // Let's test the actual behavior
      const newNAV = ethers.parseEther("150");
      const reason = "Emergency update during pause";

      // If forceUpdateNAV doesn't have whenNotPaused, it will succeed
      // This might be intended behavior for emergency situations
      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason)).to.emit(oracle, "NAVForceUpdated");
    });

    it("Should calculate deviation correctly for increase", async function () {
      const newNAV = ethers.parseEther("120"); // +20%
      const reason = "20% increase";
      const expectedDeviation = 2000; // 20% = 2000 bps

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          INITIAL_NAV,
          newNAV,
          expectedDeviation,
          oracleManager.address,
          reason
        );
    });

    it("Should calculate deviation correctly for decrease", async function () {
      const newNAV = ethers.parseEther("70"); // -30%
      const reason = "30% decrease";
      const expectedDeviation = 3000; // 30% = 3000 bps

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, reason))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          INITIAL_NAV,
          newNAV,
          expectedDeviation,
          oracleManager.address,
          reason
        );
    });

    it("Should handle zero deviation (same NAV)", async function () {
      const sameNAV = INITIAL_NAV;
      const reason = "Redundant update";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(sameNAV, reason))
        .to.emit(oracle, "NAVForceUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          INITIAL_NAV,
          sameNAV,
          0, // 0% deviation
          oracleManager.address,
          reason
        );
    });
  });

  describe("Integration with Normal Updates", function () {
    it("Should allow normal update after force update", async function () {
      // Force update with large deviation
      const forcedNAV = ethers.parseEther("150");
      await oracle.connect(oracleManager).forceUpdateNAV(forcedNAV, "Emergency");

      // Normal update within deviation from forced NAV
      const normalNAV = ethers.parseEther("155"); // +3.33% from 150
      await expect(oracle.connect(oracleUpdater).updateNAV(normalNAV)).to.emit(oracle, "NAVUpdated");
    });

    it("Should allow force update after normal update", async function () {
      // Normal update within limits
      const normalNAV = ethers.parseEther("108");
      await oracle.connect(oracleUpdater).updateNAV(normalNAV);

      // Force update
      const forcedNAV = ethers.parseEther("150");
      await expect(oracle.connect(oracleManager).forceUpdateNAV(forcedNAV, "Emergency")).to.emit(
        oracle,
        "NAVForceUpdated"
      );
    });

    it("Should preserve staleness reset on force update", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [STALENESS_THRESHOLD + 1]);
      await ethers.provider.send("evm_mine", []);

      // Oracle should be stale
      expect(await oracle.isStale()).to.be.true;

      // Force update should reset staleness
      const newNAV = ethers.parseEther("150");
      await oracle.connect(oracleManager).forceUpdateNAV(newNAV, "Reset staleness");

      // Should no longer be stale
      expect(await oracle.isStale()).to.be.false;
    });
  });

  describe("Reason String Handling", function () {
    it("Should handle very long reasons", async function () {
      const newNAV = ethers.parseEther("150");
      const longReason = "A".repeat(1000); // 1000 character reason

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, longReason)).to.emit(oracle, "NAVForceUpdated");
    });

    it("Should handle special characters in reason", async function () {
      const newNAV = ethers.parseEther("150");
      const specialReason = "Emergency: Market ↓50%, API failed, verified via Bloomberg & Reuters";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, specialReason)).to.emit(
        oracle,
        "NAVForceUpdated"
      );
    });

    it("Should handle multiline reasons", async function () {
      const newNAV = ethers.parseEther("150");
      const multilineReason = "Emergency Update\nReason: API failure\nVerified: Manual check";

      await expect(oracle.connect(oracleManager).forceUpdateNAV(newNAV, multilineReason)).to.emit(
        oracle,
        "NAVForceUpdated"
      );
    });
  });
});
