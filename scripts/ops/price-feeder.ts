#!/usr/bin/env node
import execa from "execa";
import { runFeederCli } from "./price-feeder-main";

function extractNetwork(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--network" && argv[i + 1]) {
      return argv[i + 1];
    }
    if (arg.startsWith("--network=")) {
      return arg.split("=")[1];
    }
  }
  return process.env.HARDHAT_NETWORK || "hardhat";
}

async function delegateCommit(network: string, forwardedArgs: string[]): Promise<void> {
  let symbolsArg: string | undefined;
  let addressesArg: string | undefined;
  let forceTimestampArg: string | undefined;
  let advanceTime = false;

  for (let i = 0; i < forwardedArgs.length; i += 1) {
    const arg = forwardedArgs[i];

    if (arg === "--network") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--network=")) {
      continue;
    }
    if (arg === "--commit" || arg.startsWith("--commit")) {
      continue;
    }

    if (arg === "--symbols") {
      symbolsArg = forwardedArgs[++i];
      continue;
    }
    if (arg.startsWith("--symbols=")) {
      symbolsArg = arg.slice("--symbols=".length);
      continue;
    }

    if (arg === "--addresses") {
      addressesArg = forwardedArgs[++i];
      continue;
    }
    if (arg.startsWith("--addresses=")) {
      addressesArg = arg.slice("--addresses=".length);
      continue;
    }

    if (arg === "--force-timestamp") {
      forceTimestampArg = forwardedArgs[++i];
      continue;
    }
    if (arg.startsWith("--force-timestamp=")) {
      forceTimestampArg = arg.slice("--force-timestamp=".length);
      continue;
    }

    if (arg === "--advance-time" || arg.startsWith("--advance-time")) {
      advanceTime = true;
      continue;
    }
  }

  const execaArgs = ["hardhat", "run", "--network", network, "scripts/ops/price-feeder.ts"];

  if (symbolsArg) {
    execaArgs.push("--symbols", symbolsArg);
  }
  if (addressesArg) {
    execaArgs.push("--addresses", addressesArg);
  }
  if (forceTimestampArg) {
    execaArgs.push("--force-timestamp", forceTimestampArg);
  }
  if (advanceTime) {
    execaArgs.push("--advance-time");
  }

  execaArgs.push("--commit");

  await execa("npx", execaArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      FEEDER_COMMIT_DELEGATED: "1",
    },
  });

  process.exit(0);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const delegated = process.env.FEEDER_COMMIT_DELEGATED === "1";

  if (!argv.includes("--symbols") && process.env.FEEDER_SYMBOLS) {
    argv.push("--symbols", process.env.FEEDER_SYMBOLS);
  }
  if (!argv.includes("--addresses") && process.env.FEEDER_ADDRESSES) {
    argv.push("--addresses", process.env.FEEDER_ADDRESSES);
  }
  if (!argv.includes("--commit") && process.env.FEEDER_COMMIT_FLAG === "1") {
    argv.push("--commit");
  }

  const hasCommitFlag = argv.includes("--commit");

  if (hasCommitFlag && !delegated) {
    const network = extractNetwork(argv);
    await delegateCommit(network, argv);
    return;
  }

  if (delegated && !hasCommitFlag) {
    argv.push("--commit");
  }

  await runFeederCli(argv);
}

void main().catch((error) => {
  console.error("❌ price-feeder wrapper failed:", (error as Error).message ?? error);
  process.exitCode = 1;
});
