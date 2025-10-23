"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployAsiaFlex = main;
const hardhat_1 = require("hardhat");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function loadConfig() {
  const configPath = path.join(__dirname, "../config/deploy.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  // Default configuration
  const [deployer] = await hardhat_1.ethers.getSigners();
  return {
    token: {
      name: "AsiaFlexToken",
      symbol: "AFX",
      supplyCap: hardhat_1.ethers.parseEther("1000000").toString(), // 1M tokens
      maxDailyMint: hardhat_1.ethers.parseEther("10000").toString(), // 10K tokens per day
      maxDailyNetInflows: hardhat_1.ethers.parseEther("50000").toString(), // 50K tokens per day
    },
    oracle: {
      initialNAV: hardhat_1.ethers.parseEther("100").toString(), // $100 initial NAV
      stalenessThreshold: 86400, // 24 hours
      deviationThreshold: 1000, // 10%
    },
    treasury: {
      signer: deployer.address,
      requestExpiration: 3600, // 1 hour
    },
    roles: {
      admin: deployer.address,
      treasury: [deployer.address],
      pauser: [deployer.address],
      capsManager: [deployer.address],
      blacklistManager: [deployer.address],
      oracleUpdater: [deployer.address],
      oracleManager: [deployer.address],
      treasuryManager: [deployer.address],
    },
  };
}
async function saveDeployment(networkName, addresses, config) {
  const deploymentDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }
  const deployment = {
    network: networkName,
    timestamp: new Date().toISOString(),
    addresses,
    config,
    chainId: (await hardhat_1.ethers.provider.getNetwork()).chainId,
  };
  const filePath = path.join(deploymentDir, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deployment, null, 2));
  console.log(`📝 Deployment saved to ${filePath}`);
}
async function setupRoles(token, oracle, treasury, config) {
  console.log("🔐 Setting up roles...");
  // AsiaFlexToken roles
  const TREASURY_ROLE = await token.TREASURY_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
  const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
  for (const address of config.roles.treasury) {
    if (!(await token.hasRole(TREASURY_ROLE, address))) {
      await token.grantRole(TREASURY_ROLE, address);
      console.log(`  ✅ Granted TREASURY_ROLE to ${address}`);
    }
  }
  for (const address of config.roles.pauser) {
    if (!(await token.hasRole(PAUSER_ROLE, address))) {
      await token.grantRole(PAUSER_ROLE, address);
      console.log(`  ✅ Granted PAUSER_ROLE to ${address}`);
    }
  }
  for (const address of config.roles.capsManager) {
    if (!(await token.hasRole(CAPS_MANAGER_ROLE, address))) {
      await token.grantRole(CAPS_MANAGER_ROLE, address);
      console.log(`  ✅ Granted CAPS_MANAGER_ROLE to ${address}`);
    }
  }
  for (const address of config.roles.blacklistManager) {
    if (!(await token.hasRole(BLACKLIST_MANAGER_ROLE, address))) {
      await token.grantRole(BLACKLIST_MANAGER_ROLE, address);
      console.log(`  ✅ Granted BLACKLIST_MANAGER_ROLE to ${address}`);
    }
  }
  // NAVOracleAdapter roles
  const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
  const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();
  for (const address of config.roles.oracleUpdater) {
    if (!(await oracle.hasRole(ORACLE_UPDATER_ROLE, address))) {
      await oracle.grantRole(ORACLE_UPDATER_ROLE, address);
      console.log(`  ✅ Granted ORACLE_UPDATER_ROLE to ${address}`);
    }
  }
  for (const address of config.roles.oracleManager) {
    if (!(await oracle.hasRole(ORACLE_MANAGER_ROLE, address))) {
      await oracle.grantRole(ORACLE_MANAGER_ROLE, address);
      console.log(`  ✅ Granted ORACLE_MANAGER_ROLE to ${address}`);
    }
  }
  // TreasuryController roles
  const TREASURY_MANAGER_ROLE = await treasury.TREASURY_MANAGER_ROLE();
  for (const address of config.roles.treasuryManager) {
    if (!(await treasury.hasRole(TREASURY_MANAGER_ROLE, address))) {
      await treasury.grantRole(TREASURY_MANAGER_ROLE, address);
      console.log(`  ✅ Granted TREASURY_MANAGER_ROLE to ${address}`);
    }
  }
  console.log("✅ Role setup complete");
}
async function main() {
  console.log("🚀 Starting AsiaFlex deployment...");
  const [deployer] = await hardhat_1.ethers.getSigners();
  const network = await hardhat_1.ethers.provider.getNetwork();
  console.log(`📍 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(
    `💰 Balance: ${hardhat_1.ethers.formatEther(await hardhat_1.ethers.provider.getBalance(deployer.address))} ETH`
  );
  const config = await loadConfig();
  console.log("📄 Config loaded");
  // Deploy AsiaFlexToken
  console.log("\n📦 Deploying AsiaFlexToken...");
  const AsiaFlexTokenFactory = await hardhat_1.ethers.getContractFactory("AsiaFlexToken");
  const token = await AsiaFlexTokenFactory.deploy(
    config.token.name,
    config.token.symbol,
    config.token.supplyCap,
    config.token.maxDailyMint,
    config.token.maxDailyNetInflows
  );
  await token.waitForDeployment();
  console.log(`✅ AsiaFlexToken deployed at: ${await token.getAddress()}`);
  // Deploy NAVOracleAdapter
  console.log("\n📦 Deploying NAVOracleAdapter...");
  const NAVOracleAdapterFactory = await hardhat_1.ethers.getContractFactory("NAVOracleAdapter");
  const oracle = await NAVOracleAdapterFactory.deploy(
    config.oracle.initialNAV,
    config.oracle.stalenessThreshold,
    config.oracle.deviationThreshold
  );
  await oracle.waitForDeployment();
  console.log(`✅ NAVOracleAdapter deployed at: ${await oracle.getAddress()}`);
  // Deploy TreasuryController
  console.log("\n📦 Deploying TreasuryController...");
  const TreasuryControllerFactory = await hardhat_1.ethers.getContractFactory("TreasuryController");
  const treasury = await TreasuryControllerFactory.deploy(
    await token.getAddress(),
    config.treasury.signer,
    config.treasury.requestExpiration
  );
  await treasury.waitForDeployment();
  console.log(`✅ TreasuryController deployed at: ${await treasury.getAddress()}`);
  // Setup roles
  await setupRoles(token, oracle, treasury, config);
  // Grant TREASURY_ROLE to TreasuryController
  const TREASURY_ROLE = await token.TREASURY_ROLE();
  if (!(await token.hasRole(TREASURY_ROLE, await treasury.getAddress()))) {
    await token.grantRole(TREASURY_ROLE, await treasury.getAddress());
    console.log(`✅ Granted TREASURY_ROLE to TreasuryController`);
  }
  const addresses = {
    AsiaFlexToken: await token.getAddress(),
    NAVOracleAdapter: await oracle.getAddress(),
    TreasuryController: await treasury.getAddress(),
  };
  // Save deployment
  await saveDeployment(network.name, addresses, config);
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`   AsiaFlexToken: ${addresses.AsiaFlexToken}`);
  console.log(`   NAVOracleAdapter: ${addresses.NAVOracleAdapter}`);
  console.log(`   TreasuryController: ${addresses.TreasuryController}`);
  console.log("\n🔍 Verification commands:");
  console.log(
    `   npx hardhat verify --network ${network.name} ${addresses.AsiaFlexToken} "${config.token.name}" "${config.token.symbol}" ${config.token.supplyCap} ${config.token.maxDailyMint} ${config.token.maxDailyNetInflows}`
  );
  console.log(
    `   npx hardhat verify --network ${network.name} ${addresses.NAVOracleAdapter} ${config.oracle.initialNAV} ${config.oracle.stalenessThreshold} ${config.oracle.deviationThreshold}`
  );
  console.log(
    `   npx hardhat verify --network ${network.name} ${addresses.TreasuryController} ${addresses.AsiaFlexToken} ${config.treasury.signer} ${config.treasury.requestExpiration}`
  );
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });
}
