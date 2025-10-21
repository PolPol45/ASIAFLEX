import { task } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

task("nav:update", "Updates NAV oracle data with staleness and deviation checks")
  .addParam("nav", "New NAV value in USD (e.g., 105.50)")
  .addOptionalParam("oracle", "Oracle contract address (uses deployment if not provided)", "")
  .addFlag("force", "Force update bypassing deviation checks (emergency only)")
  .addFlag("dryRun", "Simulate the update without sending transaction")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const network = await ethers.provider.getNetwork();
    const [signer] = await ethers.getSigners();

    console.log(`🔮 Updating NAV Oracle on ${network.name}`);
    console.log(`👤 Signer: ${signer.address}`);
    console.log(`💰 New NAV: $${taskArgs.nav}`);
    console.log(`🚨 Force Mode: ${taskArgs.force ? "ON" : "OFF"}`);
    console.log(`🧪 Dry Run: ${taskArgs.dryRun ? "ON" : "OFF"}`);

    // Determine oracle address
    let oracleAddress = taskArgs.oracle;
    if (!oracleAddress) {
      const deploymentPath = path.join(__dirname, "../../deployments", `${network.name}.json`);
      if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        oracleAddress = deployment.addresses?.NAVOracleAdapter;
      }

      if (!oracleAddress) {
        console.log("❌ No oracle address provided and no deployment found");
        console.log("   Use --oracle <address> to specify manually");
        return;
      }
    }

    console.log(`🔮 Oracle Address: ${oracleAddress}`);

    try {
      const oracle = await ethers.getContractAt("NAVOracleAdapter", oracleAddress);
      const newNavWei = ethers.parseEther(taskArgs.nav);

      // Pre-flight checks
      console.log("\n🔍 Pre-flight checks:");

      // Check signer has appropriate role
      const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();
      const ORACLE_MANAGER_ROLE = await oracle.ORACLE_MANAGER_ROLE();
      const hasUpdaterRole = await oracle.hasRole(ORACLE_UPDATER_ROLE, signer.address);
      const hasManagerRole = await oracle.hasRole(ORACLE_MANAGER_ROLE, signer.address);

      console.log(`   Oracle Updater Role: ${hasUpdaterRole ? "✅" : "❌"}`);
      console.log(`   Oracle Manager Role: ${hasManagerRole ? "✅" : "❌"}`);

      if (!hasUpdaterRole && !hasManagerRole && !taskArgs.dryRun) {
        throw new Error("Signer does not have ORACLE_UPDATER_ROLE or ORACLE_MANAGER_ROLE");
      }

      // Check if oracle is paused
      const isPaused = await oracle.paused();
      console.log(`   Oracle Paused: ${isPaused ? "❌" : "✅"}`);
      if (isPaused && !taskArgs.dryRun) {
        throw new Error("Oracle is paused");
      }

      // Get current NAV data
      const [currentNAV, lastUpdateTimestamp] = await oracle.getNAV();
      const stalenessThreshold = await oracle.getStalenessThreshold();
      const deviationThreshold = await oracle.getDeviationThreshold();
      const isStale = await oracle.isStale();

  const stalenessSeconds = Number(stalenessThreshold);
  const stalenessHours = stalenessSeconds / 3600;
  const deviationPercent = Number(deviationThreshold) / 100;

      console.log(`\n📊 Current Oracle State:`);
      console.log(`   Current NAV: $${ethers.formatEther(currentNAV)}`);
      console.log(`   Last Update: ${new Date(Number(lastUpdateTimestamp) * 1000).toLocaleString()}`);
  console.log(`   Staleness Threshold: ${stalenessSeconds} seconds (${stalenessHours.toFixed(2)} hours)`);
  console.log(`   Deviation Threshold: ${deviationPercent}%`);
      console.log(`   Status: ${isStale ? "🔴 STALE" : "🟢 FRESH"}`);

      // Check deviation
      const isValidUpdate = await oracle.isValidUpdate(newNavWei);
      let currentDeviation = 0n;

      if (currentNAV > 0) {
        currentDeviation = await oracle.getCurrentDeviation(newNavWei);
        console.log(`\n⚖️  Deviation Analysis:`);
        console.log(`   New NAV: $${taskArgs.nav}`);
  console.log(`   Deviation: ${Number(currentDeviation) / 100}%`);
        console.log(`   Within Threshold: ${isValidUpdate ? "✅" : "❌"}`);

        if (!isValidUpdate && !taskArgs.force) {
          console.log(`⚠️  Warning: Deviation exceeds threshold`);
          console.log(`   Use --force to override (emergency only)`);
          if (!taskArgs.dryRun) {
            throw new Error("Deviation too high, use --force to override");
          }
        }
      }

      if (taskArgs.dryRun) {
        console.log("\n🧪 DRY RUN - No transaction will be sent");
        console.log("✅ All checks passed - NAV update would succeed");

        if (taskArgs.force) {
          console.log("🚨 Force mode would be used for this update");
        }
        return;
      }

      // Execute update
      console.log("\n🚀 Executing NAV update...");

      let tx;
      if (taskArgs.force && hasManagerRole) {
        console.log("🚨 Using force update (bypassing deviation checks)");
        tx = await oracle.forceUpdateNAV(newNavWei);
      } else {
        tx = await oracle.updateNAV(newNavWei);
      }

      console.log(`📤 Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

      // Verify update
      const [newCurrentNAV, newTimestamp] = await oracle.getNAV();
      console.log(`📊 Updated NAV: $${ethers.formatEther(newCurrentNAV)}`);
      console.log(`🕐 Update Time: ${new Date(Number(newTimestamp) * 1000).toLocaleString()}`);

      // Save operation log
      const opsDir = path.join(__dirname, "../../deployments/operations");
      if (!fs.existsSync(opsDir)) {
        fs.mkdirSync(opsDir, { recursive: true });
      }

      const operation = {
        type: "nav_update",
        network: network.name,
        timestamp: new Date().toISOString(),
        signer: signer.address,
        oracle: oracleAddress,
        oldNAV: ethers.formatEther(currentNAV),
        newNAV: taskArgs.nav,
        deviation: Number(currentDeviation) / 100,
        force: taskArgs.force,
        transaction: {
          hash: tx.hash,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed.toString(),
        },
      };

      const filename = `${network.name}_nav_update_${Date.now()}.json`;
      const filePath = path.join(opsDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(operation, null, 2));
      console.log(`📝 Operation logged to ${filePath}`);
    } catch (error) {
      console.error("❌ NAV update failed:", error);
      throw error;
    }

    console.log("\n🔧 Usage examples:");
    console.log("   npx hardhat nav:update --nav 105.50 --dry-run");
    console.log("   npx hardhat nav:update --nav 105.50 --oracle 0x123...abc");
    console.log("   npx hardhat nav:update --nav 95.00 --force  # Emergency use only");
  });

export {};
