import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import type {
  BasketManager,
  BasketToken,
  BasketTreasuryController,
  MedianOracle,
  MockERC20,
  NAVOracleAdapter,
} from "../../typechain-types";
import { BASKETS, basketKey, type BasketDescriptor } from "../../scripts/deploy/basketDescriptors";

type Hex32String = `0x${string}`;

export interface BasketContractInfo {
  descriptor: BasketDescriptor;
  basketId: Hex32String;
  token: BasketToken;
}

export interface DeploymentFixture {
  baseAsset: MockERC20;
  manager: BasketManager;
  treasury: BasketTreasuryController;
  navOracle: NAVOracleAdapter;
  medianOracle: MedianOracle;
  baskets: Record<string, BasketContractInfo>;
  signers: {
    deployer: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    oracleUpdater: SignerWithAddress;
    oracleManager: SignerWithAddress;
    treasuryController: SignerWithAddress;
    pauser: SignerWithAddress;
    capsManager: SignerWithAddress;
    complianceManager: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
    user3: SignerWithAddress;
  };
  constants: {
    defaultNav: bigint;
    defaultDeadlineWindow: number;
  };
}

export interface MintRedeemRequest {
  basketId: Hex32String;
  to: string;
  notional: bigint;
  nav: bigint;
  deadline: bigint;
  proofHash: Hex32String;
  nonce: bigint;
}

const DEFAULT_DEADLINE_SECONDS = 3600;

function defaultDeadline(seconds: number = DEFAULT_DEADLINE_SECONDS): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

function normalizeBasketId(value: string): Hex32String {
  const prefixed = value.startsWith("0x") ? value : `0x${value}`;
  if (!ethers.isHexString(prefixed, 32)) {
    throw new Error(`BasketId non valido: ${value}`);
  }
  return prefixed as Hex32String;
}

function computeInitialNav(descriptor: BasketDescriptor): bigint {
  const basisPoints = 10_000n;
  const accumulator = descriptor.allocations.reduce((total, allocation) => {
    const decimals = BigInt(allocation.decimals ?? 18);
    const price = ethers.parseUnits(allocation.mockPrice ?? "1", Number(decimals));
    let normalized = price;
    if (decimals > 18n) {
      normalized = price / 10n ** (decimals - 18n);
    } else if (decimals < 18n) {
      normalized = price * 10n ** (18n - decimals);
    }
    return total + normalized * BigInt(allocation.weightBps ?? 0);
  }, 0n);
  if (accumulator === 0n) {
    return ethers.parseUnits("1", 18);
  }
  return accumulator / basisPoints;
}

function computeBasketId(descriptor: BasketDescriptor): Hex32String {
  return ethers.keccak256(ethers.toUtf8Bytes(basketKey(descriptor))) as Hex32String;
}

