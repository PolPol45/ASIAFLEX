/**
 * Operations History CLI
 * View and query the operations audit log
 */

import * as fs from "fs";
import * as path from "path";

interface Operation {
  type: string;
  timestamp: string;
  network: string;
  transaction?: {
    hash: string;
    blockNumber: number;
  };
  details: Record<string, unknown>;
}

/**
 * List all operations
 */
function listOperations(network?: string): Operation[] {
  const opsDir = path.join(process.cwd(), "scripts", "deployments", "operations");

  if (!fs.existsSync(opsDir)) {
    console.log("No operations directory found");
    return [];
  }

  const files = fs.readdirSync(opsDir).filter((f) => f.endsWith(".json"));

  const operations: Operation[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(opsDir, file), "utf-8");
      const op = JSON.parse(content) as Operation;

      // Filter by network if specified
      if (network && op.network !== network) {
        continue;
      }

      operations.push(op);
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  }

  // Sort by timestamp (newest first)
  operations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return operations;
}

/**
 * Display operations in a table format
 */
function displayOperations(operations: Operation[]): void {
  if (operations.length === 0) {
    console.log("No operations found");
    return;
  }

  console.log("\n📊 Operations History\n");
  console.log("─".repeat(120));
  console.log(
    `${"Type".padEnd(15)} | ${"Network".padEnd(12)} | ${"Timestamp".padEnd(25)} | ${"Tx Hash".padEnd(20)} | ${"Details"}`
  );
  console.log("─".repeat(120));

  for (const op of operations) {
    const type = op.type.padEnd(15);
    const network = op.network.padEnd(12);
    const timestamp = new Date(op.timestamp).toLocaleString().padEnd(25);
    const txHash = op.transaction?.hash ? op.transaction.hash.slice(0, 18) + "..." : "N/A".padEnd(20);

    // Extract key details
    let details = "";
    if (op.type === "mint" && op.details.to && op.details.amount) {
      details = `To: ${String(op.details.to).slice(0, 10)}... Amount: ${op.details.amount}`;
    } else if (op.type === "burn" && op.details.from && op.details.amount) {
      details = `From: ${String(op.details.from).slice(0, 10)}... Amount: ${op.details.amount}`;
    } else if (op.type === "transfer" && op.details.from && op.details.to && op.details.amount) {
      details = `${String(op.details.from).slice(0, 8)}→${String(op.details.to).slice(0, 8)} Amt: ${op.details.amount}`;
    } else {
      details = JSON.stringify(op.details).slice(0, 40);
    }

    console.log(`${type} | ${network} | ${timestamp} | ${txHash} | ${details}`);
  }

  console.log("─".repeat(120));
  console.log(`\nTotal operations: ${operations.length}\n`);
}

/**
 * Display detailed information about a specific operation
 */
function displayOperationDetails(op: Operation): void {
  console.log("\n" + "=".repeat(80));
  console.log(`📋 Operation Details`);
  console.log("=".repeat(80));
  console.log(`Type:        ${op.type}`);
  console.log(`Network:     ${op.network}`);
  console.log(`Timestamp:   ${new Date(op.timestamp).toLocaleString()}`);

  if (op.transaction) {
    console.log(`\nTransaction:`);
    console.log(`  Hash:      ${op.transaction.hash}`);
    console.log(`  Block:     ${op.transaction.blockNumber}`);
  }

  console.log(`\nDetails:`);
  console.log(JSON.stringify(op.details, null, 2));
  console.log("=".repeat(80) + "\n");
}

/**
 * Get operations statistics
 */
function getStatistics(operations: Operation[]): void {
  const stats: Record<string, number> = {};
  const networkStats: Record<string, number> = {};

  for (const op of operations) {
    stats[op.type] = (stats[op.type] || 0) + 1;
    networkStats[op.network] = (networkStats[op.network] || 0) + 1;
  }

  console.log("\n📈 Statistics\n");
  console.log("Operations by type:");
  for (const [type, count] of Object.entries(stats)) {
    console.log(`  ${type.padEnd(15)}: ${count}`);
  }

  console.log("\nOperations by network:");
  for (const [network, count] of Object.entries(networkStats)) {
    console.log(`  ${network.padEnd(15)}: ${count}`);
  }
  console.log();
}

/**
 * Main CLI logic
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "list";

  switch (command) {
    case "list": {
      const network = args.find((arg) => arg.startsWith("--network="))?.split("=")[1];
      const limit = parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "50");

      const operations = listOperations(network);
      displayOperations(operations.slice(0, limit));
      break;
    }

    case "stats": {
      const network = args.find((arg) => arg.startsWith("--network="))?.split("=")[1];
      const operations = listOperations(network);
      getStatistics(operations);
      break;
    }

    case "show": {
      const index = parseInt(args[1] || "0");
      const network = args.find((arg) => arg.startsWith("--network="))?.split("=")[1];
      const operations = listOperations(network);

      if (index < 0 || index >= operations.length) {
        console.error(`Invalid index. Must be between 0 and ${operations.length - 1}`);
        process.exit(1);
      }

      displayOperationDetails(operations[index]);
      break;
    }

    case "help":
    default: {
      console.log(`
AsiaFlex Operations History CLI

Usage: npx ts-node scripts/ops/history.ts <command> [options]

Commands:
  list              List all operations (default)
  stats             Show statistics
  show <index>      Show detailed information about a specific operation
  help              Show this help message

Options:
  --network=<name>  Filter by network (e.g., --network=localhost)
  --limit=<n>       Limit number of results (default: 50)

Examples:
  npx ts-node scripts/ops/history.ts list
  npx ts-node scripts/ops/history.ts list --network=localhost --limit=10
  npx ts-node scripts/ops/history.ts stats
  npx ts-node scripts/ops/history.ts show 0
      `);
      break;
    }
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
