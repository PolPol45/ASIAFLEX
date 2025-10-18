import hre from "hardhat";
import { resolveAssetFeed } from "./assets.map";
import StooqProvider from "./providers/StooqProvider";
import ExchangeRateProvider from "./providers/ExchangeRateProvider";
import { PriceSample, Provider } from "./providers/Provider";
import { keccak256, toUtf8Bytes } from "ethers";

const providerFactories: Record<string, () => Provider> = {
  stooq: () => new StooqProvider(),
  "exchange-rate": () => new ExchangeRateProvider(),
};

const registry = new Map<string, Provider>();

async function getSample(
  symbol: string,
  providerNames: string[]
): Promise<{ sample: PriceSample; provider: string } | null> {
  for (const name of providerNames) {
    if (!registry.has(name)) {
      const factory = providerFactories[name];
      if (!factory) {
        console.warn(`Provider factory missing for ${name}`);
        continue;
      }
      registry.set(name, factory());
    }
    const provider = registry.get(name)!;
    const sample = await provider.get(symbol);
    if (sample) {
      return { sample, provider: name };
    }
  }
  return null;
}

async function main() {
  const symbols = (process.env.FEEDER_SYMBOLS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (symbols.length === 0) {
    throw new Error("Set FEEDER_SYMBOLS to a comma-separated list of targets");
  }

  const block = await hre.ethers.provider.getBlock("latest");
  if (!block) {
    throw new Error("Unable to load latest block");
  }
  const now = Number(block.timestamp);

  console.log(`Latest block timestamp: ${now}`);

  for (const symbol of symbols) {
    const config = resolveAssetFeed(symbol);
    if (!config) {
      console.warn(`No config for symbol ${symbol}`);
      continue;
    }
    const symbolUpper = config.symbol.toUpperCase();
    const result = await getSample(symbolUpper, config.providers);
    if (!result) {
      console.warn(`No sample fetched for ${symbolUpper}`);
      continue;
    }
    let ts = Number(result.sample.ts ?? now);
    const originalTs = ts;
    if (Number.isNaN(ts)) {
      ts = now;
    }
    if (ts < 0) {
      ts = 0;
    }
    if (ts > now) {
      ts = now;
    }
    console.log(`\n${symbolUpper} via ${result.provider}`);
    console.log(`  sample.value: ${result.sample.value.toString()}`);
    console.log(`  sample.decimals: ${result.sample.decimals}`);
    console.log(`  sample.ts original: ${originalTs}`);
    console.log(`  sanitized ts: ${ts}`);
    const assetId = keccak256(toUtf8Bytes(config.asset.toUpperCase()))
      .replace(/(^0x|0+$)/g, "")
      .slice(0, 16);
    console.log(`  assetId prefix: 0x${assetId}`);
  }
}

main().catch((error) => {
  console.error("inspect-feeder failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
