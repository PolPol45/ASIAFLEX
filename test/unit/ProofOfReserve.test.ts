import { expect } from "chai";
import { ethers } from "hardhat";
import { ProofOfReserve } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProofOfReserve - Enhanced", function () {
  let reserve: ProofOfReserve;
  let owner: SignerWithAddress;
  let updater: SignerWithAddress;
  let manager: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const INITIAL_MAX_DEVIATION = 500; // 5%
  const TEST_RESERVE = ethers.parseEther("1000000"); // $1M
  const TEST_ATTESTATION = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-1"));

  beforeEach(async function () {
    [owner, updater, manager, unauthorized] = await ethers.getSigners();

    const ProofOfReserveFactory = await ethers.getContractFactory("ProofOfReserve");
    reserve = await ProofOfReserveFactory.deploy(INITIAL_MAX_DEVIATION);

    // Grant roles
    const RESERVE_UPDATER_ROLE = await reserve.RESERVE_UPDATER_ROLE();
    const RESERVE_MANAGER_ROLE = await reserve.RESERVE_MANAGER_ROLE();

    await reserve.grantRole(RESERVE_UPDATER_ROLE, updater.address);
    await reserve.grantRole(RESERVE_MANAGER_ROLE, manager.address);
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      expect(await reserve.maxDeviationBps()).to.equal(INITIAL_MAX_DEVIATION);
      expect(await reserve.reserveUSD()).to.equal(0);
      expect(await reserve.lastAttestationHash()).to.equal(ethers.ZeroHash);
    });

    it("Should grant roles correctly", async function () {
      const DEFAULT_ADMIN_ROLE = await reserve.DEFAULT_ADMIN_ROLE();
      const RESERVE_UPDATER_ROLE = await reserve.RESERVE_UPDATER_ROLE();
      const RESERVE_MANAGER_ROLE = await reserve.RESERVE_MANAGER_ROLE();

      expect(await reserve.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await reserve.hasRole(RESERVE_UPDATER_ROLE, updater.address)).to.be.true;
      expect(await reserve.hasRole(RESERVE_MANAGER_ROLE, manager.address)).to.be.true;
    });

    it("Should reject invalid max deviation in constructor", async function () {
      const ProofOfReserveFactory = await ethers.getContractFactory("ProofOfReserve");

      await expect(ProofOfReserveFactory.deploy(0)).to.be.revertedWithCustomError(
        { interface: reserve.interface } as any,
        "InvalidAmount"
      );

      await expect(ProofOfReserveFactory.deploy(10001)).to.be.revertedWithCustomError(
        { interface: reserve.interface } as any,
        "InvalidAmount"
      );
    });
  });

  describe("Reserve Updates", function () {
    it("Should allow updater to set reserve with attestation", async function () {
      await expect(reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION))
        .to.emit(reserve, "ReserveUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          0,
          TEST_RESERVE,
          TEST_ATTESTATION,
          updater.address
        );

      const [amount, timestamp, hash] = await reserve.getReserve();
      expect(amount).to.equal(TEST_RESERVE);
      expect(hash).to.equal(TEST_ATTESTATION);
      expect(timestamp).to.be.gt(0);
    });

    it("Should reject zero amount", async function () {
      await expect(reserve.connect(updater).setReserve(0, TEST_ATTESTATION)).to.be.revertedWithCustomError(
        reserve,
        "InvalidAmount"
      );
    });

    it("Should reject zero attestation hash", async function () {
      await expect(reserve.connect(updater).setReserve(TEST_RESERVE, ethers.ZeroHash)).to.be.revertedWithCustomError(
        reserve,
        "InvalidAttestationHash"
      );
    });

    it("Should reject updates from unauthorized addresses", async function () {
      await expect(
        reserve.connect(unauthorized).setReserve(TEST_RESERVE, TEST_ATTESTATION)
      ).to.be.revertedWithCustomError(reserve, "AccessControlUnauthorizedAccount");
    });

    it("Should enforce deviation limits", async function () {
      // Set initial reserve
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      // Try to update with too large deviation (> 5%)
      const tooHighReserve = TEST_RESERVE + (TEST_RESERVE * 6n) / 100n; // +6%
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-2"));

      await expect(reserve.connect(updater).setReserve(tooHighReserve, newAttestation)).to.be.revertedWithCustomError(
        reserve,
        "DeviationTooHigh"
      );
    });

    it("Should allow updates within deviation limits", async function () {
      // Set initial reserve
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      // Update with acceptable deviation (4%)
      const newReserve = TEST_RESERVE + (TEST_RESERVE * 4n) / 100n; // +4%
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-2"));

      await expect(reserve.connect(updater).setReserve(newReserve, newAttestation))
        .to.emit(reserve, "ReserveUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          TEST_RESERVE,
          newReserve,
          newAttestation,
          updater.address
        );

      const [amount] = await reserve.getReserve();
      expect(amount).to.equal(newReserve);
    });

    it("Should emit failure event when deviation too high", async function () {
      // Set initial reserve
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      // Try update with too large deviation
      const tooHighReserve = TEST_RESERVE + (TEST_RESERVE * 10n) / 100n; // +10%
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-2"));

      await expect(reserve.connect(updater).setReserve(tooHighReserve, newAttestation))
        .to.be.revertedWithCustomError(reserve, "DeviationTooHigh")
        .withArgs(TEST_RESERVE, tooHighReserve, 1000); // 10% = 1000 bps
    });
  });

  describe("Force Updates", function () {
    beforeEach(async function () {
      // Set initial reserve
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);
    });

    it("Should allow manager to force update bypassing deviation", async function () {
      const largeReserve = TEST_RESERVE + (TEST_RESERVE * 50n) / 100n; // +50%
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-force"));
      const reason = "Emergency: Market crash requires immediate reserve update";

      await expect(reserve.connect(manager).forceSetReserve(largeReserve, newAttestation, reason))
        .to.emit(reserve, "ReserveUpdated")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          TEST_RESERVE,
          largeReserve,
          newAttestation,
          manager.address
        );

      const [amount] = await reserve.getReserve();
      expect(amount).to.equal(largeReserve);
    });

    it("Should emit failure event with reason on force update", async function () {
      const largeReserve = TEST_RESERVE + (TEST_RESERVE * 50n) / 100n; // +50%
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-force"));
      const reason = "Emergency: Market crash requires immediate reserve update";

      await expect(reserve.connect(manager).forceSetReserve(largeReserve, newAttestation, reason))
        .to.emit(reserve, "ReserveUpdateFailed")
        .withArgs(
          (await ethers.provider.getBlock("latest"))!.timestamp + 1,
          largeReserve,
          TEST_RESERVE,
          reason,
          manager.address
        );
    });

    it("Should reject force update from non-manager", async function () {
      const largeReserve = TEST_RESERVE + (TEST_RESERVE * 50n) / 100n;
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-force"));

      await expect(
        reserve.connect(updater).forceSetReserve(largeReserve, newAttestation, "reason")
      ).to.be.revertedWithCustomError(reserve, "AccessControlUnauthorizedAccount");
    });

    it("Should reject force update with zero amount", async function () {
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-force"));

      await expect(reserve.connect(manager).forceSetReserve(0, newAttestation, "reason")).to.be.revertedWithCustomError(
        reserve,
        "InvalidAmount"
      );
    });

    it("Should reject force update with zero attestation", async function () {
      const largeReserve = TEST_RESERVE + (TEST_RESERVE * 50n) / 100n;

      await expect(
        reserve.connect(manager).forceSetReserve(largeReserve, ethers.ZeroHash, "reason")
      ).to.be.revertedWithCustomError(reserve, "InvalidAttestationHash");
    });
  });

  describe("Configuration", function () {
    it("Should allow manager to update max deviation", async function () {
      const newDeviation = 1000; // 10%

      await expect(reserve.connect(manager).setMaxDeviation(newDeviation))
        .to.emit(reserve, "MaxDeviationUpdated")
        .withArgs(INITIAL_MAX_DEVIATION, newDeviation);

      expect(await reserve.maxDeviationBps()).to.equal(newDeviation);
    });

    it("Should reject invalid max deviation values", async function () {
      await expect(reserve.connect(manager).setMaxDeviation(0)).to.be.revertedWithCustomError(reserve, "InvalidAmount");

      await expect(reserve.connect(manager).setMaxDeviation(10001)).to.be.revertedWithCustomError(
        reserve,
        "InvalidAmount"
      );
    });

    it("Should reject max deviation update from non-manager", async function () {
      await expect(reserve.connect(updater).setMaxDeviation(1000)).to.be.revertedWithCustomError(
        reserve,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow manager to pause", async function () {
      await expect(reserve.connect(manager).pause()).to.emit(reserve, "Paused").withArgs(manager.address);

      expect(await reserve.paused()).to.be.true;
    });

    it("Should prevent updates when paused", async function () {
      await reserve.connect(manager).pause();

      await expect(reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION)).to.be.revertedWithCustomError(
        reserve,
        "EnforcedPause"
      );
    });

    it("Should allow manager to unpause", async function () {
      await reserve.connect(manager).pause();
      await expect(reserve.connect(manager).unpause()).to.emit(reserve, "Unpaused").withArgs(manager.address);

      expect(await reserve.paused()).to.be.false;
    });

    it("Should allow updates after unpause", async function () {
      await reserve.connect(manager).pause();
      await reserve.connect(manager).unpause();

      await expect(reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION)).to.emit(
        reserve,
        "ReserveUpdated"
      );
    });

    it("Should reject pause from non-manager", async function () {
      await expect(reserve.connect(updater).pause()).to.be.revertedWithCustomError(
        reserve,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct reserve information", async function () {
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      const [amount, timestamp, hash] = await reserve.getReserve();

      expect(amount).to.equal(TEST_RESERVE);
      expect(timestamp).to.be.gt(0);
      expect(hash).to.equal(TEST_ATTESTATION);
    });

    it("Should return zero values before first update", async function () {
      const [amount, timestamp, hash] = await reserve.getReserve();

      expect(amount).to.equal(0);
      expect(timestamp).to.be.gt(0); // Set in constructor
      expect(hash).to.equal(ethers.ZeroHash);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple consecutive updates", async function () {
      // First update
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      // Second update (3% increase)
      const reserve2 = TEST_RESERVE + (TEST_RESERVE * 3n) / 100n;
      const attestation2 = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-2"));
      await reserve.connect(updater).setReserve(reserve2, attestation2);

      // Third update (2% decrease from reserve2)
      const reserve3 = reserve2 - (reserve2 * 2n) / 100n;
      const attestation3 = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-3"));
      await reserve.connect(updater).setReserve(reserve3, attestation3);

      const [amount] = await reserve.getReserve();
      expect(amount).to.equal(reserve3);
    });

    it("Should handle maximum allowed deviation", async function () {
      await reserve.connect(updater).setReserve(TEST_RESERVE, TEST_ATTESTATION);

      // Exactly 5% increase should succeed
      const maxReserve = TEST_RESERVE + (TEST_RESERVE * 5n) / 100n;
      const newAttestation = ethers.keccak256(ethers.toUtf8Bytes("test-attestation-max"));

      await expect(reserve.connect(updater).setReserve(maxReserve, newAttestation)).to.emit(reserve, "ReserveUpdated");
    });

    it("Should handle very large reserve values", async function () {
      const largeReserve = ethers.parseEther("1000000000"); // $1B
      const attestation = ethers.keccak256(ethers.toUtf8Bytes("large-reserve"));

      await expect(reserve.connect(updater).setReserve(largeReserve, attestation)).to.emit(reserve, "ReserveUpdated");

      const [amount] = await reserve.getReserve();
      expect(amount).to.equal(largeReserve);
    });
  });
});
