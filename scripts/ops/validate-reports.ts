import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REPORTS_DIR = resolve(process.cwd(), "reports");
const PROVIDER_SET = new Set(["Yahoo", "Polygon", "Cache"]);
const ALLOWED_PATHS = new Set(["straight", "dashed", "inverse", "override-XAU"]);
const E2E_STEPS = new Set(["mint", "transfer", "redeem", "burn"]);
const E2E_MODES = new Set(["proc", "direct"]);
const E2E_STEP_STATUSES = new Set(["OK", "SKIPPED", "ERROR"]);

type ValidationResult = string | null;

type PlainRecord = Record<string, unknown>;

type ReportDescriptor = {
  file: string;
  validate: (payload: PlainRecord) => ValidationResult;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateInverseReport(payload: PlainRecord): ValidationResult {
  if (typeof payload.ts !== "string" || payload.ts.length === 0) {
    return "missing ts string";
  }
  if (payload.schema !== "inverse.v1") {
    return "schema must be inverse.v1";
  }
  if (!Array.isArray(payload.items)) {
    return "items must be an array";
  }

  for (const entry of payload.items) {
    if (typeof entry !== "object" || entry === null) {
      return "invalid item shape";
    }
    const item = entry as PlainRecord;
    if (typeof item.symbol !== "string" || item.symbol.length === 0) {
      return "item missing symbol";
    }
    const pathValue = item.path;
    if (typeof pathValue !== "string" || (!ALLOWED_PATHS.has(pathValue) && !pathValue.startsWith("override-"))) {
      return `invalid path for ${item.symbol}`;
    }
    if (!isFiniteNumber(item.providerPrice)) {
      return `invalid providerPrice for ${item.symbol}`;
    }
    if ("googlePrice" in item && item.googlePrice !== null && !isFiniteNumber(item.googlePrice)) {
      return `invalid googlePrice for ${item.symbol}`;
    }
    if ("diffPct" in item && item.diffPct !== null && !isFiniteNumber(item.diffPct)) {
      return `invalid diffPct for ${item.symbol}`;
    }
    if (typeof item.ok !== "boolean") {
      return `invalid ok flag for ${item.symbol}`;
    }
  }

  return null;
}

function validateRunReport(payload: PlainRecord): ValidationResult {
  if (typeof payload.ts !== "string" || payload.ts.length === 0) {
    return "missing ts string";
  }
  if (payload.schema !== "run.v1") {
    return "schema must be run.v1";
  }
  if (!isFiniteNumber(payload.updated)) {
    return "updated must be a number";
  }
  if (!isFiniteNumber(payload.skipped)) {
    return "skipped must be a number";
  }
  if (!isFiniteNumber(payload.fallbackUsed)) {
    return "fallbackUsed must be a number";
  }
  if (!isFiniteNumber(payload.checkerAlerts)) {
    return "checkerAlerts must be a number";
  }
  if ("fallbackRatio" in payload && !isFiniteNumber(payload.fallbackRatio)) {
    return "fallbackRatio must be a number";
  }
  if ("cycleMs" in payload && !isFiniteNumber(payload.cycleMs)) {
    return "cycleMs must be a number";
  }
  if ("avgDiffFx" in payload && !isFiniteNumber(payload.avgDiffFx)) {
    return "avgDiffFx must be a number";
  }
  if ("avgDiffXAU" in payload && !isFiniteNumber(payload.avgDiffXAU)) {
    return "avgDiffXAU must be a number";
  }
  if (typeof payload.symbols !== "object" || payload.symbols === null) {
    return "symbols must be an object";
  }
  if (!Array.isArray(payload.providerOrder)) {
    return "providerOrder must be an array";
  }
  const providerOrder = payload.providerOrder as unknown[];
  if (providerOrder.length !== PROVIDER_SET.size || providerOrder.some((value) => !PROVIDER_SET.has(String(value)))) {
    return "providerOrder mismatch";
  }
  if (typeof payload.byProvider !== "object" || payload.byProvider === null) {
    return "byProvider must be an object";
  }
  if ("providerRates" in payload) {
    if (typeof payload.providerRates !== "object" || payload.providerRates === null) {
      return "providerRates must be an object";
    }
    const providerRates = payload.providerRates as PlainRecord;
    for (const provider of providerOrder as string[]) {
      const rate = providerRates[provider];
      if (rate !== undefined && !isFiniteNumber(rate)) {
        return `invalid provider rate for ${provider}`;
      }
    }
  }

  const symbols = payload.symbols as PlainRecord;
  for (const [symbolKey, rawEntry] of Object.entries(symbols)) {
    if (rawEntry === null || typeof rawEntry !== "object") {
      return `invalid entry type for ${symbolKey}`;
    }
    const entry = rawEntry as PlainRecord;
    if (typeof entry.provider !== "string" || !PROVIDER_SET.has(entry.provider)) {
      return `invalid provider for ${symbolKey}`;
    }
    if (typeof entry.usedProvider !== "string" || !PROVIDER_SET.has(entry.usedProvider)) {
      return `invalid usedProvider for ${symbolKey}`;
    }
    if (!isFiniteNumber(entry.price)) {
      return `invalid price for ${symbolKey}`;
    }
    if ("googlePrice" in entry && entry.googlePrice !== null && !isFiniteNumber(entry.googlePrice)) {
      return `invalid googlePrice for ${symbolKey}`;
    }
    if ("diffPct" in entry && entry.diffPct !== null && !isFiniteNumber(entry.diffPct)) {
      return `invalid diffPct for ${symbolKey}`;
    }
    if (typeof entry.path !== "string" || (!ALLOWED_PATHS.has(entry.path) && !entry.path.startsWith("override-"))) {
      return `invalid path for ${symbolKey}`;
    }
  }

  return null;
}

const REPORTS: ReportDescriptor[] = [
  { file: "last_inverse.json", validate: validateInverseReport },
  { file: "last_run.json", validate: validateRunReport },
];

type ErrorWithCode = { code?: string };

function isErrorWithCode(value: unknown): value is ErrorWithCode {
  return Boolean(value && typeof value === "object" && "code" in value);
}

function validateE2EReport(payload: PlainRecord): ValidationResult {
  if (payload.schema !== "e2e_quick.v1") {
    return "schema must be e2e_quick.v1";
  }
  if (typeof payload.ts !== "string" || payload.ts.length === 0) {
    return "missing ts string";
  }
  if (typeof payload.network !== "string" || payload.network.length === 0) {
    return "missing network";
  }
  if (typeof payload.commit !== "boolean") {
    return "missing commit flag";
  }

  if (typeof payload.params !== "object" || payload.params === null) {
    return "params must be an object";
  }
  const params = payload.params as PlainRecord;
  if (!Array.isArray(params.steps) || params.steps.length === 0) {
    return "params.steps must be a non-empty array";
  }
  for (const step of params.steps) {
    if (typeof step !== "string" || !E2E_STEPS.has(step)) {
      return `invalid params.steps entry '${String(step)}'`;
    }
  }
  if (typeof params.label !== "string" || params.label.length === 0) {
    return "params.label must be a string";
  }
  if (
    "recipient" in params &&
    params.recipient !== undefined &&
    params.recipient !== null &&
    typeof params.recipient !== "string"
  ) {
    return "params.recipient must be a string";
  }
  if (typeof params.amounts !== "object" || params.amounts === null) {
    return "params.amounts must be an object";
  }
  const amounts = params.amounts as PlainRecord;
  for (const step of E2E_STEPS) {
    const value = amounts[step];
    if (typeof value !== "string" || value.length === 0) {
      return `invalid params.amounts.${step}`;
    }
  }
  if (typeof params.gas !== "object" || params.gas === null) {
    return "params.gas must be an object";
  }
  const gas = params.gas as PlainRecord;
  const gasKeys = ["maxFeeGwei", "priorityFeeGwei", "maxFeeWei", "priorityFeeWei"];
  for (const key of gasKeys) {
    const value = gas[key];
    if (typeof value !== "string" || value.length === 0) {
      return `invalid params.gas.${key}`;
    }
  }
  const timeout = params.timeoutMs;
  if (typeof timeout !== "number" || !Number.isFinite(timeout) || timeout <= 0) {
    return "params.timeoutMs must be a positive number";
  }
  if (typeof params.mode !== "string" || !E2E_MODES.has(params.mode)) {
    return "params.mode invalid";
  }
  if (
    "addressesPath" in params &&
    params.addressesPath !== undefined &&
    params.addressesPath !== null &&
    typeof params.addressesPath !== "string"
  ) {
    return "params.addressesPath must be a string";
  }

  if (typeof payload.overrides !== "object" || payload.overrides === null) {
    return "overrides must be an object";
  }
  const overrides = payload.overrides as PlainRecord;
  for (const key of ["maxFeePerGas", "maxPriorityFeePerGas"]) {
    const value = overrides[key];
    if (typeof value !== "string" || value.length === 0) {
      return `invalid overrides.${key}`;
    }
  }

  if (!Array.isArray(payload.steps)) {
    return "steps must be an array";
  }
  for (const rawStep of payload.steps) {
    if (typeof rawStep !== "object" || rawStep === null) {
      return "invalid step entry";
    }
    const step = rawStep as PlainRecord;
    if (typeof step.name !== "string" || !E2E_STEPS.has(step.name)) {
      return "invalid step.name";
    }
    if (typeof step.mode !== "string" || !E2E_MODES.has(step.mode)) {
      return "invalid step.mode";
    }
    if (typeof step.status !== "string" || !E2E_STEP_STATUSES.has(step.status)) {
      return "invalid step.status";
    }
    if (typeof step.startedAt !== "string" || step.startedAt.length === 0) {
      return "invalid step.startedAt";
    }
    if (typeof step.endedAt !== "string" || step.endedAt.length === 0) {
      return "invalid step.endedAt";
    }
    if (!isFiniteNumber(step.durationMs)) {
      return "invalid step.durationMs";
    }
    if (
      !("exitCode" in step) ||
      (step.exitCode !== null && (typeof step.exitCode !== "number" || !Number.isInteger(step.exitCode)))
    ) {
      return "invalid step.exitCode";
    }
    if ("stdout" in step && step.stdout !== undefined && step.stdout !== null && typeof step.stdout !== "string") {
      return "invalid step.stdout";
    }
    if ("stderr" in step && step.stderr !== undefined && step.stderr !== null && typeof step.stderr !== "string") {
      return "invalid step.stderr";
    }
    if ("error" in step && step.error !== undefined && step.error !== null && typeof step.error !== "string") {
      return "invalid step.error";
    }
  }

  if (typeof payload.status !== "string" || !E2E_STEP_STATUSES.has(payload.status)) {
    return "invalid status";
  }
  if (
    "error" in payload &&
    payload.error !== undefined &&
    payload.error !== null &&
    typeof payload.error !== "string"
  ) {
    return "invalid error";
  }

  return null;
}

async function validateReport(descriptor: ReportDescriptor): Promise<boolean> {
  const { file, validate } = descriptor;
  const location = resolve(REPORTS_DIR, file);
  try {
    const raw = await readFile(location, "utf8");
    const parsed = JSON.parse(raw) as PlainRecord;
    const error = validate(parsed);
    if (error) {
      console.error(`[REPORT:INVALID] ${file} ${error}`);
      return false;
    }
    console.log(`[REPORT:OK] ${file}`);
    return true;
  } catch (error) {
    const reason =
      isErrorWithCode(error) && error.code === "ENOENT"
        ? "file not found"
        : error instanceof Error
          ? error.message
          : String(error);
    console.error(`[REPORT:INVALID] ${file} ${reason}`);
    return false;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const includeE2E = argv.includes("--e2e");
  const toCheck = includeE2E ? [...REPORTS, { file: "e2e_quick.json", validate: validateE2EReport }] : REPORTS;
  const results = await Promise.all(toCheck.map((descriptor) => validateReport(descriptor)));
  if (results.some((success) => !success)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[REPORT:INVALID] unexpected ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
