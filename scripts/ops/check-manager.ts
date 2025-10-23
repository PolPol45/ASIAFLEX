import "dotenv/config";
import { ethers } from "hardhat";

async function main() {
  const manager = process.env.BASKET_MANAGER;
  if (!manager) {
    console.log("BASKET_MANAGER not set in env. Provide it or we'll deploy a new manager.");
    return;
  }

  const provider = ethers.provider;
  const code = await provider.getCode(manager);
  console.log(`Manager: ${manager}`);
  console.log(`Code size: ${code === "0x" ? 0 : code.length / 2}`);

  const balance = await provider.getBalance(manager);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  try {
    // attempt to call basketState(0) to see if ABI matches
    const managerContract = await ethers.getContractAt("BasketManager", manager);
    const state = await managerContract.basketState(0);
    console.log("basketState(0).token:", state.token);
  } catch (err) {
    console.error("basketState call failed:", (err as Error).message);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { main };
