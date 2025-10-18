"use strict";
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const hardhat_1 = __importDefault(require("hardhat"));
const AsiaFlexFixture_1 = require("../../fixtures/AsiaFlexFixture");
const addresses_1 = require("../../../scripts/helpers/addresses");
const mint_basket_1 = require("../../../scripts/ops/mint-basket");
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
  };
  await (0, mint_basket_1.mintBasket)(inputs);
}
main().catch((error) => {
  console.error("run-mint-cli failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
