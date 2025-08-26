const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  console.log("🚀 Deploying with account:", deployer.address);

  // Usa il nonce pending per evitare tx duplicate
  const nonce = await provider.getTransactionCount(deployer.address, "pending");
  console.log("🔢 Using nonce:", nonce);

  // Imposta gas price statico (es. 1 gwei)
  const boostedGasPrice = hre.ethers.parseUnits("1", "gwei");
  console.log("⛽ Gas price:", hre.ethers.formatUnits(boostedGasPrice, "gwei"), "gwei");

  const AsiaFlexToken = await hre.ethers.getContractFactory("AsiaFlexToken");

  // ❌ Rimuoviamo deployer.address
  const token = await AsiaFlexToken.deploy({
    nonce: nonce,
    gasPrice: boostedGasPrice
  });

  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log("✅ Deployed at:", address);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
