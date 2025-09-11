import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface MintParams {
  to: string;
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

  const filename = `${network}_mint_${Date.now()}.json`;
  const filePath = path.join(opsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);
}

async function mint(params: MintParams) {
  const network = await ethers.provider.getNetwork();
  const [signer] = await ethers.getSigners();

  console.log(`🪙 Executing mint operation on ${network.name}`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🎯 To: ${params.to}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);
  console.log(
    `🔐 Attestation Hash: ${params.attestationHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}`
  );

  const deployment = await loadDeployment(network.name);
  const token = await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);

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

  // Check daily caps
  const remainingMint = await token.getRemainingDailyMint();
  const remainingNetInflow = await token.getRemainingDailyNetInflows();
  console.log(`   Remaining Daily Mint: ${ethers.formatEther(remainingMint)} AFX`);
  console.log(`   Remaining Daily Net Inflow: ${ethers.formatEther(remainingNetInflow)} AFX`);

  if (BigInt(params.amount) > remainingMint) {
    console.log(`⚠️  Warning: Amount exceeds daily mint cap`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds daily mint cap");
    }
  }

  // Check supply cap
  const totalSupply = await token.totalSupply();
  const supplyCap = await token.supplyCap();
  const remainingSupply = supplyCap - totalSupply;
  console.log(`   Remaining Supply Cap: ${ethers.formatEther(remainingSupply)} AFX`);

  if (BigInt(params.amount) > remainingSupply) {
    console.log(`⚠️  Warning: Amount exceeds supply cap`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds supply cap");
    }
  }

  // Check recipient is not blacklisted
  const isBlacklisted = await token.isBlacklisted(params.to);
  console.log(`   Recipient Blacklisted: ${isBlacklisted ? "❌" : "✅"}`);
  if (isBlacklisted && !params.dryRun) {
    throw new Error("Recipient is blacklisted");
  }

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log("✅ All checks passed - mint would succeed");
    return;
  }

  // Execute mint
  console.log("\n🚀 Executing mint...");
  const attestationHash = params.attestationHash || ethers.ZeroHash;

  try {
    const tx = await token.mint(params.to, params.amount, attestationHash);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Log new balances
    const newBalance = await token.balanceOf(params.to);
    const newTotalSupply = await token.totalSupply();
    console.log(`📊 New recipient balance: ${ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 New total supply: ${ethers.formatEther(newTotalSupply)} AFX`);

    // Save operation
    const operation = {
      type: "mint",
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
        recipientBalance: newBalance.toString(),
        totalSupply: newTotalSupply.toString(),
      },
    };

    await saveOperation(network.name, operation);
  } catch (error) {
    console.error("❌ Mint failed:", error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npx hardhat run scripts/ops/mint.ts -- <to> <amount> [attestationHash] [--dry-run]");
    console.log("Example: npx hardhat run scripts/ops/mint.ts -- 0x123...abc 1000 0x456...def --dry-run");
    process.exit(1);
  }

  const to = args[0];
  const amount = ethers.parseEther(args[1]).toString();
  const attestationHash = args.length > 2 && !args[2].startsWith("--") ? args[2] : undefined;
  const dryRun = args.includes("--dry-run");

  if (!ethers.isAddress(to)) {
    console.error("❌ Invalid address:", to);
    process.exit(1);
  }

  await mint({ to, amount, attestationHash, dryRun });
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { mint };
