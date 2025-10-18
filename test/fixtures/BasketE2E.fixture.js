"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployBasketE2EFixture = deployBasketE2EFixture;
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const hardhat_1 = require("hardhat");
const quote_1 = require("../helpers/quote");
const DAY = 24 * 60 * 60;
const DEFAULT_LIMITS = {
  dailyMintCap: (0, quote_1.toWei)("1000000"),
  dailyNetInflowCap: (0, quote_1.toWei)("2000000"),
  totalCap: (0, quote_1.toWei)("5000000"),
};
async function deployBasketE2EFixture() {
  const [admin, controller, treasurySigner, oracleUpdater, oracleManager, user] = await hardhat_1.ethers.getSigners();
  const medianOracleFactory = await hardhat_1.ethers.getContractFactory("MedianOracle", admin);
  const medianOracle = await medianOracleFactory.deploy(admin.address);
  await medianOracle.waitForDeployment();
  await (await medianOracle.connect(admin).setUpdater(oracleUpdater.address, true)).wait();
  const navOracleFactory = await hardhat_1.ethers.getContractFactory("NAVOracleAdapter", admin);
  const navOracle = await navOracleFactory.deploy(admin.address);
  await navOracle.waitForDeployment();
  await (await navOracle.grantRole(await navOracle.ORACLE_UPDATER_ROLE(), oracleUpdater.address)).wait();
  await (await navOracle.grantRole(await navOracle.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();
  const managerFactory = await hardhat_1.ethers.getContractFactory("BasketManager", admin);
  const manager = await managerFactory.deploy(admin.address, BigInt(2 * DAY), await navOracle.getAddress());
  await manager.waitForDeployment();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), controller.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();
  const treasuryFactory = await hardhat_1.ethers.getContractFactory("BasketTreasuryController", admin);
  const treasury = await treasuryFactory.deploy(admin.address, await manager.getAddress());
  await treasury.waitForDeployment();
  await (await treasury.grantRole(await treasury.CONTROLLER_ROLE(), controller.address)).wait();
  await (await treasury.grantRole(await treasury.TREASURY_SIGNER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), await treasury.getAddress())).wait();
  const basketTokenFactory = await hardhat_1.ethers.getContractFactory("BasketToken", admin);
  const basketToken = await basketTokenFactory.deploy("EU FX Basket", "EUFX", 18, await manager.getAddress());
  await basketToken.waitForDeployment();
  const basketId = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("EUFX"));
  await (
    await manager.registerBasket(basketId, await basketToken.getAddress(), {
      dailyMintCap: DEFAULT_LIMITS.dailyMintCap,
      dailyNetInflowCap: DEFAULT_LIMITS.dailyNetInflowCap,
      totalCap: DEFAULT_LIMITS.totalCap,
    })
  ).wait();
  await (await navOracle.setStalenessThreshold(basketId, 72 * 60 * 60)).wait();
  await (await navOracle.setDeviationThreshold(basketId, 500)).wait();
  const seedFreshNAV = async (symbol, navWei, timestamp) => {
    const latestTimestamp = await hardhat_network_helpers_1.time.latest();
    let targetTimestamp = latestTimestamp + 1;
    if (timestamp !== undefined && timestamp > latestTimestamp) {
      targetTimestamp = timestamp;
    }
    await hardhat_network_helpers_1.time.increase(targetTimestamp - latestTimestamp);
    const assetId = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes(symbol));
    await (
      await medianOracle.connect(oracleUpdater).updatePrice(assetId, navWei, targetTimestamp, 18, "TEST", false)
    ).wait();
    await (await navOracle.connect(oracleUpdater).updateNAV(basketId, navWei)).wait();
  };
  const setBasketLimits = async (limits) => {
    await (await manager.connect(admin).setBasketLimits(basketId, limits)).wait();
  };
  return {
    admin,
    controller,
    treasurySigner,
    oracleUpdater,
    oracleManager,
    user,
    manager,
    treasury,
    basketToken,
    medianOracle,
    navOracle,
    basketId,
    seedFreshNAV,
    setBasketLimits,
  };
}
