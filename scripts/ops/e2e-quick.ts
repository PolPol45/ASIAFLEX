import "dotenv/config";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { loadDeployment } from "./utils/deployments";

const REPORTS_DIR = resolve(process.cwd(), "reports");
const REPORTS_ARCHIVE_DIR = resolve(REPORTS_DIR, "archive");
const STEP_SEQUENCE = ["mint", "transfer", "redeem", "burn"] as const;
const ZERO_32 = `0x${"0".repeat(64)}`;
const ZERO_65 = `0x${"0".repeat(130)}`;

const DEFAULTS = {
  amountMint: "0.10",
  amountTransfer: "0.05",
  amountRedeem: "0.05",
  amountBurn: "0.02",
  gasMaxFeeGwei: process.env.GAS_MAX_FEE_GWEI ?? "15",
  gasPriorityFeeGwei: process.env.GAS_PRIORITY_FEE_GWEI ?? "1.5",
  network: process.env.HARDHAT_NETWORK ?? "sepolia",
  timeoutMs: Number.parseInt(process.env.E2E_TIMEOUT_MS ?? "600000", 10) || 600_000,
  addressesPath: process.env.E2E_ADDRESSES_PATH,
  recipient: process.env.E2E_RECIPIENT,
  mode: (process.env.E2E_MODE as Mode | undefined) ?? "proc",
};

type StepName = (typeof STEP_SEQUENCE)[number];
type Mode = "proc" | "direct";

type StepStatus = "OK" | "SKIPPED" | "ERROR";

type StepReport = {
  name: StepName;
  mode: Mode;
  status: StepStatus;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  stdout?: string;
  stderr?: string;
  error?: string;
};

type ReportPayload = {
  schema: "e2e_quick.v1";
  ts: string;
  network: string;
  commit: boolean;
  params: {
    steps: StepName[];
    label: string;
    recipient?: string;
    amounts: Record<StepName, string>;
    gas: {
      maxFeeGwei: string;
      priorityFeeGwei: string;
      maxFeeWei: string;
      priorityFeeWei: string;
    };
    timeoutMs: number;
    mode: Mode;
    addressesPath?: string;
  };
  overrides: {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  steps: StepReport[];
  status: StepStatus;
  error?: string;
};

type ParsedCLI = {
  commit: boolean;
  steps: StepName[];
  addressesPath?: string;
  recipient?: string;
  amountMint: string;
  amountTransfer: string;
  amountRedeem: string;
  amountBurn: string;
  gasMaxFeeGwei: string;
  gasPriorityFeeGwei: string;
  network: string;
  timeoutMs: number;
  label: string;
  mode: Mode;
};

function parseCLI(argv: string[]): ParsedCLI {
  const args = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const withoutDashes = token.slice(2);
    const eqIdx = withoutDashes.indexOf("=");
    if (eqIdx >= 0) {
      const key = withoutDashes.slice(0, eqIdx);
      const value = withoutDashes.slice(eqIdx + 1);
      args.set(key, value);
      continue;
    }

    const key = withoutDashes;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(key, next);
      i += 1;
    } else {
      args.set(key, true);
    }
  }

  const commit = Boolean(args.has("commit") || process.env.E2E_COMMIT === "1");
  const stepsRaw = (args.get("steps") as string | undefined) ?? STEP_SEQUENCE.join(",");
  const steps = stepsRaw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean) as StepName[];
  const unknownStep = steps.find((step) => !STEP_SEQUENCE.includes(step));
  if (unknownStep) {
    throw new Error(`Unknown step '${unknownStep}'. Allowed: ${STEP_SEQUENCE.join(",")}`);
  }

  return {
    commit,
    steps: steps.length > 0 ? steps : [...STEP_SEQUENCE],
    addressesPath: (args.get("addressesPath") as string | undefined) ?? DEFAULTS.addressesPath,
    recipient: (args.get("recipient") as string | undefined) ?? DEFAULTS.recipient,
    amountMint: (args.get("amountMint") as string | undefined) ?? DEFAULTS.amountMint,
    amountTransfer: (args.get("amountTransfer") as string | undefined) ?? DEFAULTS.amountTransfer,
    amountRedeem: (args.get("amountRedeem") as string | undefined) ?? DEFAULTS.amountRedeem,
    amountBurn: (args.get("amountBurn") as string | undefined) ?? DEFAULTS.amountBurn,
    gasMaxFeeGwei: (args.get("gasMaxFeeGwei") as string | undefined) ?? DEFAULTS.gasMaxFeeGwei,
    gasPriorityFeeGwei: (args.get("gasPriorityFeeGwei") as string | undefined) ?? DEFAULTS.gasPriorityFeeGwei,
    network: (args.get("network") as string | undefined) ?? DEFAULTS.network,
    timeoutMs: parsePositiveInt((args.get("timeoutMs") as string | undefined) ?? DEFAULTS.timeoutMs),
    label: (args.get("label") as string | undefined) ?? "auto",
    mode: normalizeMode((args.get("mode") as string | undefined) ?? DEFAULTS.mode),
  };
}

