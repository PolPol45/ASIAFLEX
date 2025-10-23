import "dotenv/config";
import { ethers } from "./hardhat-runtime";
import type { MockMedianOracle } from "../../typechain-types/artifacts/contracts/mocks/MockMedianOracle";
import { MockMedianOracle__factory } from "../../typechain-types/factories/artifacts/contracts/mocks/MockMedianOracle__factory";
import { requireAddressEnv, encodeAssetId } from "./basket-helpers";

export type PriceConfig = {
  price: number;
  decimals?: number;
};

type ScriptOptions = {
  dryRun: boolean;
};

export const PRICES: Record<string, PriceConfig> = {
  EURUSD: { price: 1 },
  GBPUSD: { price: 1.1 },
  CHFUSD: { price: 1.1111111111111112 },
  JPYUSD: { price: 0.006666666666666667 },
  CNYUSD: { price: 0.14084507042253522 },
  KRWUSD: { price: 0.000751879699248 },
  SGDUSD: { price: 0.7407407407407408 },
  BNDX: { price: 80 },
  IEGA: { price: 95 },
  AGGH: { price: 70 },
  "2821.HK": { price: 50 },
  XAUUSD: { price: 2000 },
  BTCUSD: { price: 68000 },
  ETHUSD: { price: 3200 },
};

function parseArgs(): ScriptOptions {
  const argv = process.argv.slice(2);
  let dryRun = process.env.DRY_RUN === "true";

  for (const arg of argv) {
    if (arg === "--dry-run" || arg === "--dryRun") {
      dryRun = true;
    }
  }

  return { dryRun };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs();
  const oracleEnv = process.env.ORACLE;
  if (!oracleEnv && !dryRun) {
    throw new Error("Missing required environment variable ORACLE");
  }

  const [signer] = await ethers.getSigners();
  let oracle: MockMedianOracle | undefined;
  let feedRole: string | undefined;

  if (oracleEnv) {
    const oracleAddress = requireAddressEnv("ORACLE");
    oracle = MockMedianOracle__factory.connect(oracleAddress, signer);
    feedRole = await oracle.FEED_ROLE();
    if (!dryRun) {
      const hasFeedRole = await oracle.hasRole(feedRole, signer.address);
      if (!hasFeedRole) {
        throw new Error(`Signer ${signer.address} is missing FEED_ROLE on oracle ${oracleAddress}`);
      }
    } else {
      console.log(`ℹ️  Dry-run: skipping role enforcement for oracle ${oracleAddress}`);
    }
  } else if (dryRun) {
    console.log("ℹ️  Dry-run: ORACLE env missing, will log actions without on-chain calls");
  }

  const now = Math.floor(Date.now() / 1000);

  if (dryRun) {
    console.log("🚧 Dry-run mode enabled: price updates will not be submitted");
  }

  for (const [symbol, { price, decimals = 18 }] of Object.entries(PRICES)) {
    const assetId = encodeAssetId(symbol);
    const scaled = ethers.parseUnits(price.toString(), decimals);
    console.log(`Setting ${symbol} → ${price} (decimals ${decimals})`);
    if (dryRun || !oracle) {
      console.log("  [dry-run] would call setPrice");
      continue;
    }
    const tx = await oracle.setPrice(assetId, scaled, now, decimals, false);
    await tx.wait();
    console.log(`  tx: ${tx.hash}`);
  }
  console.log(dryRun ? "Dry-run completed" : "Oracle prices updated");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("set-oracle-prices failed:", error);
    process.exitCode = 1;
  });
}

export { main };
