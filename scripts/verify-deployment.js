#!/usr/bin/env node

/**
 * Contract verification script for AsiaFlex deployment
 * Usage: node scripts/verify-deployment.js <network>
 * Example: node scripts/verify-deployment.js sepolia
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

const DEFAULT_NETWORK = process.env.DEFAULT_NETWORK || "sepolia";

async function main() {
  const network = process.argv[2] || DEFAULT_NETWORK;

  console.log(`🔍 Verifying contracts on ${network} network...`);

  // Load deployment file
  const deploymentPath = path.join(__dirname, "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentPath)) {
    console.error(`❌ Deployment file not found: ${deploymentPath}`);
    console.error(`   Run deployment first: npm run deploy:${network}`);
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { addresses, config } = deployment;

  console.log(`📋 Loaded deployment from ${deploymentPath}`);
  console.log(`   Network: ${deployment.network}`);
  console.log(`   Chain ID: ${deployment.chainId}`);
  console.log(`   Timestamp: ${deployment.timestamp}`);

  const contracts = [
    {
      name: "AsiaFlexToken",
      address: addresses.AsiaFlexToken,
      constructorArgs: [
        config.token.name,
        config.token.symbol,
        config.token.supplyCap,
        config.token.maxDailyMint,
        config.token.maxDailyNetInflows,
      ],
    },
    {
      name: "NAVOracleAdapter",
      address: addresses.NAVOracleAdapter,
      constructorArgs: [config.oracle.initialNAV, config.oracle.stalenessThreshold, config.oracle.deviationThreshold],
    },
    {
      name: "TreasuryController",
      address: addresses.TreasuryController,
      constructorArgs: [addresses.AsiaFlexToken, config.treasury.signer, config.treasury.requestExpiration],
    },
  ];

  console.log(`\n🚀 Starting verification process...`);

  for (const contract of contracts) {
    try {
      console.log(`\n📝 Verifying ${contract.name} at ${contract.address}...`);

      const args = contract.constructorArgs.map((arg) => `"${arg}"`).join(" ");
      const command = `npx hardhat verify --network ${network} ${contract.address} ${args}`;

      console.log(`   Command: ${command}`);

      const { stdout, stderr } = await execAsync(command);

      if (stdout) {
        console.log(`   ✅ ${contract.name} verified successfully`);
        console.log(`   ${stdout.trim()}`);
      }

      if (stderr && !stderr.includes("Already verified")) {
        console.warn(`   ⚠️  Warning: ${stderr.trim()}`);
      }
    } catch (error) {
      if (error.message.includes("Already verified")) {
        console.log(`   ✅ ${contract.name} already verified`);
      } else {
        console.error(`   ❌ Failed to verify ${contract.name}:`);
        console.error(`   ${error.message}`);
      }
    }
  }

  console.log(`\n🎉 Verification process completed for ${network} network!`);
  console.log(`\n📊 Summary:`);
  contracts.forEach((contract) => {
    console.log(`   ${contract.name}: ${contract.address}`);
  });

  console.log(`\n🔗 Etherscan Links:`);
  const explorerUrl = getExplorerUrl(network);
  contracts.forEach((contract) => {
    console.log(`   ${contract.name}: ${explorerUrl}/address/${contract.address}`);
  });
}

function getExplorerUrl(network) {
  switch (network) {
    case "mainnet":
      return "https://etherscan.io";
    case "sepolia":
      return "https://sepolia.etherscan.io";
    case "polygon":
      return "https://polygonscan.com";
    case "polygonMumbai":
      return "https://mumbai.polygonscan.com";
    default:
      return "https://etherscan.io";
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
}

module.exports = { main };
