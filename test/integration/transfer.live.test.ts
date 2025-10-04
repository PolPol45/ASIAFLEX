import { expect } from "chai";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const helperPath = path.join(__dirname, "helpers", "run-transfer-cli.ts");
const ledgerPath = path.resolve(__dirname, "../../scripts/ops/ledger/transfers-hardhat.jsonl");

function runTransfer(mode: "dry" | "commit", addressesPath: string) {
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

describe("transfer CLI live tracking", () => {
  it("supports dry-run and commits with ledger tracking", () => {
    if (fs.existsSync(ledgerPath)) {
      fs.unlinkSync(ledgerPath);
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "transfer-cli-"));
    const addressesPath = path.join(tmpDir, "addresses.json");

    const dryResult = runTransfer("dry", addressesPath);
    expect(dryResult.status, dryResult.stderr).to.equal(0);
    expect(fs.existsSync(ledgerPath)).to.equal(false);

    const commitResult = runTransfer("commit", addressesPath);
    expect(commitResult.status, commitResult.stderr).to.equal(0);

    const stdoutLines = commitResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    expect(stdoutLines.length).to.be.greaterThan(0);

    const ledgerJsonLine = [...stdoutLines].reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
    expect(ledgerJsonLine, `stdout:\n${commitResult.stdout}`).to.not.equal(undefined);
    const record = JSON.parse(ledgerJsonLine as string);

    expect(record).to.include.keys(["eventSeen", "via", "amountWei", "from", "to", "txHash"]);
    expect(record.eventSeen).to.equal(true);
    expect(record.via === "wss" || record.via === "poll").to.equal(true);
    expect(fs.existsSync(ledgerPath)).to.equal(true);
  });
});
