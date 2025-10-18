import { mkdir, writeFile, readdir, rm, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { config as loadEnv } from "dotenv";
import { spawnSync } from "child_process";
import { formatSummary, runFeeder, feederEvents, type FeederOptions, type FeederSummary } from "./price-feeder-main";
import { listAssetFeeds } from "./assets.map";
import {
  providerEvents,
  setFetchOverride,
  clearAllFetchOverrides,
  type PriceSource,
  PROVIDERS_PRIORITY,
} from "./providers/Provider";
import { loadAddresses } from "../helpers/addresses";
import {
  collectGoogleAlerts,
  resetGoogleAlerts,
  clearStoredGoogleChecks,
  type GoogleCheckResult,
} from "./providers/GoogleFinanceChecker";
import { runInverseChecks, type InverseCheckReport, type InverseCheckOutcome } from "./checkers/inverse-sanity";

loadEnv({ path: resolve(process.cwd(), ".env.nav-watch") });

const MONITORED_SYMBOLS = ["CHFUSD", "JPYUSD", "NOKUSD", "SEKUSD", "CNYUSD", "XAUUSD"] as const;
const REPORTS_DIR = resolve(process.cwd(), "reports");
const REPORTS_ARCHIVE_DIR = resolve(REPORTS_DIR, "archive");
const E2E_REPORT_FILE = resolve(REPORTS_DIR, "e2e_quick.json");
const MAX_ARCHIVE_SNAPSHOTS = 50;
const MAX_CHECKER_ALERTS = Number.parseInt(process.env.MAX_CHECKER_ALERTS ?? "2", 10) || 2;
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

const SOURCE_PROVIDER_MAP: Record<string, (typeof PROVIDERS_PRIORITY)[number]> = {
  regular: "Yahoo",
  close: "Yahoo",
  polygon: "Polygon",
  cache: "Cache",
};

export interface MonitorOptions extends FeederOptions {
  intervalMs: number;
  jitterMs: number;
  once: boolean;
}

interface AssetState {
  consecutiveSkips: number;
  forceClose: boolean;
  pausedUntil?: number;
}

interface CycleExecutionResult {
  summary?: FeederSummary;
  error?: unknown;
  alerts: string[];
  checkerAlerts: GoogleCheckResult[];
  inverseReport: InverseCheckReport;
  providerRequests: Record<string, number>;
  inverseSnapshot?: { ts: string; label: string } | null;
}

interface CycleEventContext {
  skipped: Map<string, string>;
  commitErrors: Set<string>;
  fallbacks: Map<string, string>;
  providerRequests: Map<(typeof PROVIDERS_PRIORITY)[number], number>;
  cleanup: () => void;
}

type E2EStatus = "OK" | "ERROR" | "SKIPPED";

const E2E_STATUS_VALUES = ["OK", "ERROR", "SKIPPED"] as const;

interface E2EExecutionResult {
  status: E2EStatus;
  exitCode: number | null;
  label?: string;
  reportPath?: string;
  commit: boolean;
  error?: string;
  mode?: string;
}

interface PlainE2EReport {
  status?: unknown;
  commit?: unknown;
  error?: unknown;
  params?: {
    label?: unknown;
    mode?: unknown;
  };
}

const E2E_STATUS_SET = new Set<E2EStatus>(E2E_STATUS_VALUES);

type ErrorWithCode = { code?: string };

function isErrorWithCode(value: unknown): value is ErrorWithCode {
  return Boolean(value && typeof value === "object" && "code" in value);
}

function isE2EStatus(value: unknown): value is E2EStatus {
  return typeof value === "string" && E2E_STATUS_SET.has(value as E2EStatus);
}

export async function runNavMonitor(options: MonitorOptions): Promise<void> {
  const monitor = new NavMonitor(options);
  await monitor.run();
}

class NavMonitor {
  private readonly options: MonitorOptions;
  private readonly baseAssets: string[];
  private readonly symbolAssetMap = new Map<string, string>();
  private readonly assetStates = new Map<string, AssetState>();
  private readonly retryQueue = new Set<string>();
  private readonly pauseDurationMs = 60 * 60 * 1000;
  private readonly maxBackoffMs: number;
  private shuttingDown = false;
  private consecutiveFailures = 0;
  private reportsDirReady = false;
  private lastReportTimestamp: string | null = null;
  private lastArchiveLabel: string | null = null;
  private lastE2EQuickResult: E2EExecutionResult | null = null;
  private consecutiveNoUpdateRuns = 0;
  private consecutiveCheckerBreaches = 0;
  private commitBlocked = false;

  constructor(options: MonitorOptions) {
    this.options = options;
    const feeds = listAssetFeeds();
    const providedSymbols = options.symbols && options.symbols.length > 0 ? options.symbols : undefined;
    const assetList = providedSymbols
      ? providedSymbols.map((sym) => this.resolveFromConfig(feeds, sym) ?? sym.toUpperCase())
      : feeds.map((cfg) => cfg.asset.toUpperCase());

    this.baseAssets = Array.from(new Set(assetList));

    for (const cfg of feeds) {
      const assetKey = cfg.asset.toUpperCase();
      const symbolKey = cfg.symbol.toUpperCase();
      this.symbolAssetMap.set(assetKey, assetKey);
      this.symbolAssetMap.set(symbolKey, assetKey);
      this.ensureState(assetKey);
    }

    for (const asset of this.baseAssets) {
      this.ensureState(asset.toUpperCase());
    }

    this.maxBackoffMs = Math.max(this.options.intervalMs * 6, 3_600_000);
    console.log(`Provider order: ${PROVIDERS_PRIORITY.join(" -> ")}`);
  }

  async run(): Promise<void> {
    this.installSignalHandlers();
    await this.checkStalenessAtStartup();

    do {
      const cycleStartedAt = Date.now();
      const { summary, error, alerts, checkerAlerts, inverseReport, providerRequests, inverseSnapshot } =
        await this.executeCycle();
      const cycleElapsedMs = Date.now() - cycleStartedAt;

      if (this.commitBlocked && this.options.commit) {
        console.warn(`[MONITOR] Commit disabled due to previous guard condition.`);
      }

      if (summary) {
        console.log(`[${new Date().toISOString()}] ${formatSummary(summary)}`);
      }

      if (error) {
        this.consecutiveFailures += 1;
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          `[${new Date().toISOString()}] ❌ Monitor cycle failed (#${this.consecutiveFailures}): ${reason}`
        );
        if (this.options.once || this.shuttingDown) {
          break;
        }
        const backoff = this.computeBackoffDelay();
        console.log(`⏱️  Backoff per ${backoff} ms prima del prossimo tentativo.`);
        await delay(backoff);
        continue;
      }

      this.consecutiveFailures = 0;

      const updated = summary?.updated ?? 0;
      const checkerAlertCount = checkerAlerts.length;
      const inverseAlertCount = inverseReport.alerts.length;
      const totalCheckerAlerts = checkerAlertCount + inverseAlertCount;
      const fallbackUsed = summary?.results.filter((item) => item.status === "updated" && item.fallback).length ?? 0;
      const fallbackRatio = updated > 0 ? fallbackUsed / updated : 0;
      const providerRateLog = this.formatProviderRates(providerRequests, cycleElapsedMs);
      const { avgFxDiff, avgXauDiff } = this.computeAverageDiffs(inverseReport);
      console.log(
        `[SUMMARY] updated:${updated}, checkerAlerts:${totalCheckerAlerts}, fallbackUsed:${fallbackUsed}, fallbackRatio:${fallbackRatio.toFixed(2)}, cycleMs:${cycleElapsedMs}, avgDiffFx:${avgFxDiff.toFixed(2)}%, avgDiffXAU:${avgXauDiff.toFixed(2)}%, ${providerRateLog}`
      );
      if (summary) {
        summary.checkerAlerts = checkerAlerts;
        summary.inverseAlerts = inverseReport.alerts;
        summary.providerOrder = Array.from(PROVIDERS_PRIORITY);
        summary.byProvider = providerRequests;
        const generatedAt = inverseSnapshot?.ts ? new Date(inverseSnapshot.ts) : new Date();
        await this.persistRunReport(
          summary,
          checkerAlerts,
          inverseReport,
          generatedAt,
          inverseSnapshot?.label,
          providerRequests,
          cycleElapsedMs,
          fallbackRatio
        );
      }
      await this.handleAlerts(summary, inverseReport, totalCheckerAlerts, fallbackUsed, fallbackRatio, cycleElapsedMs);
      if (inverseAlertCount > 0) {
        console.warn(`[ALERT] inverse/dashed mismatches: ${inverseAlertCount}`);
      }
      if (alerts.length > 0) {
        console.warn("[NOTIFY] Alerts detected; integrate Slack/Discord/Email notification.");
      }

      if (this.options.once || this.shuttingDown) {
        break;
      }

      const waitMs = this.computeDelayMs(this.options.intervalMs, this.options.jitterMs);
      const elapsed = Date.now() - cycleStartedAt;
      const remaining = Math.max(0, waitMs - elapsed);
      await delay(remaining);
    } while (!this.shuttingDown);

    console.log("✅ NAV monitor terminated.");
  }

  private async executeCycle(): Promise<CycleExecutionResult> {
    const now = Date.now();
    const { symbolsToRun, waitMs } = this.selectSymbols(now);

    if (symbolsToRun.length === 0) {
      if (waitMs && waitMs > 0) {
        await delay(waitMs);
      }
      return {
        alerts: [],
        checkerAlerts: [],
        inverseReport: { results: [], alerts: [] },
        providerRequests: {},
        inverseSnapshot: null,
      };
    }

    const cycleAssets = new Set(symbolsToRun.map((asset) => asset.toUpperCase()));
    this.applyOverrides(cycleAssets);
    const context = this.captureEvents(cycleAssets);

    resetGoogleAlerts();
    clearStoredGoogleChecks();

    let summary: FeederSummary | undefined;
    let error: unknown;

    try {
      summary = await runFeeder({ ...this.options, symbols: Array.from(cycleAssets) });
    } catch (err) {
      error = err;
    } finally {
      clearAllFetchOverrides();
      context.cleanup();
    }

    this.updateAssetStates(cycleAssets, summary, context);

    const checkerAlerts = collectGoogleAlerts();
    const inverseReport = !error ? await this.runInverseSanity(MONITORED_SYMBOLS) : { results: [], alerts: [] };
    resetGoogleAlerts();
    clearStoredGoogleChecks();

    const alerts =
      !error && summary && this.options.commit && summary.txHashes.length > 0 ? await this.verifyOnChain(summary) : [];

    const providerRequests: Record<string, number> = Object.fromEntries(context.providerRequests.entries());
    for (const provider of PROVIDERS_PRIORITY) {
      if (!(provider in providerRequests)) {
        providerRequests[provider] = 0;
      }
    }

    const generatedAt = new Date();
    const inverseSnapshot = await this.persistInverseReport(inverseReport, generatedAt, !summary);

    return { summary, error, alerts, checkerAlerts, inverseReport, providerRequests, inverseSnapshot };
  }

  private selectSymbols(now: number): { symbolsToRun: string[]; waitMs?: number } {
    const retryTargets = Array.from(this.retryQueue).filter((asset) => !this.isPaused(asset, now));
    if (retryTargets.length > 0) {
      return { symbolsToRun: retryTargets };
    }

    const baseTargets = this.baseAssets.filter((asset) => !this.isPaused(asset, now));
    if (baseTargets.length > 0) {
      return { symbolsToRun: baseTargets };
    }

    const nextResume = this.nextResumeTime(now);
    const waitMs = nextResume ? Math.max(5_000, nextResume - now) : this.options.intervalMs;
    return { symbolsToRun: [], waitMs };
  }

  private async runInverseSanity(symbols: readonly string[]): Promise<InverseCheckReport> {
    return runInverseChecks(symbols.map((item) => item.toUpperCase()));
  }

  private async ensureReportsDir(): Promise<string> {
    if (!this.reportsDirReady) {
      await mkdir(REPORTS_DIR, { recursive: true });
      this.reportsDirReady = true;
    }
    return REPORTS_DIR;
  }

  private async checkStalenessAtStartup(): Promise<void> {
    try {
      const raw = await readFile(resolve(REPORTS_DIR, "last_run.json"), "utf8");
      const parsed = JSON.parse(raw) as { ts?: string };
      if (!parsed?.ts) {
        return;
      }
      const ts = Date.parse(parsed.ts);
      if (Number.isNaN(ts)) {
        return;
      }
      const age = Date.now() - ts;
      if (age > STALE_THRESHOLD_MS) {
        console.warn("[ALERT] monitor stale (last run > 30 minutes ago)");
      }
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== "ENOENT") {
        console.error("[MONITOR] Unable to inspect previous report:", error);
      }
    }
  }

  private formatProvider(source?: InverseCheckOutcome["providerSource"]): (typeof PROVIDERS_PRIORITY)[number] {
    switch (source) {
      case "polygon":
        return "Polygon";
      case "cache":
        return "Cache";
      default:
        return "Yahoo";
    }
  }

  private resolveOutcomePath(outcome: InverseCheckOutcome): string {
    if (outcome.resolutionPath) {
      return outcome.resolutionPath;
    }
    if (outcome.inverseUsed) {
      return "inverse";
    }
    return "straight";
  }

  private formatArchiveLabel(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}_${hour}-${minute}`;
  }

  private formatProviderRates(providerRequests: Record<string, number>, cycleMs: number): string {
    const durationSec = cycleMs > 0 ? cycleMs / 1000 : 1;
    const segments: string[] = [];
    for (const provider of PROVIDERS_PRIORITY) {
      const count = providerRequests[provider] ?? 0;
      const rate = count / durationSec;
      segments.push(`${provider}=${count}req (${rate.toFixed(2)}/s)`);
    }
    return `providers[${segments.join(" ")}]`;
  }

  private computeAverageDiffs(report: InverseCheckReport): { avgFxDiff: number; avgXauDiff: number } {
    let fxSum = 0;
    let fxCount = 0;
    let xauSum = 0;
    let xauCount = 0;

    for (const outcome of report.results) {
      if (typeof outcome.diffPct !== "number" || !Number.isFinite(outcome.diffPct)) {
        continue;
      }
      if (outcome.symbol === "XAUUSD") {
        xauSum += Math.abs(outcome.diffPct);
        xauCount += 1;
      } else {
        fxSum += Math.abs(outcome.diffPct);
        fxCount += 1;
      }
    }

    return {
      avgFxDiff: fxCount > 0 ? fxSum / fxCount : 0,
      avgXauDiff: xauCount > 0 ? xauSum / xauCount : 0,
    };
  }

  private async writeReportFiles(
    baseName: string,
    payload: unknown,
    archiveLabel: string,
    enforceRetention: boolean
  ): Promise<void> {
    const dir = await this.ensureReportsDir();
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    await writeFile(resolve(dir, baseName), serialized, "utf8");

    await mkdir(REPORTS_ARCHIVE_DIR, { recursive: true });
    const snapshotDir = resolve(REPORTS_ARCHIVE_DIR, archiveLabel);
    await mkdir(snapshotDir, { recursive: true });
    await writeFile(resolve(snapshotDir, baseName), serialized, "utf8");

    if (enforceRetention) {
      await this.enforceArchiveRetention(REPORTS_ARCHIVE_DIR, MAX_ARCHIVE_SNAPSHOTS);
    }
  }

  private async enforceArchiveRetention(baseDir: string, maxSnapshots: number): Promise<void> {
    try {
      const entries = await readdir(baseDir, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      if (directories.length <= maxSnapshots) {
        console.log(`[RETENTION] kept=${directories.length} removed=0`);
        return;
      }

      const toRemove = directories.length - maxSnapshots;
      for (let index = 0; index < toRemove; index += 1) {
        const target = resolve(baseDir, directories[index]);
        await rm(target, { recursive: true, force: true });
      }
      console.log(`[RETENTION] kept=${maxSnapshots} removed=${toRemove}`);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === "ENOENT") {
        return;
      }
      console.error("[MONITOR] Archive retention failed:", error);
    }
  }

  private async persistInverseReport(
    report: InverseCheckReport,
    generatedAt: Date,
    enforceRetention: boolean
  ): Promise<{ ts: string; label: string } | null> {
    try {
      const ts = generatedAt.toISOString();
      const archiveLabel = this.formatArchiveLabel(generatedAt);

      const items = report.results
        .map((outcome) => {
          const providerPrice = Number(outcome.providerPrice);
          const provider = this.formatProvider(outcome.providerSource);
          const item: {
            symbol: string;
            path: string;
            provider: (typeof PROVIDERS_PRIORITY)[number];
            providerPrice: number;
            googlePrice?: number;
            diffPct?: number;
            ok: boolean;
            inverseUsed?: boolean;
            inverseSymbol?: string | null;
            error?: string | null;
            threshold?: number;
          } = {
            symbol: outcome.symbol,
            path: this.resolveOutcomePath(outcome),
            provider,
            providerPrice: Number.isFinite(providerPrice) ? providerPrice : 0,
            ok: outcome.ok,
          };

          const googlePrice = typeof outcome.googlePrice === "number" ? outcome.googlePrice : null;
          if (googlePrice !== null && Number.isFinite(googlePrice)) {
            item.googlePrice = googlePrice;
          }

          const diffPct = typeof outcome.diffPct === "number" ? outcome.diffPct : null;
          if (diffPct !== null && Number.isFinite(diffPct)) {
            item.diffPct = diffPct;
          }

          if (outcome.inverseUsed) {
            item.inverseUsed = true;
          }
          if (outcome.inverseSymbol) {
            item.inverseSymbol = outcome.inverseSymbol;
          }
          if (outcome.error) {
            item.error = outcome.error;
          }
          if (Number.isFinite(outcome.threshold)) {
            item.threshold = outcome.threshold;
          }

          return item;
        })
        .sort((a, b) => a.symbol.localeCompare(b.symbol));

      const payload = {
        schema: "inverse.v1",
        ts,
        alerts: report.alerts.map((item) => item.symbol),
        tested: report.results.length,
        items,
      };

      await this.writeReportFiles("last_inverse.json", payload, archiveLabel, enforceRetention);
      this.lastReportTimestamp = ts;
      this.lastArchiveLabel = archiveLabel;
      return { ts, label: archiveLabel };
    } catch (error) {
      console.error("[MONITOR] Unable to persist inverse report:", error);
      return null;
    }
  }

  private async persistRunReport(
    summary: FeederSummary,
    checkerAlerts: GoogleCheckResult[],
    inverseReport: InverseCheckReport,
    generatedAt: Date,
    archiveLabel: string | null | undefined,
    providerRequests: Record<string, number>,
    cycleMs: number,
    fallbackRatio: number
  ): Promise<void> {
    try {
      const ts = generatedAt.toISOString();
      const label = archiveLabel ?? this.formatArchiveLabel(generatedAt);
      const fallbackUsed = summary.results.filter((item) => item.status === "updated" && item.fallback).length;
      const googleAlerts = checkerAlerts.length;
      const inverseAlerts = inverseReport.alerts.length;
      const totalAlerts = googleAlerts + inverseAlerts;
      const providerOrder = Array.from(PROVIDERS_PRIORITY);
      const providerCounts: Record<(typeof PROVIDERS_PRIORITY)[number], number> = {
        Yahoo: providerRequests.Yahoo ?? 0,
        Polygon: providerRequests.Polygon ?? 0,
        Cache: providerRequests.Cache ?? 0,
      };

      const symbols: Record<string, unknown> = {};
      for (const symbol of MONITORED_SYMBOLS) {
        const outcome = inverseReport.results.find((item) => item.symbol === symbol);
        if (!outcome) {
          symbols[symbol] = {
            provider: "Yahoo",
            usedProvider: "Yahoo",
            price: 0,
            path: "straight",
            ok: false,
          };
          continue;
        }

        const provider = this.formatProvider(outcome.providerSource);
        providerCounts[provider] += 1;
        const providerPrice = Number(outcome.providerPrice);
        const entry: {
          provider: (typeof PROVIDERS_PRIORITY)[number];
          usedProvider: (typeof PROVIDERS_PRIORITY)[number];
          price: number;
          googlePrice?: number;
          diffPct?: number;
          path: string;
          ok: boolean;
        } = {
          provider,
          usedProvider: provider,
          price: Number.isFinite(providerPrice) ? providerPrice : 0,
          path: this.resolveOutcomePath(outcome),
          ok: outcome.ok,
        };

        if (typeof outcome.googlePrice === "number" && Number.isFinite(outcome.googlePrice)) {
          entry.googlePrice = outcome.googlePrice;
        }

        if (typeof outcome.diffPct === "number" && Number.isFinite(outcome.diffPct)) {
          entry.diffPct = outcome.diffPct;
        }

        symbols[symbol] = entry;
      }

      const { avgFxDiff, avgXauDiff } = this.computeAverageDiffs(inverseReport);

      const payload: Record<string, unknown> = {
        schema: "run.v1",
        ts,
        updated: summary.updated,
        skipped: summary.skipped,
        fallbackUsed,
        checkerAlerts: totalAlerts,
        googleAlerts,
        inverseAlerts,
        symbols,
        providerOrder,
        byProvider: providerCounts,
        cycleMs,
        fallbackRatio,
        avgDiffFx: avgFxDiff,
        avgDiffXAU: avgXauDiff,
      };

      const latestTx = summary.txHashes.at(-1);
      if (latestTx) {
        payload.latestTx = latestTx;
      }

      const durationSec = cycleMs > 0 ? cycleMs / 1000 : 1;
      const providerRates: Record<string, number> = {};
      for (const provider of providerOrder) {
        const count = providerCounts[provider];
        providerRates[provider] = Number.parseFloat((count / durationSec).toFixed(4));
      }
      payload.providerRates = providerRates;

      await this.writeReportFiles("last_run.json", payload, label, true);
      this.lastReportTimestamp = ts;
      this.lastArchiveLabel = label;
      summary.providerOrder = providerOrder;
      summary.byProvider = providerCounts;
    } catch (error) {
      console.error("[MONITOR] Unable to persist run report:", error);
    }
  }

  private async handleAlerts(
    summary: FeederSummary | undefined,
    inverseReport: InverseCheckReport,
    totalCheckerAlerts: number,
    fallbackUsed: number,
    fallbackRatio: number,
    cycleMs: number
  ): Promise<void> {
    if (!summary) {
      return;
    }

    const updated = summary.updated;
    if (totalCheckerAlerts > 0) {
      console.warn(`[ALERT] checkerAlerts=${totalCheckerAlerts}`);
    }

    if (updated === 0) {
      this.consecutiveNoUpdateRuns += 1;
      if (this.consecutiveNoUpdateRuns >= 2) {
        console.error("[ALERT] no updates twice");
      } else {
        console.warn("[ALERT] no updates");
      }
    } else {
      this.consecutiveNoUpdateRuns = 0;
    }

    if (totalCheckerAlerts > MAX_CHECKER_ALERTS) {
      this.consecutiveCheckerBreaches += 1;
      if (this.consecutiveCheckerBreaches >= 2) {
        console.error(`[ALERT] checker alerts exceeded threshold twice (count=${totalCheckerAlerts})`);
      } else {
        console.warn(`[ALERT] checker alerts exceed threshold (count=${totalCheckerAlerts})`);
      }
    } else if (totalCheckerAlerts <= MAX_CHECKER_ALERTS) {
      this.consecutiveCheckerBreaches = 0;
    }

    if (updated > 0 && fallbackRatio > 0.25) {
      console.warn(`[ALERT] fallbackRatio=${fallbackRatio.toFixed(2)}`);
    }

    if (this.options.commit && !this.commitBlocked && (updated === 0 || totalCheckerAlerts > MAX_CHECKER_ALERTS)) {
      this.commitBlocked = true;
      this.options.commit = false;
      console.error("[ALERT] commit disabled due to guard condition (no updates or checker alerts over limit).");
    }

    const safeModeActive = (process.env.SAFE_MODE ?? "0") === "1";
    const canRunE2E = this.options.commit && !this.commitBlocked && summary.updated > 0 && totalCheckerAlerts === 0;

    let e2eResult: E2EExecutionResult;
    if (canRunE2E) {
      if (safeModeActive) {
        console.warn("[MONITOR] Skipping E2E quick because SAFE_MODE is active.");
        e2eResult = {
          status: "SKIPPED",
          exitCode: null,
          commit: true,
          error: "SAFE_MODE active",
        };
      } else {
        try {
          e2eResult = await this.runE2EQuick();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[MONITOR] E2E quick failed:", message);
          e2eResult = {
            status: "ERROR",
            exitCode: null,
            commit: true,
            error: message,
          };
        }
      }
    } else {
      const reasons = new Set<string>();
      if (!this.options.commit) {
        reasons.add("commit disabled");
      }
      if (this.commitBlocked) {
        reasons.add("commit blocked");
      }
      if (summary.updated === 0) {
        reasons.add("no updates");
      }
      if (totalCheckerAlerts > 0) {
        reasons.add("checker alerts present");
      }
      if (reasons.size === 0) {
        reasons.add("not eligible");
      }
      const reasonText = Array.from(reasons).join(", ");
      console.log(`[MONITOR] Skipping E2E quick: ${reasonText}`);
      e2eResult = {
        status: "SKIPPED",
        exitCode: null,
        commit: Boolean(this.options.commit),
        error: reasonText,
      };
    }

    this.lastE2EQuickResult = e2eResult;

    await this.postOperationsWebhook(
      summary,
      inverseReport,
      totalCheckerAlerts,
      fallbackUsed,
      fallbackRatio,
      cycleMs,
      e2eResult
    );
  }

  private async runE2EQuick(): Promise<E2EExecutionResult> {
    const env = { ...process.env };
    const scriptPath = resolve(process.cwd(), "scripts/ops/e2e-quick.ts");
    const tsNodeRegister = require.resolve("ts-node/register/transpile-only");
    const args = ["-r", tsNodeRegister, scriptPath, "--commit"];

    const network = this.options.network ?? env?.HARDHAT_NETWORK;
    if (network) {
      args.push("--network", network);
    }

    const labelOverride = this.lastArchiveLabel;
    if (labelOverride) {
      args.push("--label", labelOverride);
    }

    if (env?.E2E_MODE) {
      args.push("--mode", env.E2E_MODE);
    }

    if (env?.E2E_ADDRESSES_PATH) {
      args.push("--addressesPath", env.E2E_ADDRESSES_PATH);
    }

    console.log(
      `[MONITOR] Launching E2E quick script (label=${labelOverride ?? "auto"}, network=${network ?? "default"})...`
    );

    let exitCode: number | null = null;
    let spawnError: string | undefined;
    try {
      const child = spawnSync(process.execPath, args, {
        env,
        stdio: "inherit",
      });
      exitCode = child.status ?? null;
      if (child.error) {
        spawnError = child.error.message;
      }
    } catch (error) {
      spawnError = error instanceof Error ? error.message : String(error);
    }

    if (spawnError) {
      console.error("[MONITOR] Failed to launch E2E quick:", spawnError);
      return {
        status: "ERROR",
        exitCode,
        commit: true,
        error: spawnError,
      };
    }

    let report: PlainE2EReport | null = null;
    try {
      const raw = await readFile(E2E_REPORT_FILE, "utf8");
      report = JSON.parse(raw) as PlainE2EReport;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[MONITOR] Unable to load E2E report: ${message}`);
    }

    const status = isE2EStatus(report?.status) ? (report?.status as E2EStatus) : exitCode === 0 ? "OK" : "ERROR";
    const params = (report?.params ?? {}) as Record<string, unknown>;
    const reportLabel =
      typeof params.label === "string" && params.label.length > 0
        ? (params.label as string)
        : (labelOverride ?? undefined);
    const reportPath =
      reportLabel !== undefined
        ? `reports/archive/${reportLabel}/e2e_quick.json`
        : report
          ? "reports/e2e_quick.json"
          : undefined;
    const mode = typeof params.mode === "string" ? (params.mode as string) : undefined;

    const result: E2EExecutionResult = {
      status,
      exitCode,
      label: reportLabel,
      reportPath,
      commit: Boolean(report?.commit ?? true),
      mode,
      error:
        typeof report?.error === "string"
          ? (report.error as string)
          : exitCode !== null && exitCode !== 0
            ? `exit code ${exitCode}`
            : undefined,
    };

    if (!report && status !== "OK") {
      result.error = result.error ?? "report not produced";
    }

    if (status === "OK") {
      console.log("[MONITOR] E2E quick completed successfully");
    } else if (exitCode !== null && exitCode !== 0) {
      console.error(`[MONITOR] E2E quick exited with status ${exitCode}`);
    } else if (result.error) {
      console.error(`[MONITOR] E2E quick reported error: ${result.error}`);
    }

    return result;
  }

  private async postOperationsWebhook(
    summary: FeederSummary,
    inverseReport: InverseCheckReport,
    totalCheckerAlerts: number,
    fallbackUsed: number,
    fallbackRatio: number,
    cycleMs: number,
    e2eResult?: E2EExecutionResult
  ): Promise<void> {
    const webhook = process.env.OPS_ALERT_WEBHOOK;
    if (!webhook) {
      return;
    }

    const payload: Record<string, unknown> = {
      ts: this.lastReportTimestamp ?? new Date().toISOString(),
      network: this.options.network ?? "unknown",
      updated: summary.updated,
      skipped: summary.skipped,
      fallbackUsed,
      checkerAlerts: totalCheckerAlerts,
      inverseAlerts: inverseReport.alerts.length,
      providerOrder: summary.providerOrder ?? Array.from(PROVIDERS_PRIORITY),
      byProvider: summary.byProvider ?? {},
      fallbackRatio,
      cycleMs,
    };

    const providerOrder = payload.providerOrder as (typeof PROVIDERS_PRIORITY)[number][];
    const byProvider = payload.byProvider as Record<string, number>;
    const durationSec = cycleMs > 0 ? cycleMs / 1000 : 1;
    const providerRates: Record<string, number> = {};
    for (const provider of providerOrder) {
      const count = byProvider?.[provider] ?? 0;
      providerRates[provider] = Number.parseFloat((count / durationSec).toFixed(4));
    }
    payload.providerRates = providerRates;

    const e2ePayloadSource = e2eResult ?? this.lastE2EQuickResult;
    if (e2ePayloadSource) {
      const e2ePayload: Record<string, unknown> = {
        status: e2ePayloadSource.status,
        commit: e2ePayloadSource.commit,
        exitCode: e2ePayloadSource.exitCode,
      };
      if (e2ePayloadSource.reportPath) {
        e2ePayload.report = e2ePayloadSource.reportPath;
      }
      if (e2ePayloadSource.label) {
        e2ePayload.label = e2ePayloadSource.label;
      }
      if (e2ePayloadSource.mode) {
        e2ePayload.mode = e2ePayloadSource.mode;
      }
      if (e2ePayloadSource.error) {
        e2ePayload.error = e2ePayloadSource.error;
      }
      payload.e2e = e2ePayload;
    }

    const latestTx = summary.txHashes.at(-1);
    if (latestTx) {
      payload.latestTx = latestTx;
    }

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        console.error(`[MONITOR] Webhook responded with status ${response.status}`);
      } else {
        const e2eStatusLog = (e2eResult ?? this.lastE2EQuickResult)?.status ?? "n/a";
        console.log(`[ALERT] webhook dispatched (status=${response.status}, e2e=${e2eStatusLog})`);
      }
    } catch (error) {
      console.error("[MONITOR] Failed to send alert webhook:", error);
    }
  }

  private captureEvents(cycleAssets: Set<string>): CycleEventContext {
    const skipped = new Map<string, string>();
    const commitErrors = new Set<string>();
    const fallbacks = new Map<string, string>();
    const providerRequests = new Map<(typeof PROVIDERS_PRIORITY)[number], number>();

    const priceListener = (payload: { symbol: string; source: PriceSource; stale: boolean }) => {
      const assetKey = this.resolveAssetKey(payload.symbol);
      if (!assetKey || !cycleAssets.has(assetKey)) {
        return;
      }
      const provider = SOURCE_PROVIDER_MAP[payload.source] ?? "Yahoo";
      providerRequests.set(provider, (providerRequests.get(provider) ?? 0) + 1);
      if (payload.stale) {
        console.warn(`[MONITOR] ${assetKey} received stale price (source=${payload.source}).`);
      }
    };

    const skipListener = (payload: { symbol: string; reason: string }) => {
      const assetKey = this.resolveAssetKey(payload.symbol);
      if (!assetKey || !cycleAssets.has(assetKey)) {
        return;
      }
      skipped.set(assetKey, payload.reason);
    };

    const errorListener = (payload: { symbol: string; error: string }) => {
      const assetKey = this.resolveAssetKey(payload.symbol);
      if (!assetKey || !cycleAssets.has(assetKey)) {
        return;
      }
      skipped.set(assetKey, payload.error ?? "error");
    };

    const commitErrorListener = (payload: { assetKeys: string[]; error: unknown }) => {
      for (const assetKey of payload.assetKeys) {
        if (cycleAssets.size === 0 || cycleAssets.has(assetKey)) {
          commitErrors.add(assetKey);
        }
      }
    };

    const fallbackListener = (payload: { symbol: string; provider: string }) => {
      const assetKey = this.resolveAssetKey(payload.symbol);
      if (!assetKey || !cycleAssets.has(assetKey)) {
        return;
      }
      fallbacks.set(assetKey, payload.provider);
    };

    providerEvents.on("price", priceListener);
    providerEvents.on("skip", skipListener as (payload: unknown) => void);
    providerEvents.on("error", errorListener as (payload: unknown) => void);
    providerEvents.on("fallback", fallbackListener as (payload: unknown) => void);
    feederEvents.on("commit:error", commitErrorListener);

    const cleanup = () => {
      providerEvents.off("price", priceListener);
      providerEvents.off("skip", skipListener as (payload: unknown) => void);
      providerEvents.off("error", errorListener as (payload: unknown) => void);
      providerEvents.off("fallback", fallbackListener as (payload: unknown) => void);
      feederEvents.off("commit:error", commitErrorListener);
    };

    return { skipped, commitErrors, fallbacks, providerRequests, cleanup };
  }

  private updateAssetStates(
    cycleAssets: Set<string>,
    summary: FeederSummary | undefined,
    context: CycleEventContext
  ): void {
    const now = Date.now();

    if (summary) {
      for (const result of summary.results) {
        const state = this.ensureState(result.assetKey);
        if (result.status === "updated") {
          state.consecutiveSkips = 0;
          state.forceClose = false;
          this.retryQueue.delete(result.assetKey);
        } else {
          state.consecutiveSkips += 1;
          this.retryQueue.add(result.assetKey);
          if (state.consecutiveSkips > 2 && !state.forceClose) {
            console.warn(
              `[MONITOR] Forcing close fallback for ${result.assetKey} after ${state.consecutiveSkips} skips.`
            );
            state.forceClose = true;
          }
        }
      }
    } else {
      for (const asset of cycleAssets) {
        this.retryQueue.add(asset);
      }
    }

    if (context.commitErrors.size > 0) {
      const pauseUntil = now + this.pauseDurationMs;
      for (const assetKey of context.commitErrors) {
        const state = this.ensureState(assetKey);
        state.pausedUntil = pauseUntil;
        state.forceClose = false;
        state.consecutiveSkips = 0;
        this.retryQueue.delete(assetKey);
        console.warn(
          `[MONITOR] Pausing ${assetKey} until ${new Date(pauseUntil).toISOString()} because of commit error.`
        );
      }
    }
    if (context.fallbacks.size > 0) {
      const details = Array.from(context.fallbacks.entries())
        .map(([asset, provider]) => `${asset}->${provider}`)
        .join(", ");
      console.log(`[FALLBACK:SUMMARY] ${details}`);
    }
  }

  private async verifyOnChain(summary: FeederSummary): Promise<string[]> {
    if (summary.harvested.length === 0) {
      return [];
    }

    try {
      const network = this.options.network;
      if (network) {
        process.env.HARDHAT_NETWORK = network;
      }
      const hre = await import("hardhat");
      const { data } = loadAddresses(this.options.network, this.options.addressesPath);
      const oracleAddress = data.contracts?.MedianOracle;
      if (!oracleAddress) {
        console.warn("[MONITOR] MedianOracle address missing; skipping on-chain verification.");
        return [];
      }

      const oracle = await hre.ethers.getContractAt("MedianOracle", oracleAddress);
      const alerts: string[] = [];

      for (const item of summary.harvested) {
        try {
          const onChain = await oracle.getPriceData(item.observation.assetId);
          const priceRaw = (onChain as { price?: bigint }).price ?? 0n;
          const updatedAtRaw = (onChain as { updatedAt?: bigint }).updatedAt ?? 0n;
          const onChainPrice = BigInt(priceRaw);
          const onChainTs = Number(updatedAtRaw);
          const localPrice = item.observation.price;
          const localTs = item.timestamp;

          const tsDiff = Math.abs(onChainTs - localTs);
          const diff = localPrice > onChainPrice ? localPrice - onChainPrice : onChainPrice - localPrice;
          const tolerance = localPrice === 0n ? 0n : localPrice / 100n;

          if (tsDiff > 600 || (localPrice !== 0n && diff > tolerance)) {
            alerts.push(item.symbol);
            console.warn(`[ALERT] On-chain desync for ${item.symbol} (Δts=${tsDiff}s, Δprice=${diff.toString()})`);
          }
        } catch (error) {
          console.error(`[MONITOR] Failed on-chain check for ${item.symbol}:`, error);
        }
      }

      return alerts;
    } catch (err) {
      console.error("[MONITOR] Unable to verify on-chain data:", err);
      return [];
    }
  }

  private applyOverrides(cycleAssets: Set<string>): void {
    clearAllFetchOverrides();
    for (const asset of cycleAssets) {
      const state = this.ensureState(asset);
      if (state.forceClose) {
        setFetchOverride(asset, { forceClose: true, useLastKnown: true });
      }
    }
  }

  private ensureState(assetKey: string): AssetState {
    const upper = assetKey.toUpperCase();
    if (!this.assetStates.has(upper)) {
      this.assetStates.set(upper, { consecutiveSkips: 0, forceClose: false });
    }
    return this.assetStates.get(upper)!;
  }

  private resolveAssetKey(symbol: string): string | undefined {
    return this.symbolAssetMap.get(symbol.toUpperCase());
  }

  private isPaused(assetKey: string, now: number): boolean {
    const state = this.assetStates.get(assetKey.toUpperCase());
    return Boolean(state?.pausedUntil && state.pausedUntil > now);
  }

  private nextResumeTime(now: number): number | undefined {
    let candidate: number | undefined;
    for (const state of this.assetStates.values()) {
      if (state.pausedUntil && state.pausedUntil > now) {
        if (candidate === undefined || state.pausedUntil < candidate) {
          candidate = state.pausedUntil;
        }
      }
    }
    return candidate;
  }

  private installSignalHandlers(): void {
    const handler = (signal: string) => {
      if (this.shuttingDown) return;
      this.shuttingDown = true;
      console.log(`\n${signal} ricevuto: il monitor concluderà il ciclo corrente prima di spegnersi.`);
    };
    process.on("SIGINT", handler);
    process.on("SIGTERM", handler);
  }

  private computeDelayMs(intervalMs: number, jitterMs: number): number {
    if (jitterMs <= 0) {
      return intervalMs;
    }
    const min = Math.max(0, intervalMs - jitterMs);
    const max = intervalMs + jitterMs;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private computeBackoffDelay(): number {
    const exponent = Math.max(0, this.consecutiveFailures - 1);
    const backoff = this.options.intervalMs * Math.pow(2, exponent);
    return Math.min(backoff, this.maxBackoffMs);
  }

  private resolveFromConfig(feeds: ReturnType<typeof listAssetFeeds>, key: string): string | undefined {
    const upper = key.toUpperCase();
    return feeds
      .find((cfg) => cfg.asset.toUpperCase() === upper || cfg.symbol.toUpperCase() === upper)
      ?.asset.toUpperCase();
  }
}

