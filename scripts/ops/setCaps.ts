import { ethers } from "hardhat";
import { AsiaFlexToken } from "../../typechain-types";
import * as fs from "fs";
import * as path from "path";

interface SetCapsParams {
  maxDailyMint?: string;
  maxDailyNetInflows?: string;
  supplyCap?: string;
  dryRun?: boolean;
}

async function loadDeployment(network: string) {
  const filePath = path.join(__dirname, "../../deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function saveOperation(network: string, operation: any) {
  const opsDir = path.join(__dirname, "../../deployments/operations");
  if (!fs.existsSync(opsDir)) {
    fs.mkdirSync(opsDir, { recursive: true });
  }

  const filename = `${network}_set_caps_${Date.now()}.json`;
  const filePath = path.join(opsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);
}

async function setCaps(params: SetCapsParams) {
  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();

  console.log(`⚙️  Executing set caps operation on ${network.name}`);
  console.log(`👤 Signer: ${signer.address}`);

  const deployment = await loadDeployment(network.name);
  const token = (await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken)) as AsiaFlexToken;

  // Pre-flight checks
  console.log("\n🔍 Pre-flight checks:");

  // Check signer has CAPS_MANAGER_ROLE
  const CAPS_MANAGER_ROLE = await token.CAPS_MANAGER_ROLE();
  const hasCapsManagerRole = await token.hasRole(CAPS_MANAGER_ROLE, signer.address);
  console.log(`   Caps Manager Role: ${hasCapsManagerRole ? "✅" : "❌"}`);
  if (!hasCapsManagerRole && !params.dryRun) {
    throw new Error("Signer does not have CAPS_MANAGER_ROLE");
  }

  // Show current caps
  const currentMaxDailyMint = await token.maxDailyMint();
  const currentMaxDailyNetInflows = await token.maxDailyNetInflows();
  const currentSupplyCap = await token.supplyCap();
  const currentTotalSupply = await token.totalSupply();

  console.log(`\n📊 Current caps:`);
  console.log(`   Max Daily Mint: ${ethers.formatEther(currentMaxDailyMint)} AFX`);
  console.log(`   Max Daily Net Inflows: ${ethers.formatEther(currentMaxDailyNetInflows)} AFX`);
  console.log(`   Supply Cap: ${ethers.formatEther(currentSupplyCap)} AFX`);
  console.log(`   Current Total Supply: ${ethers.formatEther(currentTotalSupply)} AFX`);

  // Validate new caps
  if (params.supplyCap) {
    const newSupplyCap = BigInt(params.supplyCap);
    if (newSupplyCap < currentTotalSupply) {
      console.log(`⚠️  Warning: New supply cap is below current total supply`);
      if (!params.dryRun) {
        throw new Error("New supply cap cannot be below current total supply");
      }
    }
  }

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log("✅ All checks passed - set caps would succeed");

    if (params.maxDailyMint) {
      console.log(`   New Max Daily Mint: ${ethers.formatEther(params.maxDailyMint)} AFX`);
    }
    if (params.maxDailyNetInflows) {
      console.log(`   New Max Daily Net Inflows: ${ethers.formatEther(params.maxDailyNetInflows)} AFX`);
    }
    if (params.supplyCap) {
      console.log(`   New Supply Cap: ${ethers.formatEther(params.supplyCap)} AFX`);
    }
    return;
  }

  // Execute cap updates
  console.log("\n🚀 Executing cap updates...");
  const transactions = [];

  try {
    if (params.maxDailyMint) {
      console.log(`📤 Setting max daily mint to ${ethers.formatEther(params.maxDailyMint)} AFX...`);
      const tx = await token.setMaxDailyMint(params.maxDailyMint);
      console.log(`   Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      transactions.push({ type: "setMaxDailyMint", hash: tx.hash, blockNumber: receipt?.blockNumber });
    }

    if (params.maxDailyNetInflows) {
      console.log(`📤 Setting max daily net inflows to ${ethers.formatEther(params.maxDailyNetInflows)} AFX...`);
      const tx = await token.setMaxDailyNetInflows(params.maxDailyNetInflows);
      console.log(`   Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      transactions.push({ type: "setMaxDailyNetInflows", hash: tx.hash, blockNumber: receipt?.blockNumber });
    }

    if (params.supplyCap) {
      console.log(`📤 Setting supply cap to ${ethers.formatEther(params.supplyCap)} AFX...`);
      const tx = await token.setSupplyCap(params.supplyCap);
      console.log(`   Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      transactions.push({ type: "setSupplyCap", hash: tx.hash, blockNumber: receipt?.blockNumber });
    }

    console.log(`✅ All cap updates confirmed`);

    // Show new caps
    const newMaxDailyMint = await token.maxDailyMint();
    const newMaxDailyNetInflows = await token.maxDailyNetInflows();
    const newSupplyCap = await token.supplyCap();

    console.log(`\n📊 New caps:`);
    console.log(`   Max Daily Mint: ${ethers.formatEther(newMaxDailyMint)} AFX`);
    console.log(`   Max Daily Net Inflows: ${ethers.formatEther(newMaxDailyNetInflows)} AFX`);
    console.log(`   Supply Cap: ${ethers.formatEther(newSupplyCap)} AFX`);

    // Save operation
    const operation = {
      type: "set_caps",
      network: network.name,
      timestamp: new Date().toISOString(),
      signer: signer.address,
      params,
      transactions,
      results: {
        maxDailyMint: newMaxDailyMint.toString(),
        maxDailyNetInflows: newMaxDailyNetInflows.toString(),
        supplyCap: newSupplyCap.toString(),
      },
    };

    await saveOperation(network.name, operation);
  } catch (error) {
    console.error("❌ Set caps failed:", error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(
      "Usage: npx hardhat run scripts/ops/setCaps.ts -- [--max-daily-mint <amount>] [--max-daily-net-inflows <amount>] [--supply-cap <amount>] [--dry-run]"
    );
    console.log(
      "Example: npx hardhat run scripts/ops/setCaps.ts -- --max-daily-mint 20000 --supply-cap 2000000 --dry-run"
    );
    process.exit(1);
  }

  const params: SetCapsParams = {};
  const dryRun = args.includes("--dry-run");
  params.dryRun = dryRun;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max-daily-mint" && i + 1 < args.length) {
      params.maxDailyMint = ethers.parseEther(args[i + 1]).toString();
    } else if (args[i] === "--max-daily-net-inflows" && i + 1 < args.length) {
      params.maxDailyNetInflows = ethers.parseEther(args[i + 1]).toString();
    } else if (args[i] === "--supply-cap" && i + 1 < args.length) {
      params.supplyCap = ethers.parseEther(args[i + 1]).toString();
    }
  }

  if (!params.maxDailyMint && !params.maxDailyNetInflows && !params.supplyCap) {
    console.error("❌ At least one cap parameter must be provided");
    process.exit(1);
  }

  await setCaps(params);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { setCaps };
