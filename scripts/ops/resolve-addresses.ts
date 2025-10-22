import { ethers } from "hardhat";
import { BASKETS } from "./basket-helpers";

async function main(): Promise<void> {
  const managerEnv = process.env.BASKET_MANAGER;
  console.log("Resolved envs:");
  console.log(`  BASKET_MANAGER=${managerEnv ?? "(missing)"}`);
  for (const b of BASKETS) {
    const v = process.env[b.tokenEnv];
    console.log(`  ${b.tokenEnv}=${v ?? "(missing)"}`);
  }

  if (!managerEnv) {
    console.warn("BASKET_MANAGER not set; skipping on-chain checks.");
    return;
  }

  if (!ethers.isAddress(managerEnv)) {
    console.error("BASKET_MANAGER is not a valid address; aborting on-chain checks.");
    return;
  }

  const manager = await ethers.getContractAt("BasketManager", managerEnv);

  console.log("\nOn-chain checks:");
  for (const b of BASKETS) {
    const tokenEnvVal = process.env[b.tokenEnv];
    try {
      const id = await manager.basketId(b.region, b.strategy);
      const state = await manager.basketState(id);
      const onchain = state.token;
      const expected = tokenEnvVal ?? "(unset)";
      const ok = expected.toLowerCase() === onchain.toLowerCase();
      console.log(`${b.key}: on-chain=${onchain} env=${expected} => ${ok ? "OK" : "MISMATCH"}`);
    } catch (err) {
      console.log(`${b.key}: error reading on-chain state: ${(err as Error).message}`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

export { main };
