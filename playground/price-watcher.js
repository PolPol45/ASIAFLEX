// playground/price-watcher.js
// Simple NAV watcher: legge NAV da NAVOracleAdapter, lo salva in CSV e stampa una tabella live.

import hardhat from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { NAVOracleAdapter__factory } from "../typechain-types/factories/contracts/NAVOracleAdapter__factory";

const { ethers } = hardhat;

/**
 * @typedef {Object} NavRecord
 * @property {string} timestamp
 * @property {string} navValue
 * @property {number} staleness
 * @property {boolean} isStale
 * @property {string=} deviation
 * @property {string=} previousValue
 */

export class PriceWatcher {
  constructor(oracleAddress, basketInput, intervalSeconds = 30) {
    this.running = false;
    this.oracleAddress = oracleAddress;
    this.oracle = NAVOracleAdapter__factory.connect(oracleAddress, hardhat.ethers.provider);

    if (basketInput.startsWith("0x")) {
      this.basketId = basketInput;
      this.basketLabel = basketInput;
    } else {
      this.basketId = ethers.keccak256(ethers.toUtf8Bytes(basketInput));
      this.basketLabel = `${basketInput} (${this.basketId})`;
    }

    this.interval = Math.max(5, intervalSeconds) * 1000; // ms, minimo 5s
    this.outDir = path.join(__dirname, "out");
    this.csvPath = path.join(this.outDir, "price.csv");

    if (!fs.existsSync(this.outDir)) fs.mkdirSync(this.outDir, { recursive: true });
    if (!fs.existsSync(this.csvPath)) {
      const header = "timestamp,navValue,staleness,isStale,deviation,previousValue\n";
      fs.writeFileSync(this.csvPath, header, "utf8");
    }
  }

