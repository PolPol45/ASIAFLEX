import hre from "hardhat";
import { getAddress, isAddress } from "ethers";

async function main() {
  const [, , adapterArg, feederArg] = process.argv;
  const adapterAddress = process.env.NAV_ADAPTER ?? adapterArg;
  const feederAddress = process.env.NAV_FEEDER ?? feederArg;

  if (!adapterAddress || !isAddress(adapterAddress)) {
    throw new Error("Provide adapter address as NAV_ADAPTER env var or first CLI argument");
  }

  if (!feederAddress || !isAddress(feederAddress)) {
    throw new Error("Provide feeder address as NAV_FEEDER env var or second CLI argument");
  }

  const adapter = await hre.ethers.getContractAt("NAVOracleAdapter", getAddress(adapterAddress));
  const functionFragments = adapter.interface.fragments.filter((fragment) => fragment.type === "function");
  const availableFunctions = functionFragments.map((fragment) => fragment.format()).sort();
  console.log("Available adapter functions:", availableFunctions);

  if (typeof (adapter as unknown as { grantRole?: unknown }).grantRole !== "function") {
    throw new Error("grantRole function not found on NAVOracleAdapter. Check contract ABI");
  }

  const role = await adapter.ORACLE_UPDATER_ROLE();
  console.log("ORACLE_UPDATER_ROLE:", role);

  const normalizedFeeder = getAddress(feederAddress);
  const alreadyAuthorized = await adapter.hasRole(role, normalizedFeeder);
  if (alreadyAuthorized) {
    console.log(`Feeder ${normalizedFeeder} already has ORACLE_UPDATER_ROLE`);
  } else {
    console.log(`Granting ORACLE_UPDATER_ROLE to ${normalizedFeeder}...`);
    const tx = await adapter.grantRole(role, normalizedFeeder);
    console.log("Tx submitted:", tx.hash);
    await tx.wait();
    console.log("✅ Role granted");
  }

  const finalCheck = await adapter.hasRole(role, normalizedFeeder);
  console.log(`Authorization status for ${normalizedFeeder}:`, finalCheck);
}

main().catch((error) => {
  console.error("❌ grant-nav-oracle-updater failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
