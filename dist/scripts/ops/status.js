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
exports.getStatus = getStatus;
const hardhat_1 = require("hardhat");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// interface ContractStatus {
//   address: string;
//   name: string;
//   totalSupply: string;
//   supplyCap: string;
//   dailyMintCap: string;
//   dailyBurnCap: string;
//   dailyNetInflowCap: string;
//   remainingDailyMint: string;
//   remainingDailyBurn: string;
//   remainingDailyNetInflow: string;
//   reserves: string;
//   isPaused: boolean;
//   roles: {
//     admin: string[];
//     treasury: string[];
//     oracle: string[];
//   };
// }
async function loadDeployment(network) {
  const filePath = path.join(__dirname, "../../deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
async function getStatus() {
  const network = await hardhat_1.ethers.provider.getNetwork();
  const [signer] = await hardhat_1.ethers.getSigners();
  console.log(`📊 AsiaFlex Token Status on ${network.name}`);
  console.log(`👤 Querying from: ${signer.address}\n`);
  try {
    const deployment = await loadDeployment(network.name);
    if (!deployment.addresses?.AsiaFlexToken) {
      throw new Error("AsiaFlexToken address not found in deployment");
    }
    const token = await hardhat_1.ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);
    // Basic token info
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const supplyCap = await token.supplyCap();
    // Caps and limits
    const maxDailyMint = await token.maxDailyMint();
    const maxDailyNetInflows = await token.maxDailyNetInflows();
    // Remaining amounts
    const remainingDailyMint = await token.getRemainingDailyMint();
    const remainingDailyNetInflows = await token.getRemainingDailyNetInflows();
    // Contract state
    const isPaused = await token.paused();
    const reserves = await token.reserves();
    // Roles
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();
    const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
    const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
    console.log("🏷️  TOKEN INFORMATION");
    console.log(`   Name: ${name} (${symbol})`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Address: ${await token.getAddress()}`);
    console.log(`   Paused: ${isPaused ? "🔴 YES" : "🟢 NO"}`);
    console.log("\n💰 SUPPLY & CAPS");
    console.log(`   Total Supply: ${hardhat_1.ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Supply Cap: ${hardhat_1.ethers.formatEther(supplyCap)} ${symbol}`);
    console.log(`   Utilization: ${((Number(totalSupply) / Number(supplyCap)) * 100).toFixed(2)}%`);
    console.log("\n📈 DAILY LIMITS");
    console.log(`   Max Daily Mint: ${hardhat_1.ethers.formatEther(maxDailyMint)} ${symbol}`);
    console.log(`   Max Daily Net Inflows: ${hardhat_1.ethers.formatEther(maxDailyNetInflows)} ${symbol}`);
    console.log("\n⏰ REMAINING TODAY");
    console.log(`   Remaining Mint: ${hardhat_1.ethers.formatEther(remainingDailyMint)} ${symbol}`);
    console.log(`   Remaining Net Inflow: ${hardhat_1.ethers.formatEther(remainingDailyNetInflows)} ${symbol}`);
    console.log("\n🏦 RESERVES");
    console.log(`   Current Reserves: ${hardhat_1.ethers.formatEther(reserves)} ${symbol}`);
    console.log("\n🔐 ACCESS CONTROL");
    console.log(`   Default Admin Role: ${DEFAULT_ADMIN_ROLE}`);
    console.log(`   Treasury Role: ${TREASURY_ROLE}`);
    console.log(`   Pauser Role: ${PAUSER_ROLE}`);
    console.log(`   Caps Manager Role: ${CAPS_MANAGER_ROLE}`);
    console.log(`   Blacklist Manager Role: ${BLACKLIST_MANAGER_ROLE}`);
    // NAV Oracle status (if available)
    if (deployment.addresses?.NAVOracleAdapter) {
      console.log("\n🔮 NAV ORACLE STATUS");
      try {
        const oracle = await hardhat_1.ethers.getContractAt("NAVOracleAdapter", deployment.addresses.NAVOracleAdapter);
        const [currentNAV, lastUpdate] = await oracle.getNAV();
        const stalenessThreshold = await oracle.stalenessThreshold();
        const deviationThreshold = await oracle.deviationThreshold();
        const isStale = await oracle.isStale();
        const stalenessSeconds = Number(stalenessThreshold);
        const deviationPercent = Number(deviationThreshold) / 100;
        console.log(`   Address: ${await oracle.getAddress()}`);
        console.log(`   Current NAV: $${hardhat_1.ethers.formatEther(currentNAV)}`);
        console.log(`   Last Update: ${new Date(Number(lastUpdate) * 1000).toISOString()}`);
        console.log(
          `   Staleness Threshold: ${stalenessSeconds} seconds (${(stalenessSeconds / 3600).toFixed(2)} hours)`
        );
        console.log(`   Deviation Threshold: ${deviationPercent}%`);
        console.log(`   Is Stale: ${isStale ? "🔴 YES" : "🟢 NO"}`);
      } catch (error) {
        console.log(`   ❌ Error querying oracle: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    // Save status report
    const statusReport = {
      timestamp: new Date().toISOString(),
      network: network.name,
      contracts: {
        token: {
          address: await token.getAddress(),
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: totalSupply.toString(),
          supplyCap: supplyCap.toString(),
          utilization: (Number(totalSupply) / Number(supplyCap)) * 100,
          isPaused,
          reserves: reserves.toString(),
        },
        oracle: deployment.addresses?.NAVOracleAdapter
          ? {
              address: deployment.addresses.NAVOracleAdapter,
            }
          : null,
      },
      limits: {
        maxDailyMint: maxDailyMint.toString(),
        maxDailyNetInflows: maxDailyNetInflows.toString(),
        remainingDailyMint: remainingDailyMint.toString(),
        remainingDailyNetInflows: remainingDailyNetInflows.toString(),
      },
    };
    // Save to file
    const statusDir = path.join(__dirname, "../../deployments/status");
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }
    const filename = `${network.name}_status_${Date.now()}.json`;
    const filePath = path.join(statusDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(statusReport, null, 2));
    console.log(`\n📝 Status report saved to ${filePath}`);
  } catch (error) {
    console.error("❌ Failed to get status:", error);
    throw error;
  }
}
// CLI interface
async function main() {
  await getStatus();
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}
