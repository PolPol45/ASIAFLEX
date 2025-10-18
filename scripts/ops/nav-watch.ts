#!/usr/bin/env node
import "dotenv/config";
import { runNavMonitor, type MonitorOptions } from "./nav-monitor";

function parseList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseInteger(value: string | undefined, label: string, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} deve essere un intero positivo (${value})`);
  }
  return parsed;
}

function parseArgs(argv: string[]): MonitorOptions {
  const envInterval = process.env.NAV_WATCH_INTERVAL_MS;
  const envJitter = process.env.NAV_WATCH_JITTER_MS;

  const options: MonitorOptions = {
    network: process.env.HARDHAT_NETWORK || "localhost",
    addressesPath: process.env.FEEDER_ADDRESSES,
    symbols: parseList(process.env.FEEDER_SYMBOLS),
    commit: process.env.FEEDER_COMMIT_FLAG === "1",
    intervalMs: parseInteger(envInterval, "NAV_WATCH_INTERVAL_MS", 300_000),
    jitterMs: parseInteger(envJitter, "NAV_WATCH_JITTER_MS", 0),
    once: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    switch (key) {
      case "help":
        printHelp();
        process.exit(0);
        break;
      case "network":
        options.network = argv[++i] ?? options.network;
        break;
      case "addresses":
        options.addressesPath = argv[++i];
        break;
      case "symbols":
        options.symbols = parseList(argv[++i]);
        break;
      case "commit":
        options.commit = true;
        break;
      case "dry":
        options.commit = false;
        break;
      case "interval":
        options.intervalMs = parseInteger(argv[++i], "--interval", options.intervalMs);
        break;
      case "jitter":
        options.jitterMs = parseInteger(argv[++i], "--jitter", options.jitterMs);
        break;
      case "once":
        options.once = true;
        break;
      case "force-timestamp": {
        const raw = argv[++i];
        if (!raw) {
          throw new Error("--force-timestamp richiede un valore (now|<unix>)");
        }
        options.forceTimestamp = raw === "now" ? "now" : `${Number.parseInt(raw, 10)}`;
        break;
      }
      case "advance-time":
        options.advanceTime = true;
        break;
      default:
        throw new Error(`Flag sconosciuta --${key}`);
    }
  }

  if (!options.commit) {
    console.warn("ℹ️  Esecuzione in modalità dry-run. Usa --commit per inviare gli aggiornamenti su-chain.");
  }

  return options;
}

function printHelp(): void {
  console.log("Usage: ts-node scripts/ops/nav-watch.ts [options]\n");
  console.log("Options:");
  console.log("  --network <name>       Hardhat network da usare (default: localhost)");
  console.log("  --addresses <path>     File indirizzi deployment (default: env/auto)");
  console.log("  --symbols a,b,c        Lista simboli da aggiornare (default: asset map)");
  console.log("  --interval <ms>        Intervallo tra cicli (default: 300000 ms)");
  console.log("  --jitter <ms>          Jitter random massimo per l'intervallo (default: 0)");
  console.log("  --commit               Invia gli aggiornamenti (default: dry-run)");
  console.log("  --dry                  Forza dry-run");
  console.log("  --once                 Esegue un solo ciclo e termina");
  console.log("  --force-timestamp v    Sovrascrive il timestamp (now|unix)");
  console.log("  --advance-time         Avanza il timestamp (solo localhost/hardhat)");
}

async function main() {
  let options: MonitorOptions;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    printHelp();
    process.exit(1);
    return;
  }

  await runNavMonitor(options);
}

main().catch((error) => {
  console.error("❌ nav-watch script failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