export async function deployAsiaFlexFixture(): Promise<DeploymentFixture> {
  const signers = await ethers.getSigners();
  const [
    deployer,
    treasurySigner,
    oracleUpdater,
    oracleManager,
    treasuryController,
    pauser,
    capsManager,
    complianceManager,
    user1,
    user2,
    user3,
  ] = signers;

  const baseAssetFactory = await ethers.getContractFactory("MockERC20");
  const baseAsset = (await baseAssetFactory.deploy("MockUSD", "mUSD")) as MockERC20;
  await baseAsset.waitForDeployment();

  const medianOracleFactory = await ethers.getContractFactory("MedianOracle");
  const medianOracle = (await medianOracleFactory.deploy(await deployer.getAddress())) as MedianOracle;
  await medianOracle.waitForDeployment();
  await (await medianOracle.setUpdater(await deployer.getAddress(), true)).wait();
  await (await medianOracle.setUpdater(oracleUpdater.address, true)).wait();

  const navOracleFactory = await ethers.getContractFactory("NAVOracleAdapter");
  const navOracle = (await navOracleFactory.deploy(await deployer.getAddress())) as NAVOracleAdapter;
  await navOracle.waitForDeployment();
  await (await navOracle.grantRole(await navOracle.ORACLE_UPDATER_ROLE(), oracleUpdater.address)).wait();
  await (await navOracle.grantRole(await navOracle.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();

  const managerFactory = await ethers.getContractFactory("BasketManager");
  const manager = (await managerFactory.deploy(
    await deployer.getAddress(),
    2 * 24 * 60 * 60,
    await navOracle.getAddress()
  )) as BasketManager;
  await manager.waitForDeployment();
  await (await manager.grantRole(await manager.GOV_ROLE(), oracleManager.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), treasuryController.address)).wait();
  await (await manager.grantRole(await manager.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();

  const treasuryFactory = await ethers.getContractFactory("BasketTreasuryController");
  const treasury = (await treasuryFactory.deploy(
    await deployer.getAddress(),
    await manager.getAddress()
  )) as BasketTreasuryController;
  await treasury.waitForDeployment();
  await (await treasury.grantRole(await treasury.CONTROLLER_ROLE(), treasuryController.address)).wait();
  await (await treasury.grantRole(await treasury.TREASURY_SIGNER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), await treasury.getAddress())).wait();

  const baskets: Record<string, BasketContractInfo> = {};
  for (const descriptor of BASKETS) {
    const basketId = computeBasketId(descriptor);
    const tokenFactory = await ethers.getContractFactory("BasketToken");
    const token = (await tokenFactory.deploy(
      descriptor.name,
      descriptor.symbol,
      18,
      await manager.getAddress()
    )) as BasketToken;
    await token.waitForDeployment();

    const limits: BasketManager.BasketLimitsStruct = {
      dailyMintCap: 0n,
      dailyNetInflowCap: 0n,
      totalCap: 0n,
    };
    await (await manager.registerBasket(basketId, await token.getAddress(), limits)).wait();

    const nav = computeInitialNav(descriptor);
    await (await navOracle.updateNAV(basketId, nav)).wait();

    baskets[descriptor.symbol] = {
      descriptor,
      basketId,
      token,
    };
  }

  const constants = {
    defaultNav: ethers.parseUnits("100", 18),
    defaultDeadlineWindow: DEFAULT_DEADLINE_SECONDS,
  };

  return {
    baseAsset,
    manager,
    treasury,
    navOracle,
    medianOracle,
    baskets,
    signers: {
      deployer,
      treasurySigner,
      oracleUpdater,
      oracleManager,
      treasuryController,
      pauser,
      capsManager,
      complianceManager,
      user1,
      user2,
      user3,
    },
    constants,
  };
}

export function createMintRequest(
  basketId: string,
  to: string,
  notional: bigint,
  overrides: Partial<Omit<MintRedeemRequest, "basketId" | "to" | "notional">> = {}
): MintRedeemRequest {
  return {
    basketId: normalizeBasketId(basketId),
    to: ethers.getAddress(to),
    notional,
    nav: overrides.nav ?? ethers.parseUnits("100", 18),
    deadline: overrides.deadline ?? defaultDeadline(),
    proofHash: overrides.proofHash ?? (ethers.keccak256(ethers.randomBytes(32)) as Hex32String),
    nonce: overrides.nonce ?? 0n,
  };
}

export function createRedeemRequest(
  basketId: string,
  account: string,
  notional: bigint,
  overrides: Partial<Omit<MintRedeemRequest, "basketId" | "to" | "notional">> = {}
): MintRedeemRequest {
  return createMintRequest(basketId, account, notional, overrides);
}

export async function signMintRequest(
  request: MintRedeemRequest,
  signer: SignerWithAddress,
  treasuryAddress: string
): Promise<string> {
  const domain = {
    name: "BasketTreasury",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: ethers.getAddress(treasuryAddress),
  };

  const types = {
    MintRedeem: [
      { name: "basketId", type: "bytes32" },
      { name: "to", type: "address" },
      { name: "notional", type: "uint256" },
      { name: "nav", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "proofHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };

  return signer.signTypedData(domain, types, request);
}

export async function signRedeemRequest(
  request: MintRedeemRequest,
  signer: SignerWithAddress,
  treasuryAddress: string
): Promise<string> {
  return signMintRequest(request, signer, treasuryAddress);
}

export function generateReserveHash(data: string): Hex32String {
  return ethers.keccak256(ethers.toUtf8Bytes(data)) as Hex32String;
}

export async function fastForward(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

export async function getBlockTimestamp(): Promise<number> {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return block!.timestamp;
}

export function formatEther(value: bigint): string {
  return ethers.formatEther(value);
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

export async function estimateGasForMint(
  treasury: BasketTreasuryController,
  request: MintRedeemRequest,
  signature: string,
  signerAddress: string
): Promise<bigint> {
  return treasury.mintWithProof.estimateGas(request, signature, ethers.getAddress(signerAddress));
}

export async function estimateGasForRedeem(
  treasury: BasketTreasuryController,
  request: MintRedeemRequest,
  signature: string,
  signerAddress: string
): Promise<bigint> {
  return treasury.redeemWithProof.estimateGas(request, signature, ethers.getAddress(signerAddress));
}

export { time };
