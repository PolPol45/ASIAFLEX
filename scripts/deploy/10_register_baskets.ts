import "hardhat/register";
import fs from "fs";
import path from "path";
import hre from "hardhat";
import type { BasketManager, BasketToken, MedianOracle, MockERC20, NAVOracleAdapter } from "../../typechain-types";
import {
  BASKETS,
  BasketDescriptor,
  basketKey,
  AllocationDescriptor,
  regionToEnum,
  strategyToEnum,
} from "./basketDescriptors";
import { mergeBasketsIntoMain } from "../helpers/addresses";

const { ethers } = hre;

export type RegisteredAllocation = {
  assetId: string;
  assetLabel: string;
  weightBps: number;
  isBond: boolean;
  accrualBps: number;
  mockPrice?: string;
  decimals: number;
};

export type RegisteredBasket = {
  name: string;
  symbol: string;
  region: string;
  strategy: string;
  regionEnum: number;
  strategyEnum: number;
  basketId: string;
  tokenAddress: string;
  nav: string;
  navTimestamp: number;
  allocations: RegisteredAllocation[];
};

export type BasketDeploymentSnapshot = {
  network: string;
  chainId: string;
  timestamp: string;
  baseAsset: string;
  manager: string;
  medianOracle: string;
  navOracle: string;
  baskets: RegisteredBasket[];
};

export type BasketDeploymentResult = {
  snapshot: BasketDeploymentSnapshot;
  snapshotPath: string;
  manager: string;
  medianOracle: string;
  navOracle: string;
  baseAsset: string;
};

