import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { executeInverseCheck, type InverseCheckOutcome } from "./checkers/inverse-sanity";

const SYMBOLS = ["CHFUSD", "JPYUSD", "NOKUSD", "SEKUSD", "CNYUSD", "XAUUSD"] as const;
const REPORTS_DIR = resolve(process.cwd(), "reports");

function formatProvider(source?: InverseCheckOutcome["providerSource"]): string {
  switch (source) {
    case "polygon":
      return "Polygon";
    case "cache":
      return "Cache";
    default:
      return "Yahoo";
  }
}

function formatDiff(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${value.toFixed(2)}%`;
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return value.toFixed(6);
}

async function persistReport(results: InverseCheckOutcome[]): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });

  const symbols: Record<string, unknown> = {};
  for (const outcome of results) {
    symbols[outcome.symbol] = {
      ok: outcome.ok,
      provider: formatProvider(outcome.providerSource),
      ticker: outcome.providerTicker ?? null,
      timestamp: outcome.providerTimestamp ?? null,
      price: Number.isFinite(outcome.providerPrice) ? outcome.providerPrice : null,
      googlePrice: outcome.googlePrice,
      diffPct: outcome.diffPct,
      path: outcome.resolutionPath ?? (outcome.inverseUsed ? "inverse" : null),
      inverseUsed: outcome.inverseUsed,
      inverseSymbol: outcome.inverseSymbol ?? null,
      threshold: outcome.threshold,
      error: outcome.error ?? null,
    };
  }

  const alerts = results.filter((item) => !item.ok || typeof item.alert === "string").map((item) => item.symbol);

  const payload = {
    ts: new Date().toISOString(),
    alerts,
    tested: results.length,
    symbols,
  };

  await writeFile(resolve(REPORTS_DIR, "check-inverse.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main(): Promise<void> {
  const results: InverseCheckOutcome[] = [];

  for (const symbol of SYMBOLS) {
    const outcome = await executeInverseCheck(symbol);
    results.push(outcome);

    if (outcome.inverseUsed && outcome.googlePrice !== null) {
      console.log(
        `[CHECKER:INVERSE] ${outcome.symbol} via ${outcome.inverseSymbol ?? "inverse"} ${outcome.googlePrice.toFixed(6)}`
      );
    } else if (outcome.resolutionPath === "dashed" && outcome.googlePrice !== null) {
      console.log(`[CHECKER:DASHED] ${outcome.symbol} ${outcome.googlePrice.toFixed(6)}`);
    } else if (outcome.resolutionPath?.startsWith("override") && outcome.googlePrice !== null) {
      console.log(`[CHECKER:OVERRIDE] ${outcome.symbol} ${outcome.googlePrice.toFixed(6)}`);
    }

    const diffLabel = formatDiff(outcome.diffPct);
    const providerLabel = formatPrice(outcome.providerPrice);
    if (outcome.ok) {
      console.log(`[CHECKER:OK] ${outcome.symbol} ${providerLabel} (diff ${diffLabel})`);
    } else {
      console.warn(`[CHECKER:ALERT] ${outcome.symbol} diff ${diffLabel}`);
    }
  }

  const alerts = results.filter((item) => !item.ok || typeof item.alert === "string");
  console.log(`[CHECKER:SUMMARY] tested:${results.length} alerts:${alerts.length}`);

  await persistReport(results);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[CHECK-INVERSE] failed: ${message}`);
  process.exitCode = 1;
});
