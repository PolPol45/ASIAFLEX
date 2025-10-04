import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import type {
  BasketManager,
  BasketToken,
  BasketTreasuryController,
  MedianOracle,
  NAVOracleAdapter,
} from "../../typechain-types";
import { toWei } from "../helpers/quote";

const DAY = 24 * 60 * 60;
const DEFAULT_LIMITS = {
  dailyMintCap: toWei("1000000"),
  dailyNetInflowCap: toWei("2000000"),
  totalCap: toWei("5000000"),
};

export type BasketE2EFixture = {
  admin: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  controller: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  treasurySigner: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  oracleUpdater: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  oracleManager: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  user: Awaited<ReturnType<typeof ethers.getSigners>>[number];
  manager: BasketManager;
  treasury: BasketTreasuryController;
  basketToken: BasketToken;
  medianOracle: MedianOracle;
  navOracle: NAVOracleAdapter;
  basketId: `0x${string}`;
  seedFreshNAV: (symbol: string, navWei: bigint, timestamp?: number) => Promise<void>;
  setBasketLimits: (limits: { dailyMintCap: bigint; dailyNetInflowCap: bigint; totalCap: bigint }) => Promise<void>;
};

export async function deployBasketE2EFixture(): Promise<BasketE2EFixture> {
  const [admin, controller, treasurySigner, oracleUpdater, oracleManager, user] = await ethers.getSigners();

  const medianOracleFactory = await ethers.getContractFactory("MedianOracle", admin);
  const medianOracle = (await medianOracleFactory.deploy(admin.address)) as MedianOracle;
  await medianOracle.waitForDeployment();
  await (await medianOracle.connect(admin).setUpdater(oracleUpdater.address, true)).wait();

  const navOracleFactory = await ethers.getContractFactory("NAVOracleAdapter", admin);
  const navOracle = (await navOracleFactory.deploy(admin.address)) as NAVOracleAdapter;
  await navOracle.waitForDeployment();
  await (await navOracle.grantRole(await navOracle.ORACLE_UPDATER_ROLE(), oracleUpdater.address)).wait();
  await (await navOracle.grantRole(await navOracle.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();

  const managerFactory = await ethers.getContractFactory("BasketManager", admin);
  const manager = (await managerFactory.deploy(
    admin.address,
    BigInt(2 * DAY),
    await navOracle.getAddress()
  )) as BasketManager;
  await manager.waitForDeployment();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), controller.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();

  const treasuryFactory = await ethers.getContractFactory("BasketTreasuryController", admin);
  const treasury = (await treasuryFactory.deploy(
    admin.address,
    await manager.getAddress()
  )) as BasketTreasuryController;
  await treasury.waitForDeployment();
  await (await treasury.grantRole(await treasury.CONTROLLER_ROLE(), controller.address)).wait();
  await (await treasury.grantRole(await treasury.TREASURY_SIGNER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), await treasury.getAddress())).wait();

  const basketTokenFactory = await ethers.getContractFactory("BasketToken", admin);
  const basketToken = (await basketTokenFactory.deploy(
    "EU FX Basket",
    "EUFX",
    18,
    await manager.getAddress()
  )) as BasketToken;
  await basketToken.waitForDeployment();

  const basketId = ethers.keccak256(ethers.toUtf8Bytes("EUFX")) as `0x${string}`;
  await (
    await manager.registerBasket(basketId, await basketToken.getAddress(), {
      dailyMintCap: DEFAULT_LIMITS.dailyMintCap,
      dailyNetInflowCap: DEFAULT_LIMITS.dailyNetInflowCap,
      totalCap: DEFAULT_LIMITS.totalCap,
    })
  ).wait();

  await (await navOracle.setStalenessThreshold(basketId, 72 * 60 * 60)).wait();
  await (await navOracle.setDeviationThreshold(basketId, 500)).wait();

  const seedFreshNAV = async (symbol: string, navWei: bigint, timestamp?: number) => {
    const latestTimestamp = await time.latest();
    let targetTimestamp = latestTimestamp + 1;
    if (timestamp !== undefined && timestamp > latestTimestamp) {
      targetTimestamp = timestamp;
    }

    await time.increase(targetTimestamp - latestTimestamp);

    const assetId = ethers.keccak256(ethers.toUtf8Bytes(symbol));
    await (
      await medianOracle.connect(oracleUpdater).updatePrice(assetId, navWei, targetTimestamp, 18, "TEST", false)
    ).wait();

    await (await navOracle.connect(oracleUpdater).updateNAV(basketId, navWei)).wait();
  };

  const setBasketLimits = async (limits: { dailyMintCap: bigint; dailyNetInflowCap: bigint; totalCap: bigint }) => {
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
