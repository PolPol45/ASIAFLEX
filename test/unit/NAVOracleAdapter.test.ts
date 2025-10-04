import { ethers } from "hardhat";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { NAVOracleAdapter } from "../../typechain-types";

describe("NAVOracleAdapter", () => {
  let oracle: NAVOracleAdapter;
  let owner: SignerWithAddress;
  let manager: SignerWithAddress;
  let updater: SignerWithAddress;
  let stranger: SignerWithAddress;

  const BASKET_ID = ethers.keccak256(ethers.toUtf8Bytes("basket-1"));
  const OTHER_BASKET_ID = ethers.keccak256(ethers.toUtf8Bytes("basket-2"));
  const NAV_100 = ethers.parseEther("100");

  beforeEach(async () => {
    [owner, manager, updater, stranger] = await ethers.getSigners();
    oracle = (await ethers.deployContract("NAVOracleAdapter", [owner.address])) as NAVOracleAdapter;

    const managerRole = await oracle.ORACLE_MANAGER_ROLE();
    const updaterRole = await oracle.ORACLE_UPDATER_ROLE();

    await oracle.grantRole(managerRole, manager.address);
    await oracle.grantRole(updaterRole, updater.address);
  });

  describe("deployment", () => {
    it("assigns admin roles to the deployer", async () => {
      const defaultAdminRole = await oracle.DEFAULT_ADMIN_ROLE();
      const managerRole = await oracle.ORACLE_MANAGER_ROLE();
      const updaterRole = await oracle.ORACLE_UPDATER_ROLE();

      expect(await oracle.hasRole(defaultAdminRole, owner.address)).to.be.true;
      expect(await oracle.hasRole(managerRole, owner.address)).to.be.true;
      expect(await oracle.hasRole(updaterRole, owner.address)).to.be.true;
    });

    it("starts with empty observations", async () => {
      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.nav).to.equal(0n);
      expect(observation.timestamp).to.equal(0n);
      expect(observation.stalenessThreshold).to.equal(0n);
      expect(observation.deviationThreshold).to.equal(0n);
    });
  });

  describe("configuration", () => {
    it("allows manager to set staleness threshold", async () => {
      const newThreshold = 86_400;

      await expect(oracle.connect(manager).setStalenessThreshold(BASKET_ID, newThreshold))
        .to.emit(oracle, "StalenessThresholdUpdated")
        .withArgs(BASKET_ID, 0n, BigInt(newThreshold));

      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.stalenessThreshold).to.equal(BigInt(newThreshold));
    });

    it("allows manager to set deviation threshold", async () => {
      const newThreshold = 750; // 7.5%

      await expect(oracle.connect(manager).setDeviationThreshold(BASKET_ID, newThreshold))
        .to.emit(oracle, "DeviationThresholdUpdated")
        .withArgs(BASKET_ID, 0n, BigInt(newThreshold));

      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.deviationThreshold).to.equal(BigInt(newThreshold));
    });

    it("reverts if deviation threshold above 100%", async () => {
      await expect(oracle.connect(manager).setDeviationThreshold(BASKET_ID, 10_001)).to.be.revertedWithCustomError(
        oracle,
        "InvalidThreshold"
      );
    });

    it("isolates thresholds per basket", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500);

      const otherObservation = await oracle.getObservation(OTHER_BASKET_ID);
      expect(otherObservation.deviationThreshold).to.equal(0n);
    });

    it("blocks non-managers from configuring", async () => {
      await expect(oracle.connect(stranger).setStalenessThreshold(BASKET_ID, 100)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );

      await expect(oracle.connect(stranger).setDeviationThreshold(BASKET_ID, 100)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("NAV updates", () => {
    it("records the first update without deviation checks", async () => {
      await expect(oracle.connect(updater).updateNAV(BASKET_ID, NAV_100))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, 0n, NAV_100, anyValue);

      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.nav).to.equal(NAV_100);
      expect(observation.timestamp).to.be.gt(0n);
    });

    it("enforces deviation thresholds when set", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500); // 5%
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);

      const newNav = ethers.parseEther("120");
      await expect(oracle.connect(updater).updateNAV(BASKET_ID, newNav))
        .to.be.revertedWithCustomError(oracle, "DeviationTooHigh")
        .withArgs(BASKET_ID, NAV_100, newNav, 2000n);
    });

    it("allows updates within the deviation threshold", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500); // 5%
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);

      const permissibleNav = ethers.parseEther("104");
      await expect(oracle.connect(updater).updateNAV(BASKET_ID, permissibleNav))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, NAV_100, permissibleNav, anyValue);

      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.nav).to.equal(permissibleNav);
    });

    it("rejects zero NAV updates", async () => {
      await expect(oracle.connect(updater).updateNAV(BASKET_ID, 0)).to.be.revertedWithCustomError(oracle, "InvalidNav");
    });

    it("isolates NAV values per basket", async () => {
      const basketTwoNav = ethers.parseEther("250");
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);
      await oracle.connect(updater).updateNAV(OTHER_BASKET_ID, basketTwoNav);

      const firstObservation = await oracle.getObservation(BASKET_ID);
      const secondObservation = await oracle.getObservation(OTHER_BASKET_ID);

      expect(firstObservation.nav).to.equal(NAV_100);
      expect(secondObservation.nav).to.equal(basketTwoNav);
    });

    it("blocks non-updaters from writing observations", async () => {
      await expect(oracle.connect(stranger).updateNAV(BASKET_ID, NAV_100)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("deviation calculation", () => {
    it("returns zero deviation before first observation", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 1000);
      const observationBefore = await oracle.getObservation(BASKET_ID);
      expect(observationBefore.deviationThreshold).to.equal(1000n);

      const nav = ethers.parseEther("50");
      await expect(oracle.connect(updater).updateNAV(BASKET_ID, nav))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, 0n, nav, anyValue);
    });

    it("produces symmetric deviation for increases and decreases", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 1_000);
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);

      await expect(oracle.connect(updater).updateNAV(BASKET_ID, ethers.parseEther("90")))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, NAV_100, ethers.parseEther("90"), anyValue);

      const observation = await oracle.getObservation(BASKET_ID);
      expect(observation.nav).to.equal(ethers.parseEther("90"));
    });
  });

  describe("access control", () => {
    it("allows the admin to grant a new updater", async () => {
      const anotherUpdater = stranger;
      const updaterRole = await oracle.ORACLE_UPDATER_ROLE();

      await oracle.connect(owner).grantRole(updaterRole, anotherUpdater.address);

      await expect(oracle.connect(anotherUpdater).updateNAV(BASKET_ID, NAV_100)).to.emit(oracle, "NAVUpdated");
    });

    it("prevents non-admins from granting roles", async () => {
      const updaterRole = await oracle.ORACLE_UPDATER_ROLE();
      await expect(oracle.connect(manager).grantRole(updaterRole, stranger.address)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
});
