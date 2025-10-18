import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  checkWithGoogle,
  setGoogleMarkupFetcher,
  resetGoogleMarkupFetcher,
  resetGoogleAlerts,
  clearStoredGoogleChecks,
} from "../scripts/ops/providers/GoogleFinanceChecker";

const fixtures: Record<string, string> = {
  EURUSD: loadFixture("eurusd.html"),
  CHFUSD: loadFixture("chfusd-miss.html"),
  "CHF-USD": loadFixture("chfusd-hit.html"),
  USDCHF: loadFixture("usdchf-hit.html"),
  "USD-CHF": loadFixture("usdchf-hit.html"),
  CNYUSD: loadFixture("cnyusd-miss.html"),
  USDCNY: loadFixture("usdcny-hit.html"),
  "USD-CNY": loadFixture("usdcny-hit.html"),
  XAUUSD: loadFixture("xauusd.html"),
};

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, "fixtures", name), "utf8");
}

function setupMockFetcher(): void {
  setGoogleMarkupFetcher(async (symbol) => {
    const key = symbol.toUpperCase();
    if (!fixtures[key]) {
      throw new Error(`fixture missing for ${symbol}`);
    }
    return fixtures[key];
  });
}

async function run(): Promise<void> {
  const logs: string[] = [];
  const warns: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(" "));
  };

  try {
    setupMockFetcher();
    resetGoogleAlerts();
    clearStoredGoogleChecks();

    const eurusd = await checkWithGoogle("EURUSD", 1.1);
    assert.ok(eurusd.ok, "EURUSD should be OK");
    assert.equal(eurusd.googlePrice?.toFixed(4), "1.1000");
    assert.equal(eurusd.diffPct?.toFixed(2), "0.00");

    const chfusd = await checkWithGoogle("CHFUSD", 1.260771);
    assert.ok(chfusd.ok, "CHFUSD fallback should be OK");
    assert.equal(chfusd.inverseUsed, false, "CHFUSD should not use inverse when direct fallback exists");
    assert.equal(chfusd.googlePrice?.toFixed(6), "1.260771");

    const cnyusd = await checkWithGoogle("CNYUSD", 0.14084507);
    assert.ok(cnyusd.ok, "CNYUSD inverse should be OK");
    assert.equal(cnyusd.inverseUsed, true, "CNYUSD should use inverse");
    assert.equal(cnyusd.inverseSymbol, "USDCNY");

    const inverseLogFound = logs.some((line) => line.includes("[CHECKER:GOOGLE:INVERSE] CNYUSD via USDCNY"));
    assert.ok(inverseLogFound, "Inverse log entry missing");

    const xauusd = await checkWithGoogle("XAUUSD", 2350.25);
    assert.ok(xauusd.ok, "XAUUSD override should be OK");
    assert.equal(xauusd.googlePrice?.toFixed(2), "2350.25");
    assert.equal(xauusd.threshold, 1.5);

    assert.equal(warns.length, 0, "No warnings expected");

    console.log = originalLog;
    console.warn = originalWarn;
    console.log("google-checker.spec.ts passed");
  } finally {
    resetGoogleMarkupFetcher();
    resetGoogleAlerts();
    clearStoredGoogleChecks();
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
