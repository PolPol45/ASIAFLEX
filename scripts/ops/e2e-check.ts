import hre from "hardhat";

const { ethers } = hre;

const parse = (value: string) => ethers.parseUnits(value, 18);

async function main() {
  const [treasury, user1, user2] = await ethers.getSigners();

  console.log("🚀 Deploying AsiaFlexToken for E2E check...");
  const factory = await ethers.getContractFactory("AsiaFlexToken", treasury);
  const token = await factory.deploy("AsiaFlex Token", "AFX", parse("1000000"), parse("50000"), parse("100000"));
  await token.waitForDeployment();
  console.log("✅ Token deployed at", await token.getAddress());

  const mintHash = ethers.keccak256(ethers.toUtf8Bytes(`mint-${Date.now()}`));
  const mintAmount = parse("500");
  console.log(`🪙 Minting ${ethers.formatUnits(mintAmount, 18)} AFX to user1...`);
  await (await token.connect(treasury)["mint(address,uint256,bytes32)"](user1.address, mintAmount, mintHash)).wait();

  const redeemAmount = parse("120");
  console.log(`💱 User1 requests redeem of ${ethers.formatUnits(redeemAmount, 18)} AFX...`);
  await (await token.connect(user1).redeemRequest(redeemAmount)).wait();

  const queueIndex = 0n;
  const requestedBlock = await token.redeemBlockQueue(user1.address, queueIndex);
  console.log("📦 Redeem queued at block", requestedBlock.toString());

  console.log("🏛️ Treasury processes redeem request...");
  await (await token.connect(treasury).processRedeem(user1.address, requestedBlock)).wait();

  const transferAmount = parse("80");
  console.log(`🔁 Transferring ${ethers.formatUnits(transferAmount, 18)} AFX from user1 to user2...`);
  await (await token.connect(user1).transfer(user2.address, transferAmount)).wait();

  const burnAmount = parse("40");
  const burnHash = ethers.keccak256(ethers.toUtf8Bytes(`burn-${Date.now()}`));
  console.log(`🔥 Treasury burns ${ethers.formatUnits(burnAmount, 18)} AFX from user2...`);
  await (await token.connect(treasury).burn(user2.address, burnAmount, burnHash)).wait();

  const [supply, bal1, bal2] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(user1.address),
    token.balanceOf(user2.address),
  ]);

  console.log("\n📊 Final state:");
  console.log("   Total supply:", ethers.formatUnits(supply, 18));
  console.log("   User1 balance:", ethers.formatUnits(bal1, 18));
  console.log("   User2 balance:", ethers.formatUnits(bal2, 18));

  console.log("\n✅ Deploy, mint, redeem, transfer, and burn flow completed successfully.\n");
}

main().catch((error) => {
  console.error("❌ E2E check failed:", error);
  process.exitCode = 1;
});
