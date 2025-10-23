import "dotenv/config";
import axios from "axios";
import { ethers } from "./hardhat-runtime";
import {
  BASKETS,
  getBasketId,
  getBasketManager,
  logDryRunNotice,
  parseDryRunFlag,
  requireAddressEnv,
} from "./basket-helpers";

interface CliOptions {
  readonly network: string;
  readonly webhookUrl?: string;
  readonly dryRun: boolean;
}

type Severity = "critical" | "warning";

interface Alert {
  readonly severity: Severity;
  readonly code: string;
  readonly message: string;
  readonly basketKey?: string;
  readonly details?: string;
}

interface BasketSnapshot {
  readonly key: string;
  readonly token: string;
  readonly navAgeSec: number;
  readonly stalenessThreshold: number;
  readonly navStale: boolean;
  readonly latestProofHash: string;
  readonly proofConsumed: boolean;
}

const ZERO_ADDRESS = ethers.ZeroAddress;
const ZERO_HASH = ethers.ZeroHash;

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  let network = process.env.HARDHAT_NETWORK || "sepolia";
  let webhookUrl = process.env.MONITORING_WEBHOOK_URL;
  let dryRun = parseDryRunFlag(argv);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--network" && i + 1 < argv.length) {
      network = argv[i + 1];
      i += 1;
    } else if (arg === "--webhook" && i + 1 < argv.length) {
      webhookUrl = argv[i + 1];
      i += 1;
    } else if (arg === "--dry-run" || arg === "--dryRun") {
      dryRun = true;
    }
  }

  return { network, webhookUrl, dryRun };
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainder = seconds % 60;
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes ? `${hours}h ${remainderMinutes}m` : `${hours}h`;
}

function renderAlert(alert: Alert): string {
  const scope = alert.basketKey ? `[${alert.basketKey}]` : "[global]";
  const prefix = `${scope} ${alert.code}`;
  return alert.details ? `${prefix}: ${alert.message} (${alert.details})` : `${prefix}: ${alert.message}`;
}

function severityColor(severity: Severity): string {
  return severity === "critical" ? "#E01E5A" : "#ECB22E";
}

async function postAlerts(
  webhookUrl: string | undefined,
  alerts: Alert[],
  snapshots: BasketSnapshot[],
  dryRun: boolean
): Promise<void> {
  if (alerts.length === 0) {
    console.log("✅ No monitoring alerts detected");
    return;
  }

  console.log("⚠️  Monitoring alerts detected:");
  for (const alert of alerts) {
    console.log(` - ${renderAlert(alert)}`);
  }

  if (!webhookUrl || dryRun) {
    if (dryRun) {
      logDryRunNotice("Monitoring dry-run: alerts will not be delivered");
    } else {
      console.warn("No webhook configured; alerts only logged to console");
    }
    return;
  }

  const criticalCount = alerts.filter((item) => item.severity === "critical").length;
  const warningCount = alerts.length - criticalCount;
  const headline =
    criticalCount > 0
      ? `AsiaFlex monitor: ${criticalCount} critical, ${warningCount} warnings`
      : `AsiaFlex monitor: ${warningCount} warnings`;

  const attachments = alerts.map((alert) => ({
    color: severityColor(alert.severity),
    title: `${alert.severity.toUpperCase()} ${alert.code}`,
    text: renderAlert(alert),
  }));

  const fields = snapshots.map((snap) => ({
    title: `${snap.key} NAV age`,
    value: `${formatSeconds(snap.navAgeSec)} / threshold ${formatSeconds(snap.stalenessThreshold)}`,
    short: true,
  }));

  try {
    await axios.post(webhookUrl, {
      text: headline,
      attachments: [
        ...attachments,
        {
          color: "#439FE0",
          title: "Basket snapshots",
          fields,
        },
      ],
    });
    console.log("📨 Alerts delivered to webhook");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to deliver webhook alert: ${message}`);
  }
}

async function buildSnapshots(managerAddress: string): Promise<{
  readonly globalAlerts: Alert[];
  readonly basketAlerts: Alert[];
  readonly snapshots: BasketSnapshot[];
}> {
  const manager = await getBasketManager(managerAddress);
  const globalAlerts: Alert[] = [];
  const basketAlerts: Alert[] = [];
  const snapshots: BasketSnapshot[] = [];

  const paused = await manager.paused();
  if (paused) {
    globalAlerts.push({ severity: "critical", code: "MANAGER_PAUSED", message: "BasketManager is paused" });
  }

  const nowSec = Math.floor(Date.now() / 1000);

  for (const basket of BASKETS) {
    const basketId = await getBasketId(manager, basket);
    const state = await manager.basketState(basketId);
    const config = await manager.basketConfig(basketId);

    const token = state.token;
    if (!token || token === ZERO_ADDRESS) {
      basketAlerts.push({
        severity: "critical",
        code: "TOKEN_MISSING",
        message: "Basket token address is not registered",
        basketKey: basket.key,
      });
      continue;
    }

    const navTimestamp = Number(state.navTimestamp);
    const stalenessThreshold = Number(config.stalenessThreshold);
    const navAgeSec = navTimestamp > 0 ? Math.max(0, nowSec - navTimestamp) : undefined;
    const navStale = navAgeSec === undefined ? true : navAgeSec > stalenessThreshold;

    if (navTimestamp === 0) {
      basketAlerts.push({
        severity: "warning",
        code: "NAV_NEVER_REFRESHED",
        message: "NAV timestamp is zero; refresh required",
        basketKey: basket.key,
      });
    } else if (navStale && navAgeSec !== undefined) {
      basketAlerts.push({
        severity: "critical",
        code: "NAV_STALE",
        message: `NAV age ${formatSeconds(navAgeSec)} exceeds threshold ${formatSeconds(stalenessThreshold)}`,
        basketKey: basket.key,
      });
    }

    const latestProofHash = state.latestProofHash as string;
    let proofConsumed = false;
    if (!latestProofHash || latestProofHash === ZERO_HASH) {
      basketAlerts.push({
        severity: "warning",
        code: "PROOF_MISSING",
        message: "No active reserve proof registered",
        basketKey: basket.key,
      });
    } else {
      proofConsumed = await manager.consumedProofs(latestProofHash);
      if (proofConsumed) {
        basketAlerts.push({
          severity: "warning",
          code: "PROOF_CONSUMED",
          message: "Latest proof hash already consumed; request new attestation",
          basketKey: basket.key,
        });
      }
    }

    snapshots.push({
      key: basket.key,
      token,
      navAgeSec: navAgeSec ?? 0,
      stalenessThreshold,
      navStale,
      latestProofHash,
      proofConsumed,
    });
  }

  return { globalAlerts, basketAlerts, snapshots };
}

async function main(): Promise<void> {
  const { network, webhookUrl, dryRun } = parseArgs();
  process.env.HARDHAT_NETWORK = network;

  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const { globalAlerts, basketAlerts, snapshots } = await buildSnapshots(managerAddress);
  const allAlerts = [...globalAlerts, ...basketAlerts];

  await postAlerts(webhookUrl, allAlerts, snapshots, dryRun);

  const criticalCount = allAlerts.filter((alert) => alert.severity === "critical").length;
  if (criticalCount > 0) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Monitoring check failed:", error);
    process.exitCode = 1;
  });
}

export { main };
