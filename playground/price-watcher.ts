import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface NAVRecord {
  timestamp: string;
  navValue: string;
  staleness: number;
  isStale: boolean;
  deviation?: string;
  previousValue?: string;
}

class PriceWatcher {
  private oracleAddress: string;
  private interval: number;
  private outDir: string;
  private csvPath: string;
  private running: boolean = false;

  constructor(oracleAddress: string, intervalSeconds: number = 30) {
    this.oracleAddress = oracleAddress;
    this.interval = intervalSeconds * 1000; // Convert to milliseconds
    this.outDir = path.join(__dirname, "out");
    this.csvPath = path.join(this.outDir, "price.csv");

    // Ensure output directory exists
    if (!fs.existsSync(this.outDir)) {
      fs.mkdirSync(this.outDir, { recursive: true });
    }

    // Initialize CSV file if it doesn't exist
    if (!fs.existsSync(this.csvPath)) {
      const header = "timestamp,navValue,staleness,isStale,deviation,previousValue\n";
      fs.writeFileSync(this.csvPath, header);
    }
  }

  async readNAV(): Promise<NAVRecord | null> {
    try {
      const oracle = await ethers.getContractAt("NAVOracleAdapter", this.oracleAddress);

      const [currentNAV, lastUpdateTimestamp] = await oracle.getNAV();
      const isStale = await oracle.isStale();

      const now = Math.floor(Date.now() / 1000);
      const staleness = now - Number(lastUpdateTimestamp);

      // Try to get previous value for deviation calculation
      let deviation: string | undefined;
      let previousValue: string | undefined;

      try {
        // Read last line from CSV to get previous value
        const csvContent = fs.readFileSync(this.csvPath, "utf8");
        const lines = csvContent.trim().split("\n");
        if (lines.length > 1) {
          const lastLine = lines[lines.length - 1];
          const fields = lastLine.split(",");
          if (fields.length >= 2) {
            previousValue = fields[1];
            const prevNAV = parseFloat(previousValue);
            const currentNAVFloat = parseFloat(ethers.formatEther(currentNAV));
            if (prevNAV > 0) {
              const deviationPercent = ((currentNAVFloat - prevNAV) / prevNAV) * 100;
              deviation = deviationPercent.toFixed(4);
            }
          }
        }
      } catch (error) {
        // Ignore errors when reading previous value
      }

      return {
        timestamp: new Date().toISOString(),
        navValue: ethers.formatEther(currentNAV),
        staleness,
        isStale,
        deviation,
        previousValue,
      };
    } catch (error) {
      console.error("❌ Error reading NAV:", error);
      return null;
    }
  }

  appendToCSV(record: NAVRecord): void {
    const csvLine = `${record.timestamp},${record.navValue},${record.staleness},${record.isStale},${record.deviation || ""},${record.previousValue || ""}\n`;
    fs.appendFileSync(this.csvPath, csvLine);
  }

  printTable(record: NAVRecord): void {
    const now = new Date().toLocaleTimeString();

    console.clear();
    console.log("🔮 AsiaFlex NAV Price Watcher");
    console.log("============================");
    console.log(`⏰ Last Update: ${now}`);
    console.log(`📍 Oracle: ${this.oracleAddress}`);
    console.log(`📄 CSV File: ${this.csvPath}`);
    console.log("");

    // Status indicators
    const staleStatus = record.isStale ? "🔴 STALE" : "🟢 FRESH";
    const deviationStatus = record.deviation
      ? Math.abs(parseFloat(record.deviation)) > 5
        ? "🔴 HIGH"
        : Math.abs(parseFloat(record.deviation)) > 2
          ? "🟡 MEDIUM"
          : "🟢 LOW"
      : "⚪ N/A";

    console.log("┌─────────────────────────────────────────────────────────┐");
    console.log("│                     CURRENT STATUS                     │");
    console.log("├─────────────────────────────────────────────────────────┤");
    console.log(`│ NAV Value:         $${record.navValue.padEnd(25)} │`);
    console.log(`│ Staleness:         ${record.staleness}s${" ".repeat(26 - record.staleness.toString().length)} │`);
    console.log(`│ Status:            ${staleStatus.padEnd(25)} │`);
    if (record.deviation) {
      console.log(`│ Deviation:         ${record.deviation}%${" ".repeat(24 - record.deviation.length)} │`);
      console.log(`│ Deviation Level:   ${deviationStatus.padEnd(25)} │`);
    }
    if (record.previousValue) {
      console.log(`│ Previous Value:    $${record.previousValue.padEnd(25)} │`);
    }
    console.log("└─────────────────────────────────────────────────────────┘");

    // Recent history (last 10 records)
    try {
      const csvContent = fs.readFileSync(this.csvPath, "utf8");
      const lines = csvContent.trim().split("\n");
      if (lines.length > 1) {
        console.log("\n📊 Recent History (Last 10 Records):");
        console.log("┌─────────────────────┬──────────────┬────────────┬────────────┐");
        console.log("│ Timestamp           │ NAV Value    │ Staleness  │ Status     │");
        console.log("├─────────────────────┼──────────────┼────────────┼────────────┤");

        const recentLines = lines.slice(-10).slice(1); // Skip header, get last 10
        recentLines.forEach((line) => {
          const fields = line.split(",");
          if (fields.length >= 4) {
            const timestamp = new Date(fields[0]).toLocaleTimeString();
            const navValue = `$${parseFloat(fields[1]).toFixed(4)}`;
            const staleness = `${fields[2]}s`;
            const status = fields[3] === "true" ? "🔴 STALE" : "🟢 FRESH";

            console.log(
              `│ ${timestamp.padEnd(19)} │ ${navValue.padEnd(12)} │ ${staleness.padEnd(10)} │ ${status.padEnd(10)} │`
            );
          }
        });
        console.log("└─────────────────────┴──────────────┴────────────┴────────────┘");
      }
    } catch (error) {
      // Ignore errors when displaying history
    }

    console.log(`\n🔄 Refreshing every ${this.interval / 1000}s... (Press Ctrl+C to stop)`);
  }

  async start(): Promise<void> {
    this.running = true;
    console.log(`🚀 Starting NAV price watcher for oracle: ${this.oracleAddress}`);
    console.log(`📊 Monitoring every ${this.interval / 1000} seconds`);
    console.log(`💾 Saving data to: ${this.csvPath}\n`);

    const watch = async () => {
      if (!this.running) return;

      const record = await this.readNAV();
      if (record) {
        this.appendToCSV(record);
        this.printTable(record);
      }

      if (this.running) {
        setTimeout(watch, this.interval);
      }
    };

    // Start watching
    await watch();
  }

  stop(): void {
    this.running = false;
    console.log("\n🛑 Price watcher stopped");
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: ts-node playground/price-watcher.ts <oracleAddress> [intervalSeconds]");
    console.log("Example: ts-node playground/price-watcher.ts 0x123...abc 30");
    process.exit(1);
  }

  const oracleAddress = args[0];
  const intervalSeconds = args.length > 1 ? parseInt(args[1]) : 30;

  if (!ethers.isAddress(oracleAddress)) {
    console.error("❌ Invalid oracle address:", oracleAddress);
    process.exit(1);
  }

  if (intervalSeconds < 5) {
    console.error("❌ Interval must be at least 5 seconds");
    process.exit(1);
  }

  const watcher = new PriceWatcher(oracleAddress, intervalSeconds);

  // Handle graceful shutdown
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
  main().catch((error) => {
    console.error("❌ Price watcher failed:", error);
    process.exitCode = 1;
  });
}

export { PriceWatcher };