function parsePositiveInt(value: string | number): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${value}`);
  }
  return parsed;
}

function normalizeMode(raw: string): Mode {
  return raw === "direct" ? "direct" : "proc";
}

function formatArchiveLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}_${hour}-${minute}`;
}

async function ensureReportDirs(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
  await mkdir(REPORTS_ARCHIVE_DIR, { recursive: true });
}

function gweiDecimalToWei(value: string): bigint {
  if (!/^\d*(\.\d+)?$/.test(value)) {
    throw new Error(`Invalid gwei value '${value}'`);
  }
  const [wholeRaw, fractionRaw = ""] = value.split(".");
  const whole = wholeRaw.length > 0 ? wholeRaw : "0";
  const fractionPadded = `${fractionRaw}000000000`.slice(0, 9);
  const combined = `${whole}${fractionPadded}`.replace(/^0+(?=\d)/, "") || "0";
  return BigInt(combined);
}

function toSafeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function nowISO(): string {
  return new Date().toISOString();
}

function buildStepEnv(step: StepName, cli: ParsedCLI, treasuryAddress?: string): Record<string, string> {
  const base: Record<string, string> = {
    OPS_NO_PROMPT: "true",
    HARDHAT_NETWORK: cli.network,
    GAS_MAX_FEE_GWEI: cli.gasMaxFeeGwei,
    GAS_PRIORITY_FEE_GWEI: cli.gasPriorityFeeGwei,
  };

  if (cli.addressesPath) {
    const addressesPath = resolve(process.cwd(), cli.addressesPath);
    if (step === "transfer") {
      base.TRANSFER_ADDRESSES_PATH = addressesPath;
    } else if (step === "burn") {
      base.BURN_ADDRESSES_PATH = addressesPath;
    } else if (step === "mint") {
      base.MINT_ADDRESSES_PATH = addressesPath;
    }
  }

  const treasury = treasuryAddress ?? process.env.E2E_TREASURY_SIGNER;
  const recipient = cli.recipient ?? treasury;

  switch (step) {
    case "mint":
      return {
        ...base,
        MINT_SIGNER: treasury ?? "",
        MINT_TO: recipient ?? "",
        MINT_AMOUNT: cli.amountMint,
        MINT_ATTESTATION: ZERO_32,
        MINT_DRY_RUN: String(!cli.commit),
      };
    case "transfer":
      return {
        ...base,
        TRANSFER_FROM: treasury ?? "",
        TRANSFER_TO: recipient ?? "",
        TRANSFER_AMOUNT: cli.amountTransfer,
        TRANSFER_LEGACY: "true",
        TRANSFER_DRY_RUN: String(!cli.commit),
      };
    case "redeem":
      return {
        ...base,
        REDEEM_FROM: recipient ?? "",
        REDEEM_AMOUNT: cli.amountRedeem,
        REDEEM_RESERVE_HASH: ZERO_32,
        REDEEM_TIMESTAMP: Math.floor(Date.now() / 1000).toString(),
        REDEEM_SIGNATURE: ZERO_65,
        REDEEM_CALLER: treasury ?? "",
        REDEEM_DRY_RUN: String(!cli.commit),
      };
    case "burn":
      return {
        ...base,
        BURN_FROM: recipient ?? "",
        BURN_AMOUNT: cli.amountBurn,
        BURN_SIGNER: treasury ?? "",
        BURN_DRY_RUN: String(!cli.commit),
      };
    default:
      return base;
  }
}

