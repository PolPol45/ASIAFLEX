import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DemoReport {
  timestamp: string;
  network: string;
  scenario: string;
  results: {
    deployment: {
      asiaFlexToken: string;
      navOracleAdapter: string;
      treasuryController: string;
    };
    initialState: {
      totalSupply: string;
      supplyCap: string;
      navValue: string;
    };
    operations: Array<{
      type: string;
      details: any;
      transactionHash?: string;
      gasUsed?: string;
    }>;
    finalState: {
      totalSupply: string;
      account1Balance: string;
      account2Balance: string;
      navValue: string;
      isPaused: boolean;
    };
  };
}

async function deployContracts() {
  console.log("🚀 Deploying contracts...");

  const [deployer, treasury, account1, account2] = await ethers.getSigners();

  // Deploy AsiaFlexToken
  const AsiaFlexToken = await ethers.getContractFactory("AsiaFlexToken");
  const token = await AsiaFlexToken.deploy(
    "AsiaFlex Token", // name
    "AFX", // symbol
    ethers.parseEther("1000000"), // supply cap (1M tokens)
    ethers.parseEther("10000"), // daily mint cap (10K tokens)
    ethers.parseEther("10000"), // daily burn cap (10K tokens)
    ethers.parseEther("5000") // daily net inflow cap (5K tokens)
  );
  await token.waitForDeployment();

  // Deploy NAVOracleAdapter
  const NAVOracleAdapter = await ethers.getContractFactory("NAVOracleAdapter");
  const oracle = await NAVOracleAdapter.deploy(
    3600, // max staleness (1 hour)
    500 // max deviation (5%)
  );
  await oracle.waitForDeployment();

  // Deploy TreasuryController
  const TreasuryController = await ethers.getContractFactory("TreasuryController");
  const controller = await TreasuryController.deploy(
    await token.getAddress(),
    treasury.address,
    3600 // request expiration (1 hour)
  );
  await controller.waitForDeployment();

  return { token, oracle, controller, deployer, treasury, account1, account2 };
}

async function setupRoles(token: any, oracle: any, controller: any, treasury: any, _deployer: any) {
  console.log("🔐 Setting up roles...");

  const TREASURY_ROLE = await token.TREASURY_ROLE();
  const ORACLE_ROLE = await token.ORACLE_ROLE();

  // Grant treasury role to treasury account and controller
  await token.grantRole(TREASURY_ROLE, treasury.address);
  await token.grantRole(TREASURY_ROLE, await controller.getAddress());

  // Grant oracle role to treasury for demo
  await token.grantRole(ORACLE_ROLE, treasury.address);

  console.log("✅ Roles configured");
}

async function updateNAV(oracle: any, treasury: any, navValue: string) {
  console.log(`🔮 Updating NAV to $${navValue}...`);

  const navWei = ethers.parseEther(navValue);
  const tx = await oracle.connect(treasury).updateNAV(navWei);
  await tx.wait();

  const timestamp = (await ethers.provider.getBlock("latest"))?.timestamp;
  console.log(`✅ NAV updated to $${navValue} at ${new Date((timestamp || 0) * 1000).toISOString()}`);

  return tx.hash;
}

async function mintTokens(token: any, treasury: any, to: string, amount: string) {
  console.log(`🪙 Minting ${amount} AFX to ${to}...`);

  const amountWei = ethers.parseEther(amount);
  const attestationHash = ethers.keccak256(ethers.toUtf8Bytes(`mint-${Date.now()}`));

  const tx = await token.connect(treasury).mint(to, amountWei, attestationHash);
  await tx.wait();

  console.log(`✅ Minted ${amount} AFX`);
  return { hash: tx.hash, attestationHash };
}

async function transferTokens(token: any, from: any, to: string, amount: string) {
  console.log(`💸 Transferring ${amount} AFX from ${from.address} to ${to}...`);

  const amountWei = ethers.parseEther(amount);
  const tx = await token.connect(from).transfer(to, amountWei);
  await tx.wait();

  console.log(`✅ Transferred ${amount} AFX`);
  return tx.hash;
}

async function burnTokens(token: any, treasury: any, from: string, amount: string) {
  console.log(`🔥 Burning ${amount} AFX from ${from}...`);

  const amountWei = ethers.parseEther(amount);
  const attestationHash = ethers.keccak256(ethers.toUtf8Bytes(`burn-${Date.now()}`));

  const tx = await token.connect(treasury).burn(from, amountWei, attestationHash);
  await tx.wait();

  console.log(`✅ Burned ${amount} AFX`);
  return { hash: tx.hash, attestationHash };
}

async function pauseContract(token: any, treasury: any) {
  console.log("⏸️  Pausing contract...");

  const tx = await token.connect(treasury).pause();
  await tx.wait();

  console.log("✅ Contract paused");
  return tx.hash;
}

async function unpauseContract(token: any, treasury: any) {
  console.log("▶️  Unpausing contract...");

  const tx = await token.connect(treasury).unpause();
  await tx.wait();

  console.log("✅ Contract unpaused");
  return tx.hash;
}

