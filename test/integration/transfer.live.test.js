"use strict";
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const helperPath = path_1.default.join(__dirname, "helpers", "run-transfer-cli.ts");
const ledgerPath = path_1.default.resolve(__dirname, "../../scripts/ops/ledger/transfers-hardhat.jsonl");
function runTransfer(mode, addressesPath) {
  const result = (0, child_process_1.spawnSync)(
    process.execPath,
    ["-r", "ts-node/register", helperPath, mode, addressesPath],
    {
      cwd: path_1.default.resolve(__dirname, "../../"),
      env: {
        ...process.env,
        HARDHAT_NETWORK: "hardhat",
        OPS_NO_PROMPT: "true",
        TS_NODE_TRANSPILE_ONLY: "true",
      },
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
    }
  );
  return result;
}
describe("transfer CLI live tracking", () => {
  it("supports dry-run and commits with ledger tracking", () => {
    if (fs_1.default.existsSync(ledgerPath)) {
      fs_1.default.unlinkSync(ledgerPath);
    }
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "transfer-cli-"));
    const addressesPath = path_1.default.join(tmpDir, "addresses.json");
    const dryResult = runTransfer("dry", addressesPath);
    (0, chai_1.expect)(dryResult.status, dryResult.stderr).to.equal(0);
    (0, chai_1.expect)(fs_1.default.existsSync(ledgerPath)).to.equal(false);
    const commitResult = runTransfer("commit", addressesPath);
    (0, chai_1.expect)(commitResult.status, commitResult.stderr).to.equal(0);
    const stdoutLines = commitResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    (0, chai_1.expect)(stdoutLines.length).to.be.greaterThan(0);
    const ledgerJsonLine = [...stdoutLines].reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
    (0, chai_1.expect)(ledgerJsonLine, `stdout:\n${commitResult.stdout}`).to.not.equal(undefined);
    const record = JSON.parse(ledgerJsonLine);
    (0, chai_1.expect)(record).to.include.keys(["eventSeen", "via", "amountWei", "from", "to", "txHash"]);
    (0, chai_1.expect)(record.eventSeen).to.equal(true);
    (0, chai_1.expect)(record.via === "wss" || record.via === "poll").to.equal(true);
    (0, chai_1.expect)(fs_1.default.existsSync(ledgerPath)).to.equal(true);
  });
});