function buildStepArgs(step: StepName, commit: boolean): string[] {
  const scriptPath = resolve(process.cwd(), `scripts/ops/${step}.ts`);
  const args = ["-r", require.resolve("ts-node/register/transpile-only"), scriptPath];
  if (!commit) {
    if (step === "mint" || step === "redeem" || step === "burn") {
      args.push("--dry-run");
    } else if (step === "transfer") {
      args.push("--dry-run");
      args.push("--legacy");
    }
  } else if (step === "transfer") {
    args.push("--legacy");
  }
  return args;
}

function runProcessStep(
  step: StepName,
  cli: ParsedCLI,
  treasuryAddress: string | undefined,
  timeoutMs: number
): StepReport {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const env = {
    ...process.env,
    ...buildStepEnv(step, cli, treasuryAddress),
  };

  const args = buildStepArgs(step, cli.commit);
  const child: SpawnSyncReturns<string> = spawnSync(process.execPath, args, {
    env,
    encoding: "utf8",
    stdio: "pipe",
    timeout: timeoutMs,
  });

  const ended = Date.now();
  const report: StepReport = {
    name: step,
    mode: "proc",
    status: child.status === 0 ? "OK" : "ERROR",
    startedAt,
    endedAt: new Date(ended).toISOString(),
    durationMs: ended - started,
    exitCode: child.status,
  };

  if (child.stdout) {
    report.stdout = child.stdout.slice(0, 2000);
  }
  if (child.stderr) {
    report.stderr = child.stderr.slice(0, 2000);
  }

  if (child.error) {
    report.error = child.error.message;
  } else if (child.status !== 0) {
    report.error = child.stderr || child.stdout;
  }

  return report;
}

async function runDirectStep(step: StepName): Promise<StepReport> {
  throw new Error(`Direct mode not implemented for step ${step}.`);
}

async function writeReport(payload: ReportPayload, label: string): Promise<void> {
  await ensureReportDirs();
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const mainPath = resolve(REPORTS_DIR, "e2e_quick.json");
  await writeFile(mainPath, serialized, "utf8");
  const snapshotDir = resolve(REPORTS_ARCHIVE_DIR, label);
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(resolve(snapshotDir, "e2e_quick.json"), serialized, "utf8");
}

