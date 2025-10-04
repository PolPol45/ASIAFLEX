import path from "path";
import fs from "fs";
import hre from "hardhat";
import { deployAsiaFlexFixture } from "../../fixtures/AsiaFlexFixture";
import { saveAddress } from "../../../scripts/helpers/addresses";
import { transfer as transferBasketShares } from "../../../scripts/ops/transfer";

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

  const from = fixture.signers.user1.address;
  const to = fixture.signers.user2.address;
  const shares = ethers.parseUnits("5", 18);

  await fixture.manager.connect(fixture.signers.treasuryController).mintBasket(basketEntry.basketId, from, shares);

  const inputs = {
    from,
    to,
    amountInput: undefined,
    amountWeiOverride: shares,
    dryRun: mode === "dry",
    legacy: false,
    basketId: basketEntry.basketId,
    descriptor: basketEntry.descriptor,
    managerAddress,
    tokenAddress: await basketEntry.token.getAddress(),
    navOracleAddress,
    addressesPath,
    addressesOverride: addressesPath,
    snapshotPath: undefined,
    wssUrl: undefined,
  } as Parameters<typeof transferBasketShares>[0];

  await transferBasketShares(inputs);

  const ledgerPath = path.join(__dirname, "../../../scripts/ops/ledger", `transfers-${networkLabel}.jsonl`);

  if (fs.existsSync(ledgerPath)) {
    const lines = fs.readFileSync(ledgerPath, "utf8").trim().split(/\r?\n/);
    const last = lines[lines.length - 1];
    if (last) {
      console.log(last);
    }
  }
}

main().catch((error) => {
  console.error("run-transfer-cli failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
