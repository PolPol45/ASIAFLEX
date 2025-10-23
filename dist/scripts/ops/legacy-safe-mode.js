"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("./basket-helpers");
async function main() {
  const tokenAddress = (0, basket_helpers_1.requireAddressEnv)("ASIAFLEX_TOKEN");
  const [signer] = await hardhat_1.ethers.getSigners();
  const network = await hardhat_1.ethers.provider.getNetwork();
  console.log("🛡️  Putting legacy AsiaFlexToken into safe mode");
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🪙 AsiaFlexToken: ${tokenAddress}`);
  const token = await hardhat_1.ethers.getContractAt("AsiaFlexToken", tokenAddress);
  const paused = await token.paused();
  const pauserRole = await token.PAUSER_ROLE();
  const capsRole = await token.CAPS_MANAGER_ROLE();
  const hasPauser = await token.hasRole(pauserRole, signer.address);
  const hasCapsManager = await token.hasRole(capsRole, signer.address);
  if (!paused) {
    if (hasPauser) {
      console.log("⏸️  Contract not paused. Executing pause()...");
      const tx = await token.pause();
      console.log(`   📤 Pause tx: ${tx.hash}`);
      await tx.wait();
      console.log("   ✅ AsiaFlexToken paused");
    } else {
      console.warn("⚠️  Signer lacks PAUSER_ROLE, cannot pause directly.");
    }
  } else {
    console.log("✅ Token already paused");
  }
  const totalSupply = await token.totalSupply();
  const supplyCap = await token.supplyCap();
  console.log(`📊 Total supply: ${hardhat_1.ethers.formatEther(totalSupply)}`);
  console.log(`📊 Current supply cap: ${hardhat_1.ethers.formatEther(supplyCap)}`);
  if (hasCapsManager) {
    console.log("🔧 Applying cap limits to freeze minting");
    if (supplyCap !== totalSupply) {
      const txCap = await token.setSupplyCap(totalSupply);
      console.log(`   📤 setSupplyCap tx: ${txCap.hash}`);
      await txCap.wait();
    } else {
      console.log("   Supply cap already equals current supply");
    }
    const maxDailyMint = await token.maxDailyMint();
    if (maxDailyMint !== 0n) {
      const txDaily = await token.setMaxDailyMint(0);
      console.log(`   📤 setMaxDailyMint(0) tx: ${txDaily.hash}`);
      await txDaily.wait();
    } else {
      console.log("   Daily mint cap already zero");
    }
    const maxDailyNetInflows = await token.maxDailyNetInflows();
    if (maxDailyNetInflows !== 0n) {
      const txNet = await token.setMaxDailyNetInflows(0);
      console.log(`   📤 setMaxDailyNetInflows(0) tx: ${txNet.hash}`);
      await txNet.wait();
    } else {
      console.log("   Daily net inflow cap already zero");
    }
  } else {
    console.warn("⚠️  Signer lacks CAPS_MANAGER_ROLE, cannot adjust caps.");
  }
  console.log("\n🎯 Safe-mode procedure completed");
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Safe-mode script failed:", error);
    process.exitCode = 1;
  });
}