async function main(): Promise<void> {
  const cli = parseCLI(process.argv.slice(2));
  const safeMode = (process.env.SAFE_MODE ?? "0") === "1";

  if (safeMode && cli.commit) {
    console.error("[SAFE_MODE] refusing to execute committing E2E flow");
    const label = toSafeLabel(cli.label === "auto" ? formatArchiveLabel(new Date()) : cli.label);
    const report: ReportPayload = {
      schema: "e2e_quick.v1",
      ts: nowISO(),
      network: cli.network,
      commit: cli.commit,
      params: {
        steps: cli.steps,
        label,
        recipient: cli.recipient,
        amounts: {
          mint: cli.amountMint,
          transfer: cli.amountTransfer,
          redeem: cli.amountRedeem,
          burn: cli.amountBurn,
        },
        gas: {
          maxFeeGwei: cli.gasMaxFeeGwei,
          priorityFeeGwei: cli.gasPriorityFeeGwei,
          maxFeeWei: "0",
          priorityFeeWei: "0",
        },
        timeoutMs: cli.timeoutMs,
        mode: cli.mode,
        addressesPath: cli.addressesPath,
      },
      overrides: {
        maxFeePerGas: "0",
        maxPriorityFeePerGas: "0",
      },
      steps: [],
      status: "ERROR",
      error: "SAFE_MODE active",
    };
    await writeReport(report, label);
    process.exit(1);
  }

  const label = toSafeLabel(cli.label === "auto" ? formatArchiveLabel(new Date()) : cli.label);
  const maxFeeWei = gweiDecimalToWei(cli.gasMaxFeeGwei);
  const priorityFeeWei = gweiDecimalToWei(cli.gasPriorityFeeGwei);

  console.log("[E2E] Execution parameters:");
  console.log(
    JSON.stringify(
      {
        commit: cli.commit,
        steps: cli.steps,
        network: cli.network,
        recipient: cli.recipient,
        addressesPath: cli.addressesPath,
        amounts: {
          mint: cli.amountMint,
          transfer: cli.amountTransfer,
          redeem: cli.amountRedeem,
          burn: cli.amountBurn,
        },
        gas: {
          maxFeeGwei: cli.gasMaxFeeGwei,
          priorityFeeGwei: cli.gasPriorityFeeGwei,
        },
        timeoutMs: cli.timeoutMs,
        mode: cli.mode,
        label,
      },
      null,
      2
    )
  );

  let treasuryAddress: string | undefined;
  try {
    const deployment = loadDeployment(cli.network);
    treasuryAddress =
      deployment?.config?.roles?.treasury?.[0] ??
      deployment?.BasketTreasuryController ??
      deployment?.addresses?.BasketTreasuryController;
  } catch (error) {
    console.warn("[E2E] Unable to load deployment snapshot:", error instanceof Error ? error.message : error);
  }

  const stepReports: StepReport[] = [];
  let overallStatus: StepStatus = "OK";
  let globalError: string | undefined;

  for (const step of STEP_SEQUENCE) {
    if (!cli.steps.includes(step)) {
      stepReports.push({
        name: step,
        mode: cli.mode,
        status: "SKIPPED",
        startedAt: nowISO(),
        endedAt: nowISO(),
        durationMs: 0,
        exitCode: null,
      });
      continue;
    }

    try {
      const report =
        cli.mode === "proc" ? runProcessStep(step, cli, treasuryAddress, cli.timeoutMs) : await runDirectStep(step);
      stepReports.push(report);
      if (report.status !== "OK") {
        overallStatus = "ERROR";
        globalError = report.error ?? `Step ${step} failed`;
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      stepReports.push({
        name: step,
        mode: cli.mode,
        status: "ERROR",
        startedAt: nowISO(),
        endedAt: nowISO(),
        durationMs: 0,
        exitCode: null,
        error: message,
      });
      overallStatus = "ERROR";
      globalError = message;
      break;
    }
  }

  const payload: ReportPayload = {
    schema: "e2e_quick.v1",
    ts: nowISO(),
    network: cli.network,
    commit: cli.commit,
    params: {
      steps: cli.steps,
      label,
      recipient: cli.recipient,
      amounts: {
        mint: cli.amountMint,
        transfer: cli.amountTransfer,
        redeem: cli.amountRedeem,
        burn: cli.amountBurn,
      },
      gas: {
        maxFeeGwei: cli.gasMaxFeeGwei,
        priorityFeeGwei: cli.gasPriorityFeeGwei,
        maxFeeWei: maxFeeWei.toString(),
        priorityFeeWei: priorityFeeWei.toString(),
      },
      timeoutMs: cli.timeoutMs,
      mode: cli.mode,
      addressesPath: cli.addressesPath,
    },
    overrides: {
      maxFeePerGas: maxFeeWei.toString(),
      maxPriorityFeePerGas: priorityFeeWei.toString(),
    },
    steps: stepReports,
    status: overallStatus,
  };

  if (globalError) {
    payload.error = globalError;
  }

  await writeReport(payload, label);

  if (overallStatus === "OK") {
    console.log("[E2E] Flow completed successfully.");
    process.exit(0);
  } else {
    console.error("[E2E] Flow failed:", globalError ?? "unknown error");
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error("[E2E] Fatal error:", error instanceof Error ? error.message : String(error));
  try {
    const cli = parseCLI(process.argv.slice(2));
    const label = toSafeLabel(cli.label === "auto" ? formatArchiveLabel(new Date()) : cli.label);
    const payload: ReportPayload = {
      schema: "e2e_quick.v1",
      ts: nowISO(),
      network: cli.network,
      commit: cli.commit,
      params: {
        steps: cli.steps,
        label,
        recipient: cli.recipient,
        amounts: {
          mint: cli.amountMint,
          transfer: cli.amountTransfer,
          redeem: cli.amountRedeem,
          burn: cli.amountBurn,
        },
        gas: {
          maxFeeGwei: cli.gasMaxFeeGwei,
          priorityFeeGwei: cli.gasPriorityFeeGwei,
          maxFeeWei: "0",
          priorityFeeWei: "0",
        },
        timeoutMs: cli.timeoutMs,
        mode: cli.mode,
        addressesPath: cli.addressesPath,
      },
      overrides: {
        maxFeePerGas: "0",
        maxPriorityFeePerGas: "0",
      },
      steps: [],
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
    await writeReport(payload, label);
  } catch (writeError) {
    console.error(
      "[E2E] Unable to persist failure report:",
      writeError instanceof Error ? writeError.message : writeError
    );
  }
  process.exit(1);
});
