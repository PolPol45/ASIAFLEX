import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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

async function loadDeployment(network: string) {
  const filePath = path.join(__dirname, "../../deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function getStatus(): Promise<void> {
  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();

  console.log(`📊 AsiaFlex Token Status on ${network.name}`);
  console.log(`👤 Querying from: ${signer.address}\n`);

  try {
    const deployment = await loadDeployment(network.name);

    if (!deployment.addresses?.AsiaFlexToken) {
      throw new Error("AsiaFlexToken address not found in deployment");
    }

    const token = await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);

    // Basic token info
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const supplyCap = await token.supplyCap();

    // Caps and limits
    const dailyMintCap = await token.dailyMintCap();
    const dailyBurnCap = await token.dailyBurnCap();
    const dailyNetInflowCap = await token.dailyNetInflowCap();

    // Remaining amounts
    const remainingDailyMint = await token.getRemainingDailyMint();
    const remainingDailyBurn = await token.getRemainingDailyBurn();
    const remainingDailyNetInflow = await token.getRemainingDailyNetInflows();

    // Contract state
    const isPaused = await token.paused();
    const reserves = await token.reserves();

    // Roles
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const ORACLE_ROLE = await token.ORACLE_ROLE();

    console.log("🏷️  TOKEN INFORMATION");
    console.log(`   Name: ${name} (${symbol})`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Address: ${await token.getAddress()}`);
    console.log(`   Paused: ${isPaused ? "🔴 YES" : "🟢 NO"}`);

    console.log("\n💰 SUPPLY & CAPS");
    console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`   Supply Cap: ${ethers.formatEther(supplyCap)} ${symbol}`);
    console.log(`   Utilization: ${((Number(totalSupply) / Number(supplyCap)) * 100).toFixed(2)}%`);

    console.log("\n📈 DAILY LIMITS");
    console.log(`   Daily Mint Cap: ${ethers.formatEther(dailyMintCap)} ${symbol}`);
    console.log(`   Daily Burn Cap: ${ethers.formatEther(dailyBurnCap)} ${symbol}`);
    console.log(`   Daily Net Inflow Cap: ${ethers.formatEther(dailyNetInflowCap)} ${symbol}`);

    console.log("\n⏰ REMAINING TODAY");
    console.log(`   Remaining Mint: ${ethers.formatEther(remainingDailyMint)} ${symbol}`);
    console.log(`   Remaining Burn: ${ethers.formatEther(remainingDailyBurn)} ${symbol}`);
    console.log(`   Remaining Net Inflow: ${ethers.formatEther(remainingDailyNetInflow)} ${symbol}`);

    console.log("\n🏦 RESERVES");
    console.log(`   Current Reserves: ${ethers.formatEther(reserves)} ${symbol}`);

    console.log("\n🔐 ACCESS CONTROL");
    console.log(`   Default Admin Role: ${DEFAULT_ADMIN_ROLE}`);
    console.log(`   Treasury Role: ${TREASURY_ROLE}`);
    console.log(`   Oracle Role: ${ORACLE_ROLE}`);

    // NAV Oracle status (if available)
    if (deployment.addresses?.NAVOracleAdapter) {
      console.log("\n🔮 NAV ORACLE STATUS");
      try {
        const oracle = await ethers.getContractAt("NAVOracleAdapter", deployment.addresses.NAVOracleAdapter);
        const currentNAV = await oracle.currentNAV();
        const lastUpdate = await oracle.lastUpdateTimestamp();
        const maxStaleness = await oracle.maxStaleness();
        const maxDeviation = await oracle.maxDeviation();
        const isStale = await oracle.isStale();

        console.log(`   Address: ${await oracle.getAddress()}`);
        console.log(`   Current NAV: $${ethers.formatEther(currentNAV)}`);
        console.log(`   Last Update: ${new Date(Number(lastUpdate) * 1000).toISOString()}`);
        console.log(`   Max Staleness: ${maxStaleness} seconds`);
        console.log(`   Max Deviation: ${maxDeviation / 100n}%`);
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
        dailyMintCap: dailyMintCap.toString(),
        dailyBurnCap: dailyBurnCap.toString(),
        dailyNetInflowCap: dailyNetInflowCap.toString(),
        remainingDailyMint: remainingDailyMint.toString(),
        remainingDailyBurn: remainingDailyBurn.toString(),
        remainingDailyNetInflow: remainingDailyNetInflow.toString(),
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

export { getStatus };