const SNAPSHOT_DIR = path.join(__dirname, "../deployments/baskets");

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function saveSnapshot(snapshot: BasketDeploymentSnapshot): string {
  ensureSnapshotDir();
  const slug = snapshot.network?.toLowerCase?.() || snapshot.chainId;
  const filePath = path.join(SNAPSHOT_DIR, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
  console.log(`📝 Basket deployment saved to ${filePath}`);
  return filePath;
}

async function deployBaseAsset(deployer: string): Promise<MockERC20> {
  if (process.env.BASE_ASSET_ADDRESS) {
    const addr = ethers.getAddress(process.env.BASE_ASSET_ADDRESS);
    console.log(`💡 Using pre-existing base asset at ${addr}`);
    const factory = await ethers.getContractFactory("MockERC20");
    return factory.attach(addr) as MockERC20;
  }

  const factory = await ethers.getContractFactory("MockERC20");
  const token = (await factory.deploy("MockUSD", "mUSD")) as MockERC20;
  await token.waitForDeployment();

  const initialMint = ethers.parseUnits("1000000", 18);
  await (await token.mint(deployer, initialMint)).wait();
  console.log(`🪙 MockUSD base asset deployed at ${await token.getAddress()}`);
  return token;
}

async function deployMedianOracle(deployer: string): Promise<MedianOracle> {
  const factory = await ethers.getContractFactory("MedianOracle");
  const oracle = (await factory.deploy(deployer)) as MedianOracle;
  await oracle.waitForDeployment();
  await (await oracle.setUpdater(deployer, true)).wait();
  return oracle;
}

async function deployNavOracle(deployer: string): Promise<NAVOracleAdapter> {
  const factory = await ethers.getContractFactory("NAVOracleAdapter");
  const adapter = (await factory.deploy(deployer)) as NAVOracleAdapter;
  await adapter.waitForDeployment();
  return adapter;
}

function computeWeightedPrice(allocation: AllocationDescriptor): bigint {
  const weight = BigInt(allocation.weightBps ?? 0);
  if (weight === 0n) {
    return 0n;
  }

  const decimals = BigInt(allocation.decimals ?? 18);
  const price = ethers.parseUnits(allocation.mockPrice ?? "1", Number(decimals));
  let normalized = price;

  if (decimals > 18n) {
    normalized = price / 10n ** (decimals - 18n);
  } else if (decimals < 18n) {
    normalized = price * 10n ** (18n - decimals);
  }

  return normalized * weight;
}

function computeInitialNav(descriptor: BasketDescriptor): bigint {
  const basisPoints = 10_000n;
  const accumulator = descriptor.allocations.reduce(
    (total, allocation) => total + computeWeightedPrice(allocation),
    0n
  );
  if (accumulator === 0n) {
    return ethers.parseUnits("1", 18);
  }
  return accumulator / basisPoints;
}

async function registerBasket(
  descriptor: BasketDescriptor,
  manager: BasketManager,
  navOracle: NAVOracleAdapter
): Promise<RegisteredBasket> {
  const managerAddress = await manager.getAddress();
  const basketId = ethers.keccak256(ethers.toUtf8Bytes(basketKey(descriptor)));

  const tokenFactory = await ethers.getContractFactory("BasketToken");
  const token = (await tokenFactory.deploy(descriptor.name, descriptor.symbol, 18, managerAddress)) as BasketToken;
  await token.waitForDeployment();

  const limits: BasketManager.BasketLimitsStruct = {
    dailyMintCap: 0n,
    dailyNetInflowCap: 0n,
    totalCap: 0n,
  };

  await (await manager.registerBasket(basketId, await token.getAddress(), limits)).wait();

  const nav = computeInitialNav(descriptor);
  await (await navOracle.updateNAV(basketId, nav)).wait();

  const allocations: RegisteredAllocation[] = descriptor.allocations.map((allocation) => ({
    assetId: allocation.assetId,
    assetLabel: allocation.assetId,
    weightBps: allocation.weightBps,
    isBond: allocation.isBond ?? false,
    accrualBps: allocation.accrualBps ?? 0,
    mockPrice: allocation.mockPrice,
    decimals: allocation.decimals ?? 18,
  }));

  return {
    name: descriptor.name,
    symbol: descriptor.symbol,
    region: descriptor.region,
    strategy: descriptor.strategy,
    regionEnum: regionToEnum(descriptor.region),
    strategyEnum: strategyToEnum(descriptor.strategy),
    basketId,
    tokenAddress: await token.getAddress(),
    nav: nav.toString(),
    navTimestamp: Math.floor(Date.now() / 1000),
    allocations,
  };
}

export async function deployBaskets(): Promise<BasketDeploymentResult> {
  const [signer] = await ethers.getSigners();
  const deployer = await signer.getAddress();
  console.log(`👤 Deployer: ${deployer}`);

  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();
  console.log(`🌐 Network: ${networkLabel} (${network.chainId})`);

  const baseAsset = await deployBaseAsset(deployer);
  const baseAssetAddress = await baseAsset.getAddress();

  const medianOracle = await deployMedianOracle(deployer);
  console.log(`🛰️  MedianOracle deployed at ${await medianOracle.getAddress()}`);

  const navOracle = await deployNavOracle(deployer);
  console.log(`🧮 NAVOracleAdapter deployed at ${await navOracle.getAddress()}`);

  const managerFactory = await ethers.getContractFactory("BasketManager");
  const manager = (await managerFactory.deploy(
    deployer,
    2 * 24 * 60 * 60,
    await navOracle.getAddress()
  )) as BasketManager;
  await manager.waitForDeployment();
  console.log(`🏦 BasketManager deployed at ${await manager.getAddress()}`);

  const baskets: RegisteredBasket[] = [];
  for (const descriptor of BASKETS) {
    const registered = await registerBasket(descriptor, manager, navOracle);
    baskets.push(registered);
    console.log(`✅ Registered basket ${descriptor.symbol} (${registered.basketId})`);
  }

  const snapshot: BasketDeploymentSnapshot = {
    network: network.name,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    baseAsset: baseAssetAddress,
    manager: await manager.getAddress(),
    medianOracle: await medianOracle.getAddress(),
    navOracle: await navOracle.getAddress(),
    baskets,
  };

  const snapshotPath = saveSnapshot(snapshot);

  const basePath = path.join(__dirname, "../deployments", `${networkLabel}.json`);
  mergeBasketsIntoMain(basePath, snapshotPath);

  return {
    snapshot,
    snapshotPath,
    manager: snapshot.manager,
    medianOracle: snapshot.medianOracle,
    navOracle: snapshot.navOracle,
    baseAsset: snapshot.baseAsset,
  };
}

if (require.main === module) {
  deployBaskets().catch((error) => {
    console.error("❌ Basket registration failed", error);
    process.exitCode = 1;
  });
}
