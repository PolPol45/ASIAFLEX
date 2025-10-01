// playground/demo-e2e.ts
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";
import * as fs from "fs";
import * as path from "path";

const u = (v: string) => ethers.parseUnits(v, 18);

async function deployToken() {
  console.log("🚀 Deploying AsiaFlexToken...");

  const [deployer, user1, user2] = await ethers.getSigners();

  const name = "AsiaFlex Token";
  const symbol = "AFX";
  const SUPPLY_CAP = u("1000000"); // 1,000,000
  const MAX_DAILY_MINT = u("10000"); // 10,000
  const MAX_DAILY_NET = u("5000"); // 5,000

  const factory = await ethers.getContractFactory("AsiaFlexToken", deployer);
  const token = await factory.deploy(name, symbol, SUPPLY_CAP, MAX_DAILY_MINT, MAX_DAILY_NET);
  await token.waitForDeployment();

  console.log("✅ AsiaFlexToken deployed at:", await token.getAddress());
  return { token, deployer, user1, user2 };
}

async function runDemo() {
  console.log("\n🎭 AsiaFlex Demo - End-to-End Scenario\n=====================================\n");

  const { token, deployer, user1, user2 } = await deployToken();

  // 1) Set price (mock NAV)
  console.log("📈 Setting mock price...");
  await (await token.connect(deployer).setPrice(u("1.00"))).wait();

  // 2) Mint to user1
  console.log("🪙 Minting 1000 AFX to user1...");
  const att = keccak256(toUtf8Bytes(`demo-${Date.now()}`));
  await (await token.connect(deployer)["mint(address,uint256,bytes32)"](user1.address, u("1000"), att)).wait();

  // 3) Transfer 300 from user1 to user2
  console.log("🔁 Transfer 300 AFX from user1 to user2...");
  await (await token.connect(user1).transfer(user2.address, u("300"))).wait();

  // 4) Burn 100 from user2 (treasury burns)
  console.log("🔥 Burn 100 AFX from user2...");
  await (await token.connect(deployer).burn(user2.address, u("100"), att)).wait();

  // 5) Pause and unpause
  console.log("⏸️  Pausing...");
  await (await token.connect(deployer).pause()).wait();
  console.log("▶️  Unpausing...");
  await (await token.connect(deployer).unpause()).wait();

  // 6) Update caps
  console.log("🔧 Updating caps...");
  await (await token.connect(deployer).setSupplyCap(u("2000000"))).wait();
  await (await token.connect(deployer).setMaxDailyMint(u("20000"))).wait();

  // 7) Status & Report
  const supply = await token.totalSupply();
  const bal1 = await token.balanceOf(user1.address);
  const bal2 = await token.balanceOf(user2.address);
  const paused = await token.paused();
  const price = await token.getPrice();

  const result = {
    token: await token.getAddress(),
    totalSupply: supply.toString(),
    balances: {
      user1: bal1.toString(),
      user2: bal2.toString(),
    },
    paused,
    price: price.toString(),
  };

  const outDir = path.join("playground", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `demo-run-${Date.now()}.json`);
  fs.writeFileSync(outfile, JSON.stringify(result, null, 2));
  console.log("📦 Report saved to", outfile);
  console.log("\n✅ Demo completed successfully.\n");
}

async function main() {
  try {
    await runDemo();
  } catch (err) {
    console.error("❌ Demo script failed:", err);
    process.exit(1);
  }
}

main();
