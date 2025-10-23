import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer, user] = await ethers.getSigners();

  // Deploy mock base asset and oracle
  const base = await ethers.deployContract("MockERC20", ["USD Stable", "USDS"]);
  await base.waitForDeployment();
  const oracle = await ethers.deployContract("MockMedianOracle", [deployer.address]);
  await oracle.waitForDeployment();

  // Deploy manager
  const manager = await ethers.deployContract("BasketManager", [
    deployer.address,
    0,
    await base.getAddress(),
    await oracle.getAddress(),
  ]);
  await manager.waitForDeployment();

  // Deploy a basket token and register
  const token = await ethers.deployContract("BasketToken", [
    "AsiaFlex Euro FX Basket",
    "EUFX",
    await manager.getAddress(),
  ]);
  await token.waitForDeployment();

  const ASSET_EURUSD = ethers.id("EURUSD");
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  await oracle.setPrice(ASSET_EURUSD, ethers.parseEther("1.00"), now, 18, false);

  const assets = [{ assetId: ASSET_EURUSD, weightBps: 10000, isBond: false, accrualBps: 0 }];

  await manager.registerBasket(0, 0, token, assets, { stalenessThreshold: 3600, rebalanceInterval: 86400 });

  // Fund user and mint
  await base.mint(user.address, ethers.parseEther("1000"));
  await base.connect(user).approve(await manager.getAddress(), ethers.parseEther("200"));

  const baseAmount = ethers.parseEther("100");
  console.log("Previewing mint...");
  // call the preview as the user (msg.sender matters for allowance checks)
  const preview = await manager.connect(user).mint.staticCall(0, 0, baseAmount, 0n, user.address, ethers.ZeroHash);
  console.log("Preview tokens:", preview.toString());

  const tx = await manager.connect(user).mint(0, 0, baseAmount, 0n, user.address, ethers.ZeroHash);
  console.log("Mint tx sent:", tx.hash);
  await tx.wait();

  console.log("User token balance:", (await token.balanceOf(user.address)).toString());
  console.log("User base balance:", (await base.balanceOf(user.address)).toString());
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

export { main };