async function setCaps(token: any, treasury: any) {
  console.log("🔧 Setting new caps...");

  const newSupplyCap = ethers.parseEther("2000000"); // 2M tokens
  const newDailyMintCap = ethers.parseEther("20000"); // 20K tokens

  const tx1 = await token.connect(treasury).setSupplyCap(newSupplyCap);
  await tx1.wait();

  const tx2 = await token.connect(treasury).setDailyMintCap(newDailyMintCap);
  await tx2.wait();

  console.log("✅ Caps updated");
  return { supplyCapTx: tx1.hash, mintCapTx: tx2.hash };
}

async function getContractState(token: any, oracle: any, account1: any, account2: any) {
  const totalSupply = await token.totalSupply();
  const supplyCap = await token.supplyCap();
  const account1Balance = await token.balanceOf(account1.address);
  const account2Balance = await token.balanceOf(account2.address);
  const isPaused = await token.paused();

  let navValue = "0";
  try {
    const nav = await oracle.currentNAV();
    navValue = ethers.formatEther(nav);
  } catch (error) {
    console.log("⚠️  Could not read NAV value");
  }

  return {
    totalSupply: ethers.formatEther(totalSupply),
    supplyCap: ethers.formatEther(supplyCap),
    account1Balance: ethers.formatEther(account1Balance),
    account2Balance: ethers.formatEther(account2Balance),
    navValue,
    isPaused,
  };
}

async function runDemo() {
  console.log("🎭 AsiaFlex Demo - End-to-End Scenario");
  console.log("=====================================\n");

  const network = await ethers.provider.getNetwork();
  const operations: Array<any> = [];

  try {
    // 1. Deploy contracts
    const { token, oracle, controller, deployer, treasury, account1, account2 } = await deployContracts();

    const deployment = {
      asiaFlexToken: await token.getAddress(),
      navOracleAdapter: await oracle.getAddress(),
      treasuryController: await controller.getAddress(),
    };

    operations.push({
      type: "deployment",
      details: { ...deployment, deployer: deployer.address, treasury: treasury.address },
    });

    // 2. Setup roles
    await setupRoles(token, oracle, controller, treasury, deployer);
    operations.push({ type: "setup_roles", details: { completed: true } });

    // 3. Get initial state
    const initialState = await getContractState(token, oracle, account1, account2);
    console.log("📊 Initial state:", initialState);

    // 4. Update NAV
    const navTx = await updateNAV(oracle, treasury, "100.50");
    operations.push({ type: "nav_update", details: { value: "100.50" }, transactionHash: navTx });

    // 5. Mint tokens to account1
    const mintResult = await mintTokens(token, treasury, account1.address, "1000");
    operations.push({
      type: "mint",
      details: { to: account1.address, amount: "1000", attestationHash: mintResult.attestationHash },
      transactionHash: mintResult.hash,
    });

    // 6. Transfer from account1 to account2
    const transferTx = await transferTokens(token, account1, account2.address, "300");
    operations.push({
      type: "transfer",
      details: { from: account1.address, to: account2.address, amount: "300" },
      transactionHash: transferTx,
    });

    // 7. Burn tokens from account2
    const burnResult = await burnTokens(token, treasury, account2.address, "100");
    operations.push({
      type: "burn",
      details: { from: account2.address, amount: "100", attestationHash: burnResult.attestationHash },
      transactionHash: burnResult.hash,
    });

    // 8. Test pause/unpause
    const pauseTx = await pauseContract(token, treasury);
    operations.push({ type: "pause", details: {}, transactionHash: pauseTx });

    const unpauseTx = await unpauseContract(token, treasury);
    operations.push({ type: "unpause", details: {}, transactionHash: unpauseTx });

    // 9. Set new caps
    const capTxs = await setCaps(token, treasury);
    operations.push({
      type: "set_caps",
      details: { newSupplyCap: "2000000", newMintCap: "20000" },
      transactionHash: capTxs.supplyCapTx,
    });

    // 10. Get final state
    const finalState = await getContractState(token, oracle, account1, account2);
    console.log("\n📊 Final state:", finalState);

    // Generate report
    const report: DemoReport = {
      timestamp: new Date().toISOString(),
      network: network.name,
      scenario: "end-to-end-demo",
      results: {
        deployment,
        initialState,
        operations,
        finalState,
      },
    };

    // Save report
    const outDir = path.join(__dirname, "out");
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const filename = `demo-run-${Date.now()}.json`;
    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Demo completed successfully!`);
    console.log(`📄 Report saved to: ${filePath}`);
    console.log(`\n🎯 Summary:`);
    console.log(`   • Deployed contracts: ✅`);
    console.log(`   • NAV updated to: $${finalState.navValue}`);
    console.log(`   • Total supply: ${finalState.totalSupply} AFX`);
    console.log(`   • Account1 balance: ${finalState.account1Balance} AFX`);
    console.log(`   • Account2 balance: ${finalState.account2Balance} AFX`);
    console.log(`   • Contract paused: ${finalState.isPaused ? "🔴" : "🟢"}`);
  } catch (error) {
    console.error("❌ Demo failed:", error);
    throw error;
  }
}

async function main() {
  await runDemo();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Demo script failed:", error);
    process.exitCode = 1;
  });
}

export { runDemo };
