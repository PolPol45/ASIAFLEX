import { expect } from "chai";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const helperPath = path.join(__dirname, "helpers", "run-mint-cli.ts");
const operationsDir = path.resolve(__dirname, "../../scripts/deployments/operations");

function runMint(mode: "dry" | "commit", addressesPath: string) {
  const result = spawnSync(process.execPath, ["-r", "ts-node/register", helperPath, mode, addressesPath], {
    cwd: path.resolve(__dirname, "../../"),
    env: {
      ...process.env,
      HARDHAT_NETWORK: "hardhat",
      OPS_NO_PROMPT: "true",
      TS_NODE_TRANSPILE_ONLY: "true",
    },
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  return result;
}

function listOperationFiles(): string[] {
  if (!fs.existsSync(operationsDir)) {
    return [];
  }
  return fs
    .readdirSync(operationsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(operationsDir, file))
    .sort();
}

describe("mint-basket CLI", () => {
  it("performs dry-run without side effects and commits successfully", () => {
    const beforeFiles = listOperationFiles();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mint-cli-"));
    const addressesPath = path.join(tmpDir, "addresses.json");

    const dryResult = runMint("dry", addressesPath);
    expect(dryResult.status, dryResult.stderr).to.equal(0);
    expect(listOperationFiles().length).to.equal(beforeFiles.length);

    const commitResult = runMint("commit", addressesPath);
    expect(commitResult.status, commitResult.stderr).to.equal(0);

    const afterFiles = listOperationFiles();
    expect(afterFiles.length).to.equal(beforeFiles.length + 1);
  });
});
