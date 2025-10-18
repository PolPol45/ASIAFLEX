"use strict";
const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
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
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
const __importStar =
  (this && this.__importStar) ||
  (function () {
    let ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          const ar = [];
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      const result = {};
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
// import { AsiaFlexToken, NAVOracleAdapter, TreasuryController } from "../typechain-types";
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, config_1.task)("status", "Displays comprehensive status information for AsiaFlex contracts")
  .addOptionalParam("contract", "Contract to check (all, token, oracle, treasury, or address)", "all")
  .addOptionalParam("basket", "Basket identifier (bytes32) when inspecting NAV oracle", "")
  .addFlag("detailed", "Show detailed information including recent activity")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const network = await ethers.provider.getNetwork();
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`📊 AsiaFlex System Status - ${network.name} (Block: ${currentBlock})`);
    console.log("=".repeat(70));
    // Load deployment
    const deploymentPath = path.join(__dirname, "../deployments", `${network.name}.json`);
    let deployment = {};
    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
      console.log(`🕐 Deployment: ${new Date(deployment.timestamp).toLocaleString()}`);
    } else if (taskArgs.contract === "all") {
      console.log("⚠️  No deployment file found. Limited status available.");
    }
    // AsiaFlexToken Status
    async function displayTokenStatus(address) {
      console.log(`\n🪙 AsiaFlexToken Status (${address})`);
      console.log("-".repeat(50));
      try {
        const token = await ethers.getContractAt("AsiaFlexToken", address);
        // Basic info
        const name = await token.name();
        const symbol = await token.symbol();
        // const _decimals = await token.decimals();
        const totalSupply = await token.totalSupply();
        const supplyCap = await token.supplyCap();
        console.log(`📝 Token: ${name} (${symbol})`);
        console.log(`📈 Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
        console.log(`🧢 Supply Cap: ${ethers.formatEther(supplyCap)} ${symbol}`);
        console.log(`💾 Remaining Cap: ${ethers.formatEther(supplyCap - totalSupply)} ${symbol}`);
        // Pause status
        const isPaused = await token.paused();
        console.log(`⏸️  Paused: ${isPaused ? "🔴 YES" : "🟢 NO"}`);
        // Circuit breaker status
        const maxDailyMint = await token.maxDailyMint();
        const maxDailyNetInflows = await token.maxDailyNetInflows();
        const remainingDailyMint = await token.getRemainingDailyMint();
        const remainingDailyNetInflows = await token.getRemainingDailyNetInflows();
        const lastResetTimestamp = await token.lastResetTimestamp();
        console.log(`\n🔒 Circuit Breakers:`);
        console.log(`   Max Daily Mint: ${ethers.formatEther(maxDailyMint)} ${symbol}`);
        console.log(`   Remaining Today: ${ethers.formatEther(remainingDailyMint)} ${symbol}`);
        console.log(`   Max Daily Net Inflows: ${ethers.formatEther(maxDailyNetInflows)} ${symbol}`);
        console.log(`   Remaining Today: ${ethers.formatEther(remainingDailyNetInflows)} ${symbol}`);
        console.log(`   Last Reset: ${new Date(Number(lastResetTimestamp) * 1000).toLocaleString()}`);
        // Legacy compatibility
        const reserves = await token.reserves();
        const price = await token.getPrice();
        console.log(`\n🏦 Legacy State:`);
        console.log(`   Reserves: ${ethers.formatEther(reserves)} ${symbol}`);
        console.log(`   Price: ${price > 0 ? ethers.formatEther(price) + " USD" : "Not set"}`);
        if (taskArgs.detailed) {
          // Try to get recent events (limited by RPC)
          try {
            const mintFilter = token.filters.Mint();
            const burnFilter = token.filters.Burn();
            const recentMints = await token.queryFilter(mintFilter, currentBlock - 1000, currentBlock);
            const recentBurns = await token.queryFilter(burnFilter, currentBlock - 1000, currentBlock);
            console.log(`\n📊 Recent Activity (last 1000 blocks):`);
            console.log(`   Mints: ${recentMints.length}`);
            console.log(`   Burns: ${recentBurns.length}`);
          } catch (error) {
            console.log(`\n📊 Recent Activity: Unable to fetch (${error})`);
          }
        }
      } catch (error) {
        console.log(`❌ Error reading token status: ${error}`);
      }
    }
    // NAVOracleAdapter Status
    async function displayOracleStatus(address) {
      console.log(`\n🔮 NAVOracleAdapter Status (${address})`);
      console.log("-".repeat(50));
      try {
        const oracle = await ethers.getContractAt("NAVOracleAdapter", address);
        const basketId = taskArgs.basket || process.env.NAV_STATUS_BASKET_ID || "";
        if (!basketId) {
          console.log(
            "ℹ️  Provide --basket <bytes32> or NAV_STATUS_BASKET_ID env var to inspect per-basket observations."
          );
        } else {
          const observation = await oracle.getObservation(basketId);
          const { nav, timestamp, stalenessThreshold, deviationThreshold } = observation;
          const navValue = ethers.formatEther(nav);
          const updatedAt = Number(timestamp);
          const thresholdSeconds = Number(stalenessThreshold);
          const deviationBps = Number(deviationThreshold);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const ageSeconds = updatedAt ? nowSeconds - updatedAt : undefined;
          const isStale = thresholdSeconds > 0 && ageSeconds !== undefined ? ageSeconds > thresholdSeconds : false;
          console.log(`� Basket ID: ${basketId}`);
          console.log(`💰 Current NAV: ${navValue} USD`);
          console.log(`🕐 Last Update: ${updatedAt ? new Date(updatedAt * 1000).toLocaleString() : "n/a"}`);
          console.log(`⏰ Staleness Threshold: ${thresholdSeconds} seconds (${thresholdSeconds / 3600} hours)`);
          console.log(`📊 Deviation Threshold: ${deviationBps / 100}%`);
          console.log(`🚨 Status: ${isStale ? "🔴 STALE" : "🟢 FRESH"}`);
        }
        if (taskArgs.detailed) {
          try {
            const updateFilter = oracle.filters.NAVUpdated();
            const recentUpdates = await oracle.queryFilter(updateFilter, currentBlock - 1000, currentBlock);
            console.log(`\n📊 Recent Updates (last 1000 blocks): ${recentUpdates.length}`);
            if (recentUpdates.length > 0) {
              const lastUpdate = recentUpdates[recentUpdates.length - 1];
              console.log(`   Last Update Block: ${lastUpdate.blockNumber}`);
            }
          } catch (error) {
            console.log(`\n📊 Recent Activity: Unable to fetch (${error})`);
          }
        }
      } catch (error) {
        console.log(`❌ Error reading oracle status: ${error}`);
      }
    }
    // TreasuryController Status
    async function displayTreasuryStatus(address) {
      console.log(`\n🏛️  TreasuryController Status (${address})`);
      console.log("-".repeat(50));
      try {
        const treasury = await ethers.getContractAt("TreasuryController", address);
        // Configuration
        const treasurySigner = await treasury.getTreasurySigner();
        const requestExpiration = await treasury.getRequestExpiration();
        const asiaFlexTokenAddress = await treasury.ASIA_FLEX_TOKEN();
        console.log(`🔑 Treasury Signer: ${treasurySigner}`);
        console.log(`⏰ Request Expiration: ${requestExpiration} seconds (${Number(requestExpiration) / 60} minutes)`);
        console.log(`🪙 AsiaFlex Token: ${asiaFlexTokenAddress}`);
        // Pause status
        const isPaused = await treasury.paused();
        console.log(`⏸️  Paused: ${isPaused ? "🔴 YES" : "🟢 NO"}`);
        if (taskArgs.detailed) {
          try {
            const mintFilter = treasury.filters.MintExecuted();
            const redeemFilter = treasury.filters.RedeemExecuted();
            const recentMints = await treasury.queryFilter(mintFilter, currentBlock - 1000, currentBlock);
            const recentRedeems = await treasury.queryFilter(redeemFilter, currentBlock - 1000, currentBlock);
            console.log(`\n📊 Recent Activity (last 1000 blocks):`);
            console.log(`   Mints Executed: ${recentMints.length}`);
            console.log(`   Redeems Executed: ${recentRedeems.length}`);
          } catch (error) {
            console.log(`\n📊 Recent Activity: Unable to fetch (${error})`);
          }
        }
      } catch (error) {
        console.log(`❌ Error reading treasury status: ${error}`);
      }
    }
    // Execute status checks based on parameters
    if (taskArgs.contract === "all") {
      if (deployment.addresses?.AsiaFlexToken) {
        await displayTokenStatus(deployment.addresses.AsiaFlexToken);
      }
      if (deployment.addresses?.NAVOracleAdapter) {
        await displayOracleStatus(deployment.addresses.NAVOracleAdapter);
      }
      if (deployment.addresses?.TreasuryController) {
        await displayTreasuryStatus(deployment.addresses.TreasuryController);
      }
    } else if (taskArgs.contract === "token" && deployment.addresses?.AsiaFlexToken) {
      await displayTokenStatus(deployment.addresses.AsiaFlexToken);
    } else if (taskArgs.contract === "oracle" && deployment.addresses?.NAVOracleAdapter) {
      await displayOracleStatus(deployment.addresses.NAVOracleAdapter);
    } else if (taskArgs.contract === "treasury" && deployment.addresses?.TreasuryController) {
      await displayTreasuryStatus(deployment.addresses.TreasuryController);
    } else if (ethers.isAddress(taskArgs.contract)) {
      // Try to determine contract type and display appropriate status
      try {
        await displayTokenStatus(taskArgs.contract);
      } catch {
        try {
          await displayOracleStatus(taskArgs.contract);
        } catch {
          try {
            await displayTreasuryStatus(taskArgs.contract);
          } catch {
            console.log("❌ Unknown contract type or invalid address");
          }
        }
      }
    } else {
      console.log("❌ Invalid contract parameter. Use 'all', 'token', 'oracle', 'treasury', or a valid address.");
    }
    console.log("\n🔧 Usage examples:");
    console.log("   npx hardhat status");
    console.log("   npx hardhat status --contract token --detailed");
    console.log("   npx hardhat status --contract 0x123...abc");
  });
