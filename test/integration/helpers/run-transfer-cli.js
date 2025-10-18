"use strict";
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const hardhat_1 = __importDefault(require("hardhat"));
const AsiaFlexFixture_1 = require("../../fixtures/AsiaFlexFixture");
const addresses_1 = require("../../../scripts/helpers/addresses");
const transfer_1 = require("../../../scripts/ops/transfer");
const { ethers } = hardhat_1.default;
async function main() {
  const mode = (process.argv[2] ?? "commit").toLowerCase();
  const addressesPath = process.argv[3]
    ? path_1.default.resolve(process.argv[3])
    : path_1.default.resolve(__dirname, "../../../scripts/deployments/hardhat-cli.json");
  const fixture = await (0, AsiaFlexFixture_1.deployAsiaFlexFixture)();
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();
  const managerAddress = await fixture.manager.getAddress();
  const navOracleAddress = await fixture.navOracle.getAddress();
  const treasuryAddress = await fixture.treasury.getAddress();
  (0, addresses_1.saveAddress)(networkLabel, "BasketManager", managerAddress, addressesPath);
  (0, addresses_1.saveAddress)(networkLabel, "NAVOracleAdapter", navOracleAddress, addressesPath);
  (0, addresses_1.saveAddress)(networkLabel, "BasketTreasuryController", treasuryAddress, addressesPath);
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
  };
  await (0, transfer_1.transfer)(inputs);
  const ledgerPath = path_1.default.join(__dirname, "../../../scripts/ops/ledger", `transfers-${networkLabel}.jsonl`);
  if (fs_1.default.existsSync(ledgerPath)) {
    const lines = fs_1.default.readFileSync(ledgerPath, "utf8").trim().split(/\r?\n/);
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
