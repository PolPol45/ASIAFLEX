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
exports.pauseControl = pauseControl;
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
  const filename = `${network}_pause_${Date.now()}.json`;
  const filePath = path.join(opsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);
}
async function pauseControl(params) {
  const network = await hardhat_1.ethers.provider.getNetwork();
  const [signer] = await hardhat_1.ethers.getSigners();
  const action = params.pause ? "pause" : "unpause";
  console.log(`⏸️  Executing ${action} operation on ${network.name}`);
  console.log(`👤 Signer: ${signer.address}`);
  const deployment = await loadDeployment(network.name);
  const token = await hardhat_1.ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);
  // Pre-flight checks
  console.log("\n🔍 Pre-flight checks:");
  // Check signer has PAUSER_ROLE
  const PAUSER_ROLE = await token.PAUSER_ROLE();
  const hasPauserRole = await token.hasRole(PAUSER_ROLE, signer.address);
  console.log(`   Pauser Role: ${hasPauserRole ? "✅" : "❌"}`);
  if (!hasPauserRole && !params.dryRun) {
    throw new Error("Signer does not have PAUSER_ROLE");
  }
  // Check current pause state
  const isPaused = await token.paused();
  console.log(`   Current State: ${isPaused ? "Paused" : "Active"}`);
  if (params.pause && isPaused) {
    console.log(`⚠️  Warning: Contract is already paused`);
    if (!params.dryRun) {
      throw new Error("Contract is already paused");
    }
  }
  if (!params.pause && !isPaused) {
    console.log(`⚠️  Warning: Contract is already unpaused`);
    if (!params.dryRun) {
      throw new Error("Contract is already unpaused");
    }
  }
  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log(`✅ All checks passed - ${action} would succeed`);
    return;
  }
  // Execute pause/unpause
  console.log(`\n🚀 Executing ${action}...`);
  try {
    const tx = params.pause ? await token.pause() : await token.unpause();
    console.log(`📤 Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
    // Verify new state
    const newPauseState = await token.paused();
    console.log(`📊 New pause state: ${newPauseState ? "Paused" : "Active"}`);
    // Save operation
    const operation = {
      type: "pause_control",
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
        pauseState: newPauseState,
      },
    };
    await saveOperation(network.name, operation);
  } catch (error) {
    console.error(`❌ ${action} failed:`, error);
    throw error;
  }
}
// CLI interface
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("Usage: npx hardhat run scripts/ops/pause.ts -- <pause|unpause> [--dry-run]");
    console.log("Example: npx hardhat run scripts/ops/pause.ts -- pause --dry-run");
    process.exit(1);
  }
  const action = args[0].toLowerCase();
  const dryRun = args.includes("--dry-run");
  if (action !== "pause" && action !== "unpause") {
    console.error("❌ Invalid action. Must be 'pause' or 'unpause'");
    process.exit(1);
  }
  await pauseControl({ pause: action === "pause", dryRun });
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}
