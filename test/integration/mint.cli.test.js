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
const helperPath = path_1.default.join(__dirname, "helpers", "run-mint-cli.ts");
const operationsDir = path_1.default.resolve(__dirname, "../../scripts/deployments/operations");
function runMint(mode, addressesPath) {
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
function listOperationFiles() {
  if (!fs_1.default.existsSync(operationsDir)) {
    return [];
  }
  return fs_1.default
    .readdirSync(operationsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path_1.default.join(operationsDir, file))
    .sort();
}
describe("mint-basket CLI", () => {
  it("performs dry-run without side effects and commits successfully", () => {
    const beforeFiles = listOperationFiles();
    const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "mint-cli-"));
    const addressesPath = path_1.default.join(tmpDir, "addresses.json");
    const dryResult = runMint("dry", addressesPath);
    (0, chai_1.expect)(dryResult.status, dryResult.stderr).to.equal(0);
    (0, chai_1.expect)(listOperationFiles().length).to.equal(beforeFiles.length);
    const commitResult = runMint("commit", addressesPath);
    (0, chai_1.expect)(commitResult.status, commitResult.stderr).to.equal(0);
    const afterFiles = listOperationFiles();
    (0, chai_1.expect)(afterFiles.length).to.equal(beforeFiles.length + 1);
  });
});
