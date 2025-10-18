"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployBasketCoreFixture = deployBasketCoreFixture;
exports.deployBasketSystemFixture = deployBasketSystemFixture;
const hardhat_1 = require("hardhat");
const DAY = 24n * 60n * 60n;
async function deployNavAdapter(admin) {
  const factory = await hardhat_1.ethers.getContractFactory("MockNAVAdapter", { signer: admin });
  const adapter = await factory.deploy();
  await adapter.waitForDeployment();
  return adapter;
}
async function deployBasketManager(admin, navAdapter) {
  const factory = await hardhat_1.ethers.getContractFactory("BasketManager", { signer: admin });
  const manager = await factory.deploy(admin.address, Number(2n * DAY), await navAdapter.getAddress());
  await manager.waitForDeployment();
  return manager;
}
async function deployBasketToken(admin) {
  const factory = await hardhat_1.ethers.getContractFactory("BasketToken", { signer: admin });
  const token = await factory.deploy("EU FX Basket", "EUFX", 18, admin.address);
  await token.waitForDeployment();
  return token;
}
async function deployBasketCoreFixture() {
  const [admin, controller, treasurySigner, user] = await hardhat_1.ethers.getSigners();
  const navAdapter = await deployNavAdapter(admin);
  const manager = await deployBasketManager(admin, navAdapter);
  const token = await deployBasketToken(admin);
  const basketId = hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes("EU_FX"));
  const limits = {
    dailyMintCap: hardhat_1.ethers.parseUnits("1000000", 18),
    dailyNetInflowCap: hardhat_1.ethers.parseUnits("2000000", 18),
    totalCap: hardhat_1.ethers.parseUnits("5000000", 18),
  };
  await (await manager.registerBasket(basketId, await token.getAddress(), limits)).wait();
  const minterRole = await token.MINTER_ROLE();
  await (await token.grantRole(minterRole, await manager.getAddress())).wait();
  const controllerRole = await manager.CONTROLLER_ROLE();
  await (await manager.grantRole(controllerRole, controller.address)).wait();
  await (await navAdapter.updateNAV(basketId, hardhat_1.ethers.parseUnits("1", 18))).wait();
  await (await navAdapter.setStalenessThreshold(basketId, Number(DAY))).wait();
  return {
    admin,
    controller,
    treasurySigner,
    user,
    manager,
    token,
    navAdapter,
    basketId,
  };
}
async function deployBasketSystemFixture() {
  const core = await deployBasketCoreFixture();
  const { admin, treasurySigner, manager, navAdapter, basketId } = core;
  const controllerFactory = await hardhat_1.ethers.getContractFactory("BasketTreasuryController", { signer: admin });
  const controllerContract = await controllerFactory.deploy(admin.address, await manager.getAddress());
  await controllerContract.waitForDeployment();
  const controllerRole = await manager.CONTROLLER_ROLE();
  await (await manager.grantRole(controllerRole, await controllerContract.getAddress())).wait();
  const treasurySignerRole = await controllerContract.TREASURY_SIGNER_ROLE();
  await (await controllerContract.grantRole(treasurySignerRole, treasurySigner.address)).wait();
  // ensure controller can mint using current NAV observation
  await (await navAdapter.updateNAV(basketId, hardhat_1.ethers.parseUnits("1.05", 18))).wait();
  return {
    ...core,
    controllerContract,
  };
}
