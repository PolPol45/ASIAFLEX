import "dotenv/config";
import { getAddress, isAddress, JsonRpcProvider } from "ethers";
import { BasketManager__factory } from "../../typechain-types";
import { BASKET_ID } from "./basketIds";

const BASKET_TARGETS = [
  { key: "EUFX", envName: "TOK_EUFX" },
  { key: "ASFX", envName: "TOK_ASFX" },
  { key: "EUBOND", envName: "TOK_EUBOND" },
  { key: "ASBOND", envName: "TOK_ASBOND" },
  { key: "EUASMIX", envName: "TOK_EUAS" },
] as const;

type BasketKey = (typeof BASKET_TARGETS)[number]["key"];

const NETWORK_RPC_ENV: Record<string, string> = {
  sepolia: "SEPOLIA_RPC_URL",
  mainnet: "MAINNET_RPC_URL",
  polygon: "POLYGON_RPC_URL",
  localhost: "LOCALHOST_RPC_URL",
};

interface CliArgs {
  readonly network: string;
}

interface TableRow {
  readonly key: string;
  readonly envName: string;
  readonly envValue: string;
  readonly onChain: string;
  readonly match: "OK" | "KO";
  readonly note?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let network = process.env.HARDHAT_NETWORK || "sepolia";

  for (let idx = 0; idx < args.length; idx += 1) {
    const current = args[idx];
    if (current === "--network" && idx + 1 < args.length) {
      network = args[idx + 1];
      idx += 1;
    }
  }

  return { network };
}

function resolveRpc(network: string): string {
  const envVar = NETWORK_RPC_ENV[network] ?? "SEPOLIA_RPC_URL";
  const rpc = process.env[envVar];
  if (!rpc) {
    throw new Error(`Missing RPC URL for network ${network}. Set ${envVar}.`);
  }
  return rpc;
}

function normalizeAddress(address?: string | null): string | undefined {
  if (!address) {
    return undefined;
  }
  if (!isAddress(address)) {
    return undefined;
  }
  return getAddress(address);
}

function printTable(rows: TableRow[]): void {
  const header = ["Key", "Env", "Env Value", "On-Chain", "Match"];
  const widths = header.map((h) => h.length);

  const updateWidths = (values: string[]): void => {
    values.forEach((value, index) => {
      if (value.length > widths[index]) {
        widths[index] = value.length;
      }
    });
  };

  rows.forEach((row) => {
    updateWidths([row.key, row.envName, row.envValue, row.onChain, row.match]);
  });

  const draw = (values: string[]): string => values.map((value, index) => value.padEnd(widths[index], " ")).join("  ");

  console.log(draw(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  rows.forEach((row) => {
    console.log(draw([row.key, row.envName, row.envValue, row.onChain, row.match]));
  });
}

async function fetchOnChain(managerAddress: string, network: string): Promise<TableRow[]> {
  const rpcUrl = resolveRpc(network);
  const provider = new JsonRpcProvider(rpcUrl);
  await provider.getNetwork();

  const rows: TableRow[] = [];
  const managerEnv = process.env.BASKET_MANAGER ?? "";
  const normalizedManager = normalizeAddress(managerEnv);

  rows.push({
    key: "MANAGER",
    envName: "BASKET_MANAGER",
    envValue: managerEnv || "(missing)",
    onChain: normalizedManager ?? "(invalid)",
    match: normalizedManager ? "OK" : "KO",
    note: normalizedManager ? undefined : "Manager env missing or invalid",
  });

  if (!normalizedManager) {
    return rows;
  }

  const manager = BasketManager__factory.connect(normalizedManager, provider);

  for (const entry of BASKET_TARGETS) {
    const key = entry.key as BasketKey;
    const envName = entry.envName;
    const envValue = process.env[envName] ?? "";
    const normalizedEnv = normalizeAddress(envValue);
    let onChain = "(not registered)";
    let match: "OK" | "KO" = "KO";
    let note: string | undefined;

    try {
      const id = BASKET_ID[key as keyof typeof BASKET_ID];
      const state = await manager.basketState(id);
      const onChainAddress = state.token as string;
      if (onChainAddress && onChainAddress !== "0x0000000000000000000000000000000000000000") {
        const normalizedOnChain = getAddress(onChainAddress);
        onChain = normalizedOnChain;
        if (!normalizedEnv) {
          note = `Set ${envName} to ${normalizedOnChain}`;
        } else if (normalizedEnv === normalizedOnChain) {
          match = "OK";
        } else {
          note = `Env ${envName} differs. On-chain: ${normalizedOnChain}`;
        }
      } else {
        onChain = "0x0000000000000000000000000000000000000000";
        note = "Basket not registered";
      }
    } catch (error) {
      note = `Error fetching on-chain state: ${(error as Error).message}`;
    }

    if (match === "KO" && !note && !normalizedEnv) {
      note = `Set ${envName}`;
    }

    rows.push({
      key,
      envName,
      envValue: envValue || "(missing)",
      onChain,
      match,
      note,
    });
  }

  return rows;
}

async function main(): Promise<void> {
  const { network } = parseArgs();
  const managerEnv = process.env.BASKET_MANAGER ?? "";
  const rows = await fetchOnChain(managerEnv, network);
  printTable(rows);

  const mismatches = rows.filter((row) => row.match === "KO");
  if (mismatches.length > 0) {
    console.log("\n⚠️  Address mismatches detected:");
    for (const row of mismatches) {
      if (row.note) {
        console.log(` - ${row.key}: ${row.note}`);
      }
    }
    console.log("Aggiorna TOK_* o ricrea basket; vedi address on-chain sopra.");
    process.exitCode = 1;
  } else {
    console.log("\n✅ All addresses match on-chain state.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("resolve-addresses failed:", error);
    process.exitCode = 1;
  });
}

export { main };
