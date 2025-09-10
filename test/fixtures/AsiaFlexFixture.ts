import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AsiaFlexToken, NAVOracleAdapter, TreasuryController } from "../../typechain-types";

export interface DeploymentFixture {
  token: AsiaFlexToken;
  oracle: NAVOracleAdapter;
  treasury: TreasuryController;
  signers: {
    deployer: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    oracleUpdater: SignerWithAddress;
    oracleManager: SignerWithAddress;
    treasuryManager: SignerWithAddress;
    pauser: SignerWithAddress;
    capsManager: SignerWithAddress;
    blacklistManager: SignerWithAddress;
    user1: SignerWithAddress;
    user2: SignerWithAddress;
    user3: SignerWithAddress;
  };
  constants: {
    SUPPLY_CAP: bigint;
    MAX_DAILY_MINT: bigint;
    MAX_DAILY_NET_INFLOWS: bigint;
    INITIAL_NAV: bigint;
    STALENESS_THRESHOLD: number;
    DEVIATION_THRESHOLD: number;
    REQUEST_EXPIRATION: number;
  };
}

export async function deployAsiaFlexFixture(): Promise<DeploymentFixture> {
  const signers = await ethers.getSigners();
  const [
    deployer,
    treasurySigner,
    oracleUpdater,
    oracleManager,
    treasuryManager,
    pauser,
    capsManager,
    blacklistManager,
    user1,
    user2,
    user3,
  ] = signers;

  // Constants
  const constants = {
    SUPPLY_CAP: ethers.parseEther("1000000"), // 1M tokens
    MAX_DAILY_MINT: ethers.parseEther("10000"), // 10K tokens
    MAX_DAILY_NET_INFLOWS: ethers.parseEther("50000"), // 50K tokens
    INITIAL_NAV: ethers.parseEther("100"), // $100
    STALENESS_THRESHOLD: 86400, // 24 hours
    DEVIATION_THRESHOLD: 1000, // 10%
    REQUEST_EXPIRATION: 3600, // 1 hour
  };

  // Deploy AsiaFlexToken
  const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
  const token = await AsiaFlexTokenFactory.deploy(
    "AsiaFlexToken",
    "AFX",
    constants.SUPPLY_CAP,
    constants.MAX_DAILY_MINT,
    constants.MAX_DAILY_NET_INFLOWS
  );

  // Deploy NAVOracleAdapter
  const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
  const oracle = await NAVOracleAdapterFactory.deploy(
    constants.INITIAL_NAV,
    constants.STALENESS_THRESHOLD,
    constants.DEVIATION_THRESHOLD
  );

  // Deploy TreasuryController
  const TreasuryControllerFactory = await ethers.getContractFactory("TreasuryController");
  const treasury = await TreasuryControllerFactory.deploy(
    await token.getAddress(),
    treasurySigner.address,
    constants.REQUEST_EXPIRATION
  );

  // Setup comprehensive role structure
  await setupRoles(token, oracle, treasury, {
    deployer,
    treasurySigner,
    oracleUpdater,
    oracleManager,
    treasuryManager,
    pauser,
    capsManager,
    blacklistManager,
  });

  return {
    token,
    oracle,
    treasury,
    signers: {
      deployer,
      treasurySigner,
      oracleUpdater,
      oracleManager,
      treasuryManager,
      pauser,
      capsManager,
      blacklistManager,
      user1,
      user2,
      user3,
    },
    constants,
  };
}

async function setupRoles(
  token: AsiaFlexToken,
  oracle: NAVOracleAdapter,
  treasury: TreasuryController,
  roleHolders: {
    deployer: SignerWithAddress;
    treasurySigner: SignerWithAddress;
    oracleUpdater: SignerWithAddress;
    oracleManager: SignerWithAddress;
    treasuryManager: SignerWithAddress;
    pauser: SignerWithAddress;
    capsManager: SignerWithAddress;
    blacklistManager: SignerWithAddress;
  }
) {
  // AsiaFlexToken roles
  const TREASURY_ROLE = await token.TREASURY_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
  const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();

  await token.grantRole(TREASURY_ROLE, await treasury.getAddress()); // Grant to TreasuryController
  await token.grantRole(PAUSER_ROLE, roleHolders.pauser.address);
  await token.grantRole(CAPS_MANAGER_ROLE, roleHolders.capsManager.address);
  await token.grantRole(BLACKLIST_MANAGER_ROLE, roleHolders.blacklistManager.address);

  // NAVOracleAdapter roles
  const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
  const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();

  await oracle.grantRole(ORACLE_UPDATER_ROLE, roleHolders.oracleUpdater.address);
  await oracle.grantRole(ORACLE_MANAGER_ROLE, roleHolders.oracleManager.address);

  // TreasuryController roles
  const TREASURY_MANAGER_ROLE = await treasury.TREASURY_MANAGER_ROLE();
  await treasury.grantRole(TREASURY_MANAGER_ROLE, roleHolders.treasuryManager.address);
}

export async function createMintRequest(to: string, amount: bigint, reserveHash?: string, timestamp?: number) {
  return {
    to,
    amount,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    reserveHash: reserveHash || ethers.keccak256(ethers.toUtf8Bytes(`mint-${Date.now()}`)),
  };
}

export async function createRedeemRequest(from: string, amount: bigint, reserveHash?: string, timestamp?: number) {
  return {
    from,
    amount,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    reserveHash: reserveHash || ethers.keccak256(ethers.toUtf8Bytes(`redeem-${Date.now()}`)),
  };
}

export async function signMintRequest(request: any, signer: SignerWithAddress, treasuryAddress: string) {
  const domain = {
    name: "TreasuryController",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: treasuryAddress,
  };

  const types = {
    MintRequest: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "reserveHash", type: "bytes32" },
    ],
  };

  return await signer.signTypedData(domain, types, request);
}

export async function signRedeemRequest(request: any, signer: SignerWithAddress, treasuryAddress: string) {
  const domain = {
    name: "TreasuryController",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: treasuryAddress,
  };

  const types = {
    RedeemRequest: [
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "reserveHash", type: "bytes32" },
    ],
  };

  return await signer.signTypedData(domain, types, request);
}

export function generateReserveHash(data: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

export async function fastForward(seconds: number) {
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

// Gas estimation helpers
export async function estimateGasForMint(
  treasury: TreasuryController,
  request: any,
  signature: string
): Promise<bigint> {
  return await treasury.executeMint.estimateGas(request, signature);
}

export async function estimateGasForRedeem(
  treasury: TreasuryController,
  request: any,
  signature: string
): Promise<bigint> {
  return await treasury.executeRedeem.estimateGas(request, signature);
}
