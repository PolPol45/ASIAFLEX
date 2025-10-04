import { ethers } from "hardhat";
import type { BasketManager, BasketToken, BasketTreasuryController, MockNAVAdapter } from "../../typechain-types";

const DAY = 24n * 60n * 60n;

export type BasketCoreFixture = {
  admin: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  controller: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  treasurySigner: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  user: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  manager: BasketManager;
  token: BasketToken;
  navAdapter: MockNAVAdapter;
  basketId: string;
};

export type BasketSystemFixture = BasketCoreFixture & {
  controllerContract: BasketTreasuryController;
};

async function deployNavAdapter(admin: Awaited<ReturnType<typeof ethers.getSigners>>[number]): Promise<MockNAVAdapter> {
  const factory = await ethers.getContractFactory("MockNAVAdapter", { signer: admin });
  const adapter = (await factory.deploy()) as MockNAVAdapter;
  await adapter.waitForDeployment();
  return adapter;
}

async function deployBasketManager(
  admin: Awaited<ReturnType<typeof ethers.getSigners>>[number],
  navAdapter: MockNAVAdapter
): Promise<BasketManager> {
  const factory = await ethers.getContractFactory("BasketManager", { signer: admin });
  const manager = (await factory.deploy(
    admin.address,
    Number(2n * DAY),
    await navAdapter.getAddress()
  )) as BasketManager;
  await manager.waitForDeployment();
  return manager;
}

async function deployBasketToken(admin: Awaited<ReturnType<typeof ethers.getSigners>>[number]): Promise<BasketToken> {
  const factory = await ethers.getContractFactory("BasketToken", { signer: admin });
  const token = (await factory.deploy("EU FX Basket", "EUFX", 18, admin.address)) as BasketToken;
  await token.waitForDeployment();
  return token;
}

export async function deployBasketCoreFixture(): Promise<BasketCoreFixture> {
  const [admin, controller, treasurySigner, user] = await ethers.getSigners();

  const navAdapter = await deployNavAdapter(admin);
  const manager = await deployBasketManager(admin, navAdapter);
  const token = await deployBasketToken(admin);

  const basketId = ethers.keccak256(ethers.toUtf8Bytes("EU_FX"));
  const limits: BasketManager.BasketLimitsStruct = {
    dailyMintCap: ethers.parseUnits("1000000", 18),
    dailyNetInflowCap: ethers.parseUnits("2000000", 18),
    totalCap: ethers.parseUnits("5000000", 18),
  };

  await (await manager.registerBasket(basketId, await token.getAddress(), limits)).wait();

  const minterRole = await token.MINTER_ROLE();
  await (await token.grantRole(minterRole, await manager.getAddress())).wait();

  const controllerRole = await manager.CONTROLLER_ROLE();
  await (await manager.grantRole(controllerRole, controller.address)).wait();

  await (await navAdapter.updateNAV(basketId, ethers.parseUnits("1", 18))).wait();
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

export async function deployBasketSystemFixture(): Promise<BasketSystemFixture> {
  const core = await deployBasketCoreFixture();
  const { admin, treasurySigner, manager, navAdapter, basketId } = core;

  const controllerFactory = await ethers.getContractFactory("BasketTreasuryController", { signer: admin });
  const controllerContract = (await controllerFactory.deploy(
    admin.address,
    await manager.getAddress()
  )) as BasketTreasuryController;
  await controllerContract.waitForDeployment();

  const controllerRole = await manager.CONTROLLER_ROLE();
  await (await manager.grantRole(controllerRole, await controllerContract.getAddress())).wait();

  const treasurySignerRole = await controllerContract.TREASURY_SIGNER_ROLE();
  await (await controllerContract.grantRole(treasurySignerRole, treasurySigner.address)).wait();

  // ensure controller can mint using current NAV observation
  await (await navAdapter.updateNAV(basketId, ethers.parseUnits("1.05", 18))).wait();

  return {
    ...core,
    controllerContract,
  };
}