function parseMonitorList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseMonitorInteger(value: string | undefined, label: string, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer (${value})`);
  }
  return parsed;
}

function buildMonitorOptions(argv: string[]): MonitorOptions {
  const envInterval = process.env.NAV_MONITOR_INTERVAL_MS ?? process.env.NAV_WATCH_INTERVAL_MS;
  const envJitter = process.env.NAV_MONITOR_JITTER_MS ?? process.env.NAV_WATCH_JITTER_MS;

  const options: MonitorOptions = {
    network: process.env.HARDHAT_NETWORK || "localhost",
    addressesPath: process.env.FEEDER_ADDRESSES,
    symbols: parseMonitorList(process.env.FEEDER_SYMBOLS),
    commit: process.env.FEEDER_COMMIT_FLAG === "1",
    intervalMs: parseMonitorInteger(envInterval, "interval", 300_000),
    jitterMs: parseMonitorInteger(envJitter, "jitter", 0),
    once: false,
    forceTimestamp: process.env.FEEDER_FORCE_TIMESTAMP,
    advanceTime: process.env.FEEDER_ADVANCE_TIME === "1",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    switch (key) {
      case "help":
        printMonitorHelp();
        process.exit(0);
        break;
      case "network":
        options.network = argv[++index] ?? options.network;
        break;
      case "addresses":
        options.addressesPath = argv[++index];
        break;
      case "symbols":
        options.symbols = parseMonitorList(argv[++index]);
        break;
      case "commit":
        options.commit = true;
        break;
      case "dry":
        options.commit = false;
        break;
      case "interval":
        options.intervalMs = parseMonitorInteger(argv[++index], "--interval", options.intervalMs);
        break;
      case "jitter":
        options.jitterMs = parseMonitorInteger(argv[++index], "--jitter", options.jitterMs);
        break;
      case "once":
        options.once = true;
        break;
      case "loop":
        options.once = false;
        break;
      case "force-timestamp": {
        const raw = argv[++index];
        if (!raw) {
          throw new Error("--force-timestamp requires a value (now|<unix>)");
        }
        options.forceTimestamp = raw === "now" ? "now" : `${Number.parseInt(raw, 10)}`;
        break;
      }
      case "advance-time":
        options.advanceTime = true;
        break;
      default:
        throw new Error(`Unknown flag --${key}`);
    }
  }

  if (!options.commit) {
    console.warn("ℹ️  Running in dry-run mode. Use --commit to enable on-chain updates.");
  }

  return options;
}

function printMonitorHelp(): void {
  console.log("Usage: ts-node scripts/ops/nav-monitor.ts [options]\n");
  console.log("Options:");
  console.log("  --network <name>       Hardhat network (default: localhost)");
  console.log("  --addresses <path>     Deployment addresses file");
  console.log("  --symbols a,b,c        Override symbol list");
  console.log("  --interval <ms>        Interval between cycles (default: 300000)");
  console.log("  --jitter <ms>          Maximum random jitter (default: 0)");
  console.log("  --commit               Enable on-chain commits");
  console.log("  --dry                  Force dry-run mode");
  console.log("  --once                 Execute a single cycle and exit");
  console.log("  --force-timestamp v    Override timestamp (now|unix)");
  console.log("  --advance-time         Advance timestamp (local hardhat)");
}

if (require.main === module) {
  (async () => {
    try {
      const options = buildMonitorOptions(process.argv.slice(2));
      await runNavMonitor(options);
    } catch (error) {
      console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  })();
}
