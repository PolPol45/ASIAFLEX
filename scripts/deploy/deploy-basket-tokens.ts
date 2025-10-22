import { ethers } from "hardhat";
import { requireAddressEnv } from "../ops/basket-helpers";

type TokenConfig = {
  readonly envKey: string;
  readonly name: string;
  readonly symbol: string;
};

const TOKENS: TokenConfig[] = [
  { envKey: "TOK_EUFX", name: "AsiaFlex Euro FX Basket", symbol: "EUFX" },
  { envKey: "TOK_ASFX", name: "AsiaFlex Asia FX Basket", symbol: "ASFX" },
  { envKey: "TOK_EUBOND", name: "AsiaFlex Euro Bond Basket", symbol: "EUBOND" },
  { envKey: "TOK_ASBOND", name: "AsiaFlex Asia Bond Basket", symbol: "ASBOND" },
  { envKey: "TOK_EUAS", name: "AsiaFlex Euro-Asia Strategic Basket", symbol: "EUAS" },
];

async function main(): Promise<void> {
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying BasketToken suite");
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`🧭 BasketManager: ${managerAddress}`);

  const factory = await ethers.getContractFactory("BasketToken");
  const results: Record<string, string> = {};

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

export { main };