  readLastCsvValue() {
    try {
      const csvContent = fs.readFileSync(this.csvPath, "utf8");
      const lines = csvContent.trim().split("\n");
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const fields = lastLine.split(",");
        if (fields.length >= 2) return fields[1];
      }
    } catch {
      /* noop: nessun valore precedente disponibile */
    }
    return undefined;
  }

  async readNAV() {
    try {
      const observation = await this.oracle.getObservation(this.basketId);
      // observation.nav è un BigInt
      if (observation.nav === 0n) return null;

      const now = Math.floor(Date.now() / 1000);
      const staleness = now - Number(observation.timestamp);
      const stalenessThreshold = Number(observation.stalenessThreshold);
      const isStale = stalenessThreshold !== 0 && staleness > stalenessThreshold;

      // Deviation rispetto all'ultimo valore nel CSV
      let deviation;
      const previousValue = this.readLastCsvValue();
      if (previousValue) {
        const prev = parseFloat(previousValue);
        const curr = parseFloat(ethers.formatEther(observation.nav));
        if (prev > 0) deviation = (((curr - prev) / prev) * 100).toFixed(4);
      }

      return {
        timestamp: new Date().toISOString(),
        navValue: ethers.formatEther(observation.nav),
        staleness,
        isStale,
        deviation,
        previousValue,
      };
    } catch (error) {
      // Mantieni il watcher vivo: logga e continua
      // eslint-disable-next-line no-console
      console.error("❌ Error reading NAV:", error);
      return null;
    }
  }

  appendToCSV(record) {
    const csvLine = `${record.timestamp},${record.navValue},${record.staleness},${record.isStale},${record.deviation ?? ""},${record.previousValue ?? ""}\n`;
    fs.appendFileSync(this.csvPath, csvLine, "utf8");
  }

  printTable(record) {
    const nowStr = new Date().toLocaleTimeString();
    // pulizia console è intenzionale
    // eslint-disable-next-line no-console
    console.clear();
    // eslint-disable-next-line no-console
    console.log("🔮 AsiaFlex NAV Price Watcher");
    // eslint-disable-next-line no-console
    console.log("============================");
    // eslint-disable-next-line no-console
    console.log(`⏰ Last Update: ${nowStr}`);
    // eslint-disable-next-line no-console
    console.log(`📍 Oracle: ${this.oracleAddress}`);
    // eslint-disable-next-line no-console
    console.log(`🧺 Basket: ${this.basketLabel}`);
    // eslint-disable-next-line no-console
    console.log(`📄 CSV File: ${this.csvPath}\n`);

    const staleStatus = record.isStale ? "🔴 STALE" : "🟢 FRESH";
    const devAbs = record.deviation ? Math.abs(parseFloat(record.deviation)) : 0;
    const deviationStatus = record.deviation
      ? devAbs > 5
        ? "🔴 HIGH"
        : devAbs > 2
          ? "🟡 MEDIUM"
          : "🟢 LOW"
      : "⚪ N/A";

    // eslint-disable-next-line no-console
    console.log("┌─────────────────────────────────────────────────────────┐");
    // eslint-disable-next-line no-console
    console.log("│                     CURRENT STATUS                     │");
    // eslint-disable-next-line no-console
    console.log("├─────────────────────────────────────────────────────────┤");
    // eslint-disable-next-line no-console
    console.log(`│ NAV Value:         $${record.navValue.padEnd(25)} │`);
    // eslint-disable-next-line no-console
    console.log(`│ Staleness:         ${record.staleness}s${" ".repeat(26 - record.staleness.toString().length)} │`);
    // eslint-disable-next-line no-console
    console.log(`│ Status:            ${staleStatus.padEnd(25)} │`);
    if (record.deviation) {
      // eslint-disable-next-line no-console
      console.log(`│ Deviation:         ${record.deviation}%${" ".repeat(24 - record.deviation.length)} │`);
      // eslint-disable-next-line no-console
      console.log(`│ Deviation Level:   ${deviationStatus.padEnd(25)} │`);
    }
    if (record.previousValue) {
      // eslint-disable-next-line no-console
      console.log(`│ Previous Value:    $${record.previousValue.padEnd(25)} │`);
    }
    // eslint-disable-next-line no-console
    console.log("└─────────────────────────────────────────────────────────┘");

    // Storico recente
    try {
      const csvContent = fs.readFileSync(this.csvPath, "utf8");
      const lines = csvContent.trim().split("\n");
      if (lines.length > 1) {
        // eslint-disable-next-line no-console
        console.log("\n📊 Recent History (Last 10 Records):");
        // eslint-disable-next-line no-console
        console.log("┌─────────────────────┬──────────────┬────────────┬────────────┐");
        // eslint-disable-next-line no-console
        console.log("│ Timestamp           │ NAV Value    │ Staleness  │ Status     │");
        // eslint-disable-next-line no-console
        console.log("├─────────────────────┼──────────────┼────────────┼────────────┤");
        const recentLines = lines.slice(-10).slice(1); // salta header, prendi ultimi 10
        for (const line of recentLines) {
          const fields = line.split(",");
          if (fields.length >= 4) {
            const ts = new Date(fields[0]).toLocaleTimeString();
            const nav = `$${Number.parseFloat(fields[1]).toFixed(4)}`;
            const st = `${fields[2]}s`;
            const status = fields[3] === "true" ? "🔴 STALE" : "🟢 FRESH";
            // eslint-disable-next-line no-console
            console.log(`│ ${ts.padEnd(19)} │ ${nav.padEnd(12)} │ ${st.padEnd(10)} │ ${status.padEnd(10)} │`);
          }
        }
        // eslint-disable-next-line no-console
        console.log("└─────────────────────┴──────────────┴────────────┴────────────┘");
      }
    } catch {
      /* noop: best-effort render dello storico */
    }

    // eslint-disable-next-line no-console
    console.log(`\n🔄 Refreshing every ${this.interval / 1000}s... (Press Ctrl+C to stop)`);
  }

  async start() {
    this.running = true;
    // eslint-disable-next-line no-console
    console.log(`🚀 Starting NAV price watcher for oracle: ${this.oracleAddress}`);
    // eslint-disable-next-line no-console
    console.log(`🧺 Tracking basket: ${this.basketLabel}`);
    // eslint-disable-next-line no-console
    console.log(`📊 Monitoring every ${this.interval / 1000} seconds`);
    // eslint-disable-next-line no-console
    console.log(`💾 Saving data to: ${this.csvPath}\n`);

    const tick = async () => {
      if (!this.running) return;
      const record = await this.readNAV();
      if (record) {
        this.appendToCSV(record);
        this.printTable(record);
      }
      if (this.running) setTimeout(tick, this.interval);
    };

    await tick();
  }

  stop() {
    this.running = false;
    // eslint-disable-next-line no-console
    console.log("\n🛑 Price watcher stopped");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    // eslint-disable-next-line no-console
    console.log("Usage: ts-node playground/price-watcher.ts <oracleAddress> <basketSymbolOrId> [intervalSeconds]");
    // eslint-disable-next-line no-console
    console.log("Example: ts-node playground/price-watcher.ts 0xOracleAddr EUFX 30");
    process.exit(1);
  }

  const oracleAddress = args[0];
  const basketInput = args[1];
  const intervalSeconds = args.length > 2 ? Number.parseInt(args[2], 10) : 30;

  if (!ethers.isAddress(oracleAddress)) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid oracle address:", oracleAddress);
    process.exit(1);
  }
  if (Number.isNaN(intervalSeconds) || intervalSeconds < 5) {
    // eslint-disable-next-line no-console
    console.error("❌ Interval must be at least 5 seconds");
    process.exit(1);
  }

  const watcher = new PriceWatcher(oracleAddress, basketInput, intervalSeconds);

  process.on("SIGINT", () => {
    watcher.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    watcher.stop();
    process.exit(0);
  });

  await watcher.start();
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("❌ Price watcher failed:", error);
    process.exitCode = 1;
  });
}
