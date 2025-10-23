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
exports.mint = mint;
const hardhat_1 = require("hardhat");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function loadDeployment(network) {
  const filePath = path.join(__dirname, "../../deployments", `${network}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Deployment file not found for network: ${network}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
async function saveOperation(network, operation) {
  const opsDir = path.join(__dirname, "../../deployments/operations");
  if (!fs.existsSync(opsDir)) {
    fs.mkdirSync(opsDir, { recursive: true });
  }
  const filename = `${network}_mint_${Date.now()}.json`;
  const filePath = path.join(opsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);
}
async function mint(params) {
  const network = await hardhat_1.ethers.provider.getNetwork();
  const [signer] = await hardhat_1.ethers.getSigners();
  console.log(`🪙 Executing mint operation on ${network.name}`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🎯 To: ${params.to}`);
  console.log(`💰 Amount: ${hardhat_1.ethers.formatEther(params.amount)} AFX`);
  console.log(
    `🔐 Attestation Hash: ${params.attestationHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}`
  );
  const deployment = await loadDeployment(network.name);
  const token = await hardhat_1.ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);
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
  console.log(`   Remaining Daily Mint: ${hardhat_1.ethers.formatEther(remainingMint)} AFX`);
  console.log(`   Remaining Daily Net Inflow: ${hardhat_1.ethers.formatEther(remainingNetInflow)} AFX`);
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
  console.log(`   Remaining Supply Cap: ${hardhat_1.ethers.formatEther(remainingSupply)} AFX`);
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
  const attestationHash = params.attestationHash || hardhat_1.ethers.ZeroHash;
  try {
    const tx = await token["mint(address,uint256,bytes32)"](params.to, params.amount, attestationHash);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    // Log new balances
    const newBalance = await token.balanceOf(params.to);
    const newTotalSupply = await token.totalSupply();
    console.log(`📊 New recipient balance: ${hardhat_1.ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 New total supply: ${hardhat_1.ethers.formatEther(newTotalSupply)} AFX`);
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
  const amount = hardhat_1.ethers.parseEther(args[1]).toString();
  const attestationHash = args.length > 2 && !args[2].startsWith("--") ? args[2] : undefined;
  const dryRun = args.includes("--dry-run");
  if (!hardhat_1.ethers.isAddress(to)) {
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
