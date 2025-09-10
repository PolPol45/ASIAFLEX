import { ethers } from "hardhat";
import { AsiaFlexToken } from "../../typechain-types";
import * as fs from "fs";
import * as path from "path";

interface BurnParams {
  from: string;
  amount: string;
  attestationHash?: string;
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

  const filename = `${network}_burn_${Date.now()}.json`;
  const filePath = path.join(opsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);
}

async function burn(params: BurnParams) {
  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();

  console.log(`🔥 Executing burn operation on ${network.name}`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🎯 From: ${params.from}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);
  console.log(
    `🔐 Attestation Hash: ${params.attestationHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}`
  );

  const deployment = await loadDeployment(network.name);
  const token = (await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken)) as AsiaFlexToken;

  // Pre-flight checks
  console.log("\n🔍 Pre-flight checks:");

  // Check signer has TREASURY_ROLE
  const TREASURY_ROLE = await token.TREASURY_ROLE();
  const hasTreasuryRole = await token.hasRole(TREASURY_ROLE, signer.address);
  console.log(`   Treasury Role: ${hasTreasuryRole ? "✅" : "❌"}`);
  if (!hasTreasuryRole && !params.dryRun) {
    throw new Error("Signer does not have TREASURY_ROLE");
  }

  // Check contract is not paused
  const isPaused = await token.paused();
  console.log(`   Contract Paused: ${isPaused ? "❌" : "✅"}`);
  if (isPaused && !params.dryRun) {
    throw new Error("Contract is paused");
  }

  // Check account balance
  const balance = await token.balanceOf(params.from);
  console.log(`   Account Balance: ${ethers.formatEther(balance)} AFX`);

  if (BigInt(params.amount) > balance) {
    console.log(`⚠️  Warning: Amount exceeds account balance`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds account balance");
    }
  }

  // Check account is not blacklisted
  const isBlacklisted = await token.isBlacklisted(params.from);
  console.log(`   Account Blacklisted: ${isBlacklisted ? "❌" : "✅"}`);
  if (isBlacklisted && !params.dryRun) {
    throw new Error("Account is blacklisted");
  }

  // Show impact on daily limits
  const remainingNetInflow = await token.getRemainingDailyNetInflows();
  console.log(`   Current Daily Net Inflow Used: ${ethers.formatEther(await token.dailyNetInflowAmount())} AFX`);
  console.log(`   Remaining Daily Net Inflow: ${ethers.formatEther(remainingNetInflow)} AFX`);
  console.log(`   ℹ️  Burning will reduce net inflow pressure`);

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log("✅ All checks passed - burn would succeed");
    return;
  }

  // Execute burn
  console.log("\n🚀 Executing burn...");
  const attestationHash = params.attestationHash || ethers.ZeroHash;

  try {
    const tx = await token.burn(params.from, params.amount, attestationHash);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Log new balances
    const newBalance = await token.balanceOf(params.from);
    const newTotalSupply = await token.totalSupply();
    console.log(`📊 New account balance: ${ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 New total supply: ${ethers.formatEther(newTotalSupply)} AFX`);

    // Save operation
    const operation = {
      type: "burn",
      network: network.name,
      timestamp: new Date().toISOString(),
      signer: signer.address,
      params,
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      },
      results: {
        accountBalance: newBalance.toString(),
        totalSupply: newTotalSupply.toString(),
      },
    };

    await saveOperation(network.name, operation);
  } catch (error) {
    console.error("❌ Burn failed:", error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npx hardhat run scripts/ops/burn.ts -- <from> <amount> [attestationHash] [--dry-run]");
    console.log("Example: npx hardhat run scripts/ops/burn.ts -- 0x123...abc 1000 0x456...def --dry-run");
    process.exit(1);
  }

  const from = args[0];
  const amount = ethers.parseEther(args[1]).toString();
  const attestationHash = args.length > 2 && !args[2].startsWith("--") ? args[2] : undefined;
  const dryRun = args.includes("--dry-run");

  if (!ethers.isAddress(from)) {
    console.error("❌ Invalid address:", from);
    process.exit(1);
  }

  await burn({ from, amount, attestationHash, dryRun });
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { burn };
