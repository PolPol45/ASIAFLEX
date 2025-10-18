// playground/demo-e2e.ts
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

import { deployBasketE2EFixture } from "../test/fixtures/BasketE2E.fixture";
import { toWei, formatWei } from "../test/helpers/quote";
import { basketTreasuryDomain, signMintRedeem, type MintRedeemRequest } from "../scripts/helpers/eip712";

async function runDemo() {
  console.log("\n🧺 Basket-first Demo - End-to-End Scenario\n=======================================\n");

  const { manager, treasury, controller, treasurySigner, user, basketToken, basketId, seedFreshNAV, navOracle } =
    await deployBasketE2EFixture();

  const nav = toWei("1.05");
  await seedFreshNAV("EUFX", nav);

  console.log("📈 NAV seeded at", formatWei(nav));

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const domain = basketTreasuryDomain(chainId, await treasury.getAddress());

  const mintRequest: MintRedeemRequest = {
    basketId,
    to: user.address,
    notional: toWei("1000"),
    nav,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    proofHash: hre.ethers.ZeroHash,
    nonce: 1n,
  };

  const mintSignature = await signMintRedeem(treasurySigner, domain, mintRequest);
  await treasury.connect(controller).mintWithProof(mintRequest, mintSignature, treasurySigner.address);

  const mintedShares = await basketToken.balanceOf(user.address);
  console.log("🪙 Minted shares:", formatWei(mintedShares));

  const redeemRequest: MintRedeemRequest = {
    basketId,
    to: user.address,
    notional: toWei("250"),
    nav,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
    proofHash: hre.ethers.ZeroHash,
    nonce: 2n,
  };

  const redeemSignature = await signMintRedeem(treasurySigner, domain, redeemRequest);
  await treasury.connect(controller).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);

  const remainingShares = await basketToken.balanceOf(user.address);
  const totalSupply = await basketToken.totalSupply();
  const redeemedNotional = await manager.quoteRedeem(basketId, mintedShares - remainingShares);

  console.log("🔥 Redeemed notional:", formatWei(redeemedNotional));
  console.log("🪙 Remaining shares:", formatWei(remainingShares));

  const observation = await navOracle.getObservation(basketId);

  const result = {
    basketId,
    contracts: {
      manager: await manager.getAddress(),
      treasury: await treasury.getAddress(),
      basketToken: await basketToken.getAddress(),
      navOracle: await navOracle.getAddress(),
    },
    nav: {
      value: formatWei(observation.nav),
      updatedAt: Number(observation.timestamp),
      stalenessThreshold: Number(observation.stalenessThreshold),
    },
    balances: {
      user: formatWei(remainingShares),
      totalSupply: formatWei(totalSupply),
    },
    flows: {
      mintedNotional: formatWei(mintRequest.notional),
      redeemedNotional: formatWei(redeemedNotional),
    },
  };

  const outDir = path.join("playground", "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outfile = path.join(outDir, `basket-demo-${Date.now()}.json`);
  fs.writeFileSync(outfile, JSON.stringify(result, null, 2));

  console.log("📦 Report saved to", outfile);
  console.log("\n✅ Basket demo completed successfully.\n");
}

async function main() {
  try {
    await runDemo();
  } catch (err) {
    console.error("❌ Demo script failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
