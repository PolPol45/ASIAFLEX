"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const hardhat_1 = require("hardhat");
const basket_helpers_1 = require("../ops/basket-helpers");
const TOKENS = [
  { envKey: "TOK_EUFX", name: "AsiaFlex Euro FX Basket", symbol: "EUFX" },
  { envKey: "TOK_ASFX", name: "AsiaFlex Asia FX Basket", symbol: "ASFX" },
  { envKey: "TOK_EUBOND", name: "AsiaFlex Euro Bond Basket", symbol: "EUBOND" },
  { envKey: "TOK_ASBOND", name: "AsiaFlex Asia Bond Basket", symbol: "ASBOND" },
  { envKey: "TOK_EUAS", name: "AsiaFlex Euro-Asia Strategic Basket", symbol: "EUAS" },
];
async function main() {
  const managerAddress = (0, basket_helpers_1.requireAddressEnv)("BASKET_MANAGER");
  const [deployer] = await hardhat_1.ethers.getSigners();
  console.log("🚀 Deploying BasketToken suite");
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🧭 BasketManager: ${managerAddress}`);
  const factory = await hardhat_1.ethers.getContractFactory("BasketToken");
  const results = {};
  for (const config of TOKENS) {
    console.log(`\n⏳ Deploying ${config.symbol} (${config.name})`);
    const token = await factory.deploy(config.name, config.symbol, managerAddress);
    await token.waitForDeployment();
    const address = await token.getAddress();
    results[config.envKey] = address;
    console.log(`✅ ${config.symbol} deployed at ${address}`);
  }
  console.log("\n🔑 Export the following variables:");
  for (const config of TOKENS) {
    const address = results[config.envKey];
    console.log(`${config.envKey}=${address}`);
  }
  console.log("\n💡 Suggested usage:\nexport BASKET_MANAGER=" + managerAddress);
  for (const config of TOKENS) {
    const address = results[config.envKey];
    console.log(`export ${config.envKey}=${address}`);
  }
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
  });
}
