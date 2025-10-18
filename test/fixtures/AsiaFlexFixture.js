"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = void 0;
exports.deployAsiaFlexFixture = deployAsiaFlexFixture;
exports.createMintRequest = createMintRequest;
exports.createRedeemRequest = createRedeemRequest;
exports.signMintRequest = signMintRequest;
exports.signRedeemRequest = signRedeemRequest;
exports.generateReserveHash = generateReserveHash;
exports.fastForward = fastForward;
exports.getBlockTimestamp = getBlockTimestamp;
exports.formatEther = formatEther;
exports.parseEther = parseEther;
exports.estimateGasForMint = estimateGasForMint;
exports.estimateGasForRedeem = estimateGasForRedeem;
const hardhat_1 = require("hardhat");
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
Object.defineProperty(exports, "time", {
  enumerable: true,
  get: function () {
    return hardhat_network_helpers_1.time;
  },
});
const basketDescriptors_1 = require("../../scripts/deploy/basketDescriptors");
const DEFAULT_DEADLINE_SECONDS = 3600;
function defaultDeadline(seconds = DEFAULT_DEADLINE_SECONDS) {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}
function normalizeBasketId(value) {
  const prefixed = value.startsWith("0x") ? value : `0x${value}`;
  if (!hardhat_1.ethers.isHexString(prefixed, 32)) {
    throw new Error(`BasketId non valido: ${value}`);
  }
  return prefixed;
}
function computeInitialNav(descriptor) {
  const basisPoints = 10000n;
  const accumulator = descriptor.allocations.reduce((total, allocation) => {
    const decimals = BigInt(allocation.decimals ?? 18);
    const price = hardhat_1.ethers.parseUnits(allocation.mockPrice ?? "1", Number(decimals));
    let normalized = price;
    if (decimals > 18n) {
      normalized = price / 10n ** (decimals - 18n);
    } else if (decimals < 18n) {
      normalized = price * 10n ** (18n - decimals);
    }
    return total + normalized * BigInt(allocation.weightBps ?? 0);
  }, 0n);
  if (accumulator === 0n) {
    return hardhat_1.ethers.parseUnits("1", 18);
  }
  return accumulator / basisPoints;
}
function computeBasketId(descriptor) {
  return hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes((0, basketDescriptors_1.basketKey)(descriptor)));
}
async function deployAsiaFlexFixture() {
  const signers = await hardhat_1.ethers.getSigners();
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
  const baseAssetFactory = await hardhat_1.ethers.getContractFactory("MockERC20");
  const baseAsset = await baseAssetFactory.deploy("MockUSD", "mUSD");
  await baseAsset.waitForDeployment();
  const medianOracleFactory = await hardhat_1.ethers.getContractFactory("MedianOracle");
  const medianOracle = await medianOracleFactory.deploy(await deployer.getAddress());
  await medianOracle.waitForDeployment();
  await (await medianOracle.setUpdater(await deployer.getAddress(), true)).wait();
  await (await medianOracle.setUpdater(oracleUpdater.address, true)).wait();
  const navOracleFactory = await hardhat_1.ethers.getContractFactory("NAVOracleAdapter");
  const navOracle = await navOracleFactory.deploy(await deployer.getAddress());
  await navOracle.waitForDeployment();
  await (await navOracle.grantRole(await navOracle.ORACLE_UPDATER_ROLE(), oracleUpdater.address)).wait();
  await (await navOracle.grantRole(await navOracle.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();
  const managerFactory = await hardhat_1.ethers.getContractFactory("BasketManager");
  const manager = await managerFactory.deploy(
    await deployer.getAddress(),
    2 * 24 * 60 * 60,
    await navOracle.getAddress()
  );
  await manager.waitForDeployment();
  await (await manager.grantRole(await manager.GOV_ROLE(), oracleManager.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), treasuryController.address)).wait();
  await (await manager.grantRole(await manager.ORACLE_MANAGER_ROLE(), oracleManager.address)).wait();
  const treasuryFactory = await hardhat_1.ethers.getContractFactory("BasketTreasuryController");
  const treasury = await treasuryFactory.deploy(await deployer.getAddress(), await manager.getAddress());
  await treasury.waitForDeployment();
  await (await treasury.grantRole(await treasury.CONTROLLER_ROLE(), treasuryController.address)).wait();
  await (await treasury.grantRole(await treasury.TREASURY_SIGNER_ROLE(), treasurySigner.address)).wait();
  await (await manager.grantRole(await manager.CONTROLLER_ROLE(), await treasury.getAddress())).wait();
  const baskets = {};
  for (const descriptor of basketDescriptors_1.BASKETS) {
    const basketId = computeBasketId(descriptor);
    const tokenFactory = await hardhat_1.ethers.getContractFactory("BasketToken");
    const token = await tokenFactory.deploy(descriptor.name, descriptor.symbol, 18, await manager.getAddress());
    await token.waitForDeployment();
    const limits = {
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
    defaultNav: hardhat_1.ethers.parseUnits("100", 18),
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
function createMintRequest(basketId, to, notional, overrides = {}) {
  return {
    basketId: normalizeBasketId(basketId),
    to: hardhat_1.ethers.getAddress(to),
    notional,
    nav: overrides.nav ?? hardhat_1.ethers.parseUnits("100", 18),
    deadline: overrides.deadline ?? defaultDeadline(),
    proofHash: overrides.proofHash ?? hardhat_1.ethers.keccak256(hardhat_1.ethers.randomBytes(32)),
    nonce: overrides.nonce ?? 0n,
  };
}
function createRedeemRequest(basketId, account, notional, overrides = {}) {
  return createMintRequest(basketId, account, notional, overrides);
}
async function signMintRequest(request, signer, treasuryAddress) {
  const domain = {
    name: "BasketTreasury",
    version: "1",
    chainId: (await hardhat_1.ethers.provider.getNetwork()).chainId,
    verifyingContract: hardhat_1.ethers.getAddress(treasuryAddress),
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
async function signRedeemRequest(request, signer, treasuryAddress) {
  return signMintRequest(request, signer, treasuryAddress);
}
function generateReserveHash(data) {
  return hardhat_1.ethers.keccak256(hardhat_1.ethers.toUtf8Bytes(data));
}
async function fastForward(seconds) {
  await hardhat_1.ethers.provider.send("evm_increaseTime", [seconds]);
  await hardhat_1.ethers.provider.send("evm_mine", []);
}
async function getBlockTimestamp() {
  const blockNumber = await hardhat_1.ethers.provider.getBlockNumber();
  const block = await hardhat_1.ethers.provider.getBlock(blockNumber);
  return block.timestamp;
}
function formatEther(value) {
  return hardhat_1.ethers.formatEther(value);
}
function parseEther(value) {
  return hardhat_1.ethers.parseEther(value);
}
async function estimateGasForMint(treasury, request, signature, signerAddress) {
  return treasury.mintWithProof.estimateGas(request, signature, hardhat_1.ethers.getAddress(signerAddress));
}
async function estimateGasForRedeem(treasury, request, signature, signerAddress) {
  return treasury.redeemWithProof.estimateGas(request, signature, hardhat_1.ethers.getAddress(signerAddress));
}
