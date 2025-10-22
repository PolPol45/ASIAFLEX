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
const config_1 = require("hardhat/config");
// import { AsiaFlexToken, NAVOracleAdapter, TreasuryController } from "../typechain-types";
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, config_1.task)("roles", "Displays role information for AsiaFlex contracts")
  .addOptionalParam("contract", "Contract address (or 'all' for all contracts)", "all")
  .addOptionalParam("account", "Account address to check specific roles for", "")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const network = await ethers.provider.getNetwork();
    // Load deployment
    const deploymentPath = path.join(__dirname, "../deployments", `${network.name}.json`);
    let deployment = {};
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    } else if (taskArgs.contract === "all") {
      console.log("❌ No deployment file found. Please provide contract address manually.");
      return;
    }
    console.log(`🔐 Role Information for ${network.name}`);
    console.log("=".repeat(50));
    if (taskArgs.account) {
      console.log(`👤 Checking roles for account: ${taskArgs.account}`);
    }
    // Helper function to display roles for a contract
    async function displayContractRoles(contractAddress, contractName, roleDefinitions) {
      console.log(`\n📋 ${contractName} (${contractAddress})`);
      console.log("-".repeat(40));
      try {
        const contract = await ethers.getContractAt(contractName, contractAddress);
        for (const [roleName, roleGetter] of Object.entries(roleDefinitions)) {
          try {
            const roleHash = await contract[roleGetter]();
            console.log(`\n🎭 ${roleName}:`);
            console.log(`   Hash: ${roleHash}`);
            if (taskArgs.account) {
              const hasRole = await contract.hasRole(roleHash, taskArgs.account);
              console.log(`   ${taskArgs.account}: ${hasRole ? "✅ HAS ROLE" : "❌ NO ROLE"}`);
            } else {
              // Get role members (this is more complex and might require events)
              console.log(`   Use --account <address> to check specific account`);
            }
          } catch (error) {
            console.log(`   ❌ Error checking ${roleName}: ${error}`);
          }
        }
        // Check admin role separately
        try {
          const adminRole = await contract.DEFAULT_ADMIN_ROLE();
          console.log(`\n👑 DEFAULT_ADMIN_ROLE:`);
          console.log(`   Hash: ${adminRole}`);
          if (taskArgs.account) {
            const hasAdminRole = await contract.hasRole(adminRole, taskArgs.account);
            console.log(`   ${taskArgs.account}: ${hasAdminRole ? "✅ HAS ROLE" : "❌ NO ROLE"}`);
          }
        } catch (error) {
          console.log(`   ❌ Error checking admin role: ${error}`);
        }
      } catch (error) {
        console.log(`❌ Error connecting to contract: ${error}`);
      }
    }
    // AsiaFlexToken roles
    if (taskArgs.contract === "all" || taskArgs.contract.toLowerCase() === "asiaflex") {
      if (deployment.addresses?.AsiaFlexToken) {
        await displayContractRoles(deployment.addresses.AsiaFlexToken, "AsiaFlexToken", {
          TREASURY_ROLE: "TREASURY_ROLE",
          PAUSER_ROLE: "PAUSER_ROLE",
          CAPS_MANAGER_ROLE: "CAPS_MANAGER_ROLE",
          BLACKLIST_MANAGER_ROLE: "BLACKLIST_MANAGER_ROLE",
        });
      }
    }
    // NAVOracleAdapter roles
    if (taskArgs.contract === "all" || taskArgs.contract.toLowerCase() === "oracle") {
      if (deployment.addresses?.NAVOracleAdapter) {
        await displayContractRoles(deployment.addresses.NAVOracleAdapter, "NAVOracleAdapter", {
          ORACLE_UPDATER_ROLE: "ORACLE_UPDATER_ROLE",
          ORACLE_MANAGER_ROLE: "ORACLE_MANAGER_ROLE",
        });
      }
    }
    // TreasuryController roles
    if (taskArgs.contract === "all" || taskArgs.contract.toLowerCase() === "treasury") {
      if (deployment.addresses?.TreasuryController) {
        await displayContractRoles(deployment.addresses.TreasuryController, "TreasuryController", {
          TREASURY_MANAGER_ROLE: "TREASURY_MANAGER_ROLE",
        });
      }
    }
    // Single contract by address
    if (ethers.isAddress(taskArgs.contract)) {
      console.log(`\n🔍 Checking contract at ${taskArgs.contract}`);
      // Try to determine contract type by calling different role functions
      try {
        const contract = await ethers.getContractAt("AsiaFlexToken", taskArgs.contract);
        await contract.TREASURY_ROLE(); // Test if it's AsiaFlexToken
        await displayContractRoles(taskArgs.contract, "AsiaFlexToken", {
          TREASURY_ROLE: "TREASURY_ROLE",
          PAUSER_ROLE: "PAUSER_ROLE",
          CAPS_MANAGER_ROLE: "CAPS_MANAGER_ROLE",
          BLACKLIST_MANAGER_ROLE: "BLACKLIST_MANAGER_ROLE",
        });
      } catch {
        try {
          const contract = await ethers.getContractAt("NAVOracleAdapter", taskArgs.contract);
          await contract.ORACLE_UPDATER_ROLE(); // Test if it's NAVOracleAdapter
          await displayContractRoles(taskArgs.contract, "NAVOracleAdapter", {
            ORACLE_UPDATER_ROLE: "ORACLE_UPDATER_ROLE",
            ORACLE_MANAGER_ROLE: "ORACLE_MANAGER_ROLE",
          });
        } catch {
          try {
            const contract = await ethers.getContractAt("TreasuryController", taskArgs.contract);
            await contract.TREASURY_MANAGER_ROLE(); // Test if it's TreasuryController
            await displayContractRoles(taskArgs.contract, "TreasuryController", {
              TREASURY_MANAGER_ROLE: "TREASURY_MANAGER_ROLE",
            });
          } catch {
            console.log("❌ Unknown contract type or invalid contract");
          }
        }
      }
    }
    console.log("\n🔧 Usage examples:");
    console.log("   npx hardhat roles --account 0x123...abc");
    console.log("   npx hardhat roles --contract asiaflex --account 0x123...abc");
    console.log("   npx hardhat roles --contract 0x456...def");
  });
