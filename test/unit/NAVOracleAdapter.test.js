"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const chai_1 = require("chai");
const withArgs_1 = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
describe("NAVOracleAdapter", () => {
  let oracle;
  let owner;
  let manager;
  let updater;
  let stranger;
  const BASKET_ID = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("basket-1"));
  const OTHER_BASKET_ID = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("basket-2"));
  const NAV_100 = hardhat_1.ethers.parseEther("100");
  beforeEach(async () => {
    [owner, manager, updater, stranger] = await hardhat_1.ethers.getSigners();
    oracle = await hardhat_1.ethers.deployContract("NAVOracleAdapter", [owner.address]);
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
      (0, chai_1.expect)(await oracle.hasRole(defaultAdminRole, owner.address)).to.be.true;
      (0, chai_1.expect)(await oracle.hasRole(managerRole, owner.address)).to.be.true;
      (0, chai_1.expect)(await oracle.hasRole(updaterRole, owner.address)).to.be.true;
    });
    it("starts with empty observations", async () => {
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.nav).to.equal(0n);
      (0, chai_1.expect)(observation.timestamp).to.equal(0n);
      (0, chai_1.expect)(observation.stalenessThreshold).to.equal(0n);
      (0, chai_1.expect)(observation.deviationThreshold).to.equal(0n);
    });
  });
  describe("configuration", () => {
    it("allows manager to set staleness threshold", async () => {
      const newThreshold = 86400;
      await (0, chai_1.expect)(oracle.connect(manager).setStalenessThreshold(BASKET_ID, newThreshold))
        .to.emit(oracle, "StalenessThresholdUpdated")
        .withArgs(BASKET_ID, 0n, BigInt(newThreshold));
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.stalenessThreshold).to.equal(BigInt(newThreshold));
    });
    it("allows manager to set deviation threshold", async () => {
      const newThreshold = 750; // 7.5%
      await (0, chai_1.expect)(oracle.connect(manager).setDeviationThreshold(BASKET_ID, newThreshold))
        .to.emit(oracle, "DeviationThresholdUpdated")
        .withArgs(BASKET_ID, 0n, BigInt(newThreshold));
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.deviationThreshold).to.equal(BigInt(newThreshold));
    });
    it("reverts if deviation threshold above 100%", async () => {
      await (0, chai_1.expect)(
        oracle.connect(manager).setDeviationThreshold(BASKET_ID, 10001)
      ).to.be.revertedWithCustomError(oracle, "InvalidThreshold");
    });
    it("isolates thresholds per basket", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500);
      const otherObservation = await oracle.getObservation(OTHER_BASKET_ID);
      (0, chai_1.expect)(otherObservation.deviationThreshold).to.equal(0n);
    });
    it("blocks non-managers from configuring", async () => {
      await (0, chai_1.expect)(
        oracle.connect(stranger).setStalenessThreshold(BASKET_ID, 100)
      ).to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
      await (0, chai_1.expect)(
        oracle.connect(stranger).setDeviationThreshold(BASKET_ID, 100)
      ).to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
    });
  });
  describe("NAV updates", () => {
    it("records the first update without deviation checks", async () => {
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, NAV_100))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, 0n, NAV_100, withArgs_1.anyValue);
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.nav).to.equal(NAV_100);
      (0, chai_1.expect)(observation.timestamp).to.be.gt(0n);
    });
    it("enforces deviation thresholds when set", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500); // 5%
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);
      const newNav = hardhat_1.ethers.parseEther("120");
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, newNav))
        .to.be.revertedWithCustomError(oracle, "DeviationTooHigh")
        .withArgs(BASKET_ID, NAV_100, newNav, 2000n);
    });
    it("allows updates within the deviation threshold", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 500); // 5%
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);
      const permissibleNav = hardhat_1.ethers.parseEther("104");
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, permissibleNav))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, NAV_100, permissibleNav, withArgs_1.anyValue);
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.nav).to.equal(permissibleNav);
    });
    it("rejects zero NAV updates", async () => {
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, 0)).to.be.revertedWithCustomError(
        oracle,
        "InvalidNav"
      );
    });
    it("isolates NAV values per basket", async () => {
      const basketTwoNav = hardhat_1.ethers.parseEther("250");
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);
      await oracle.connect(updater).updateNAV(OTHER_BASKET_ID, basketTwoNav);
      const firstObservation = await oracle.getObservation(BASKET_ID);
      const secondObservation = await oracle.getObservation(OTHER_BASKET_ID);
      (0, chai_1.expect)(firstObservation.nav).to.equal(NAV_100);
      (0, chai_1.expect)(secondObservation.nav).to.equal(basketTwoNav);
    });
    it("blocks non-updaters from writing observations", async () => {
      await (0, chai_1.expect)(oracle.connect(stranger).updateNAV(BASKET_ID, NAV_100)).to.be.revertedWithCustomError(
        oracle,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
  describe("deviation calculation", () => {
    it("returns zero deviation before first observation", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 1000);
      const observationBefore = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observationBefore.deviationThreshold).to.equal(1000n);
      const nav = hardhat_1.ethers.parseEther("50");
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, nav))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, 0n, nav, withArgs_1.anyValue);
    });
    it("produces symmetric deviation for increases and decreases", async () => {
      await oracle.connect(manager).setDeviationThreshold(BASKET_ID, 1000);
      await oracle.connect(updater).updateNAV(BASKET_ID, NAV_100);
      await (0, chai_1.expect)(oracle.connect(updater).updateNAV(BASKET_ID, hardhat_1.ethers.parseEther("90")))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(BASKET_ID, NAV_100, hardhat_1.ethers.parseEther("90"), withArgs_1.anyValue);
      const observation = await oracle.getObservation(BASKET_ID);
      (0, chai_1.expect)(observation.nav).to.equal(hardhat_1.ethers.parseEther("90"));
    });
  });
  describe("access control", () => {
    it("allows the admin to grant a new updater", async () => {
      const anotherUpdater = stranger;
      const updaterRole = await oracle.ORACLE_UPDATER_ROLE();
      await oracle.connect(owner).grantRole(updaterRole, anotherUpdater.address);
      await (0, chai_1.expect)(oracle.connect(anotherUpdater).updateNAV(BASKET_ID, NAV_100)).to.emit(
        oracle,
        "NAVUpdated"
      );
    });
    it("prevents non-admins from granting roles", async () => {
      const updaterRole = await oracle.ORACLE_UPDATER_ROLE();
      await (0, chai_1.expect)(
        oracle.connect(manager).grantRole(updaterRole, stranger.address)
      ).to.be.revertedWithCustomError(oracle, "AccessControlUnauthorizedAccount");
    });
  });
});
