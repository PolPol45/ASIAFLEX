"use strict";
const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
const __importStar =
  (this && this.__importStar) ||
  (function () {
    let ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          const ar = [];
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      const result = {};
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
// playground/demo-e2e.ts
const hardhat_1 = __importDefault(require("hardhat"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const BasketE2E_fixture_1 = require("../test/fixtures/BasketE2E.fixture");
const quote_1 = require("../test/helpers/quote");
const eip712_1 = require("../scripts/helpers/eip712");
async function runDemo() {
  console.log("\n🧺 Basket-first Demo - End-to-End Scenario\n=======================================\n");
  const { manager, treasury, controller, treasurySigner, user, basketToken, basketId, seedFreshNAV, navOracle } =
    await (0, BasketE2E_fixture_1.deployBasketE2EFixture)();
  const nav = (0, quote_1.toWei)("1.05");
  await seedFreshNAV("EUFX", nav);
  console.log("📈 NAV seeded at", (0, quote_1.formatWei)(nav));
  const chainId = (await hardhat_1.default.ethers.provider.getNetwork()).chainId;
  const domain = (0, eip712_1.basketTreasuryDomain)(chainId, await treasury.getAddress());
  const mintRequest = {
    basketId,
    to: user.address,
    notional: (0, quote_1.toWei)("1000"),
    nav,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    proofHash: hardhat_1.default.ethers.ZeroHash,
    nonce: 1n,
  };
  const mintSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, mintRequest);
  await treasury.connect(controller).mintWithProof(mintRequest, mintSignature, treasurySigner.address);
  const mintedShares = await basketToken.balanceOf(user.address);
  console.log("🪙 Minted shares:", (0, quote_1.formatWei)(mintedShares));
  const redeemRequest = {
    basketId,
    to: user.address,
    notional: (0, quote_1.toWei)("250"),
    nav,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 7200),
    proofHash: hardhat_1.default.ethers.ZeroHash,
    nonce: 2n,
  };
  const redeemSignature = await (0, eip712_1.signMintRedeem)(treasurySigner, domain, redeemRequest);
  await treasury.connect(controller).redeemWithProof(redeemRequest, redeemSignature, treasurySigner.address);
  const remainingShares = await basketToken.balanceOf(user.address);
  const totalSupply = await basketToken.totalSupply();
  const redeemedNotional = await manager.quoteRedeem(basketId, mintedShares - remainingShares);
  console.log("🔥 Redeemed notional:", (0, quote_1.formatWei)(redeemedNotional));
  console.log("🪙 Remaining shares:", (0, quote_1.formatWei)(remainingShares));
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
      value: (0, quote_1.formatWei)(observation.nav),
      updatedAt: Number(observation.timestamp),
      stalenessThreshold: Number(observation.stalenessThreshold),
    },
    balances: {
      user: (0, quote_1.formatWei)(remainingShares),
      totalSupply: (0, quote_1.formatWei)(totalSupply),
    },
    flows: {
      mintedNotional: (0, quote_1.formatWei)(mintRequest.notional),
      redeemedNotional: (0, quote_1.formatWei)(redeemedNotional),
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
