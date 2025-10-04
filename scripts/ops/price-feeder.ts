#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
require("ts-node/register");

(async () => {
  const { runFeederCli } = await import("./price-feeder-main");
  const argv = process.argv.slice(2);
  await runFeederCli(argv);
})();
