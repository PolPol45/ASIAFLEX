import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

const { ethers } = hre;

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
    const maxDailyMint = await token.maxDailyMint();
    const maxDailyNetInflows = await token.maxDailyNetInflows();

    // Remaining amounts
    const remainingDailyMint = await token.getRemainingDailyMint();
    const remainingDailyNetInflow = await token.getRemainingDailyNetInflows();

    // Contract state
    const isPaused = await token.paused();
    const reserves = await token.reserves();

    // Roles
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
    const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();

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
    console.log(`   Max Daily Mint: ${ethers.formatEther(maxDailyMint)} ${symbol}`);
    console.log(`   Max Daily Net Inflows: ${ethers.formatEther(maxDailyNetInflows)} ${symbol}`);

    console.log("\n⏰ REMAINING TODAY");
    console.log(`   Remaining Mint: ${ethers.formatEther(remainingDailyMint)} ${symbol}`);
    console.log(`   Remaining Net Inflow: ${ethers.formatEther(remainingDailyNetInflow)} ${symbol}`);

    console.log("\n🏦 RESERVES");
    console.log(`   Current Reserves: ${ethers.formatEther(reserves)} ${symbol}`);

    console.log("\n🔐 ACCESS CONTROL");
    console.log(`   Default Admin Role: ${DEFAULT_ADMIN_ROLE}`);
    console.log(`   Treasury Role: ${TREASURY_ROLE}`);
    console.log(`   Caps Manager Role: ${CAPS_MANAGER_ROLE}`);
    console.log(`   Blacklist Manager Role: ${BLACKLIST_MANAGER_ROLE}`);

    // NAV Oracle status (if available)
    if (deployment.addresses?.NAVOracleAdapter) {
      console.log("\n🔮 NAV ORACLE STATUS");
      try {
        const oracle = await ethers.getContractAt("NAVOracleAdapter", deployment.addresses.NAVOracleAdapter);
        const basketIdInput = process.env.NAV_STATUS_BASKET_ID;

        console.log(`   Address: ${await oracle.getAddress()}`);

        if (!basketIdInput) {
          console.log("   Set NAV_STATUS_BASKET_ID=<basketId hex> to inspect per-basket NAV observations.");
        } else {
          const observation = await oracle.getObservation(basketIdInput);
          const { nav, timestamp, stalenessThreshold, deviationThreshold } = observation;
          const navValue = nav ?? 0n;
          const updatedAt = Number(timestamp ?? 0n);
          const threshold = Number(stalenessThreshold ?? 0n);
          const deviation = Number(deviationThreshold ?? 0n);

          const now = Math.floor(Date.now() / 1000);
          const age = updatedAt ? now - updatedAt : undefined;
          const isStale = threshold && age !== undefined ? age > threshold : false;

          console.log(`   Basket ID: ${basketIdInput}`);
          console.log(`   Current NAV: $${ethers.formatEther(navValue)}`);
          console.log(`   Last Update: ${updatedAt ? new Date(updatedAt * 1000).toISOString() : "n/a"}`);
          console.log(`   Staleness Threshold: ${threshold ? threshold / 3600 : 0} hours`);
          console.log(`   Deviation Threshold: ${deviation / 100}%`);
          console.log(`   Is Stale: ${isStale ? "🔴 YES" : "🟢 NO"}`);
        }
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
