import path from "path";
import hre from "hardhat";
import { deployAsiaFlexFixture } from "../../fixtures/AsiaFlexFixture";
import { saveAddress } from "../../../scripts/helpers/addresses";
import { mintBasket } from "../../../scripts/ops/mint-basket";

const { ethers } = hre;

async function main() {
  const mode = (process.argv[2] ?? "commit").toLowerCase();
  const addressesPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.resolve(__dirname, "../../../scripts/deployments/hardhat-cli.json");

  const fixture = await deployAsiaFlexFixture();
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const managerAddress = await fixture.manager.getAddress();
  const navOracleAddress = await fixture.navOracle.getAddress();
  const treasuryAddress = await fixture.treasury.getAddress();

  saveAddress(networkLabel, "BasketManager", managerAddress, addressesPath);
  saveAddress(networkLabel, "NAVOracleAdapter", navOracleAddress, addressesPath);
  saveAddress(networkLabel, "BasketTreasuryController", treasuryAddress, addressesPath);

  const basketEntry = fixture.baskets["EUFX"] ?? Object.values(fixture.baskets)[0];
  if (!basketEntry) {
    throw new Error("No basket available in fixture");
  }

  const depositWei = ethers.parseUnits("100", 18);
  const navObservation = await fixture.navOracle.getObservation(basketEntry.basketId);
  const nav = navObservation.nav ?? navObservation[0];
  const navTs = Number(navObservation.timestamp ?? navObservation[1] ?? 0n);

  const inputs = {
    basketId: basketEntry.basketId,
    descriptor: basketEntry.descriptor,
    depositWei,
    depositInput: "100",
    beneficiary: fixture.signers.user1.address,
    account: fixture.signers.treasuryController.address,
    signer: fixture.signers.treasurySigner.address,
    signature: undefined,
    proofHash: ethers.ZeroHash,
    nav,
    navTimestamp: navTs,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    nonce: 0n,
    slippageBps: 50,
    dryRun: mode === "dry",
    addressesPath,
    snapshotPath: undefined,
  } as Parameters<typeof mintBasket>[0];

  await mintBasket(inputs);
}

main().catch((error) => {
  console.error("run-mint-cli failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
