import "dotenv/config";
import fs from "fs";
import path from "path";
import { ethers } from "hardhat";
import type { BasketManager, BasketToken, NAVOracleAdapter } from "../../typechain-types";
import { BASKETS, basketKey, type BasketDescriptor } from "../deploy/basketDescriptors";
import { loadAddresses, saveAddress } from "../helpers/addresses";
import { loadBasketDeployment, type BasketDeployment } from "./utils/baskets";

type ParsedArgs = { _: string[]; [key: string]: string | boolean | string[] };
type Hex32String = `0x${string}`;

type BasketTarget = {
  basketId: Hex32String;
  descriptor?: BasketDescriptor;
};

type BasketReport = {
  basketId: Hex32String;
  symbol?: string;
  name?: string;
  tokenAddress?: string;
  decimals?: number;
  totalSupply?: bigint;
  nav?: bigint;
  navTimestamp?: number;
  navStaleness?: number;
  isStale?: boolean;
  totalValueUsd?: number;
  error?: string;
};

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }

    const trimmed = arg.slice(2);
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex >= 0) {
      const key = trimmed.slice(0, eqIndex);
      parsed[key] = trimmed.slice(eqIndex + 1);
      continue;
    }

    const key = trimmed;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function pickStringArg(args: ParsedArgs, keys: string[], envKeys: string[] = []): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  for (const env of envKeys) {
    const envValue = process.env[env];
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim();
    }
  }
  return undefined;
}

function hasFlag(args: ParsedArgs, keys: string[], envKeys: string[] = []): boolean {
  for (const key of keys) {
    if (args[key] === true) {
      return true;
    }
  }
  for (const env of envKeys) {
    const envValue = process.env[env];
    if (envValue && TRUE_VALUES.has(envValue.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function normalizeBasketId(candidate: string | undefined, label: string): Hex32String {
  if (!candidate) {
    throw new Error(`${label} non specificato.`);
  }
  const prefixed = candidate.startsWith("0x") ? candidate : `0x${candidate}`;
  if (!ethers.isHexString(prefixed, 32)) {
    throw new Error(`${label} deve essere un bytes32 valido (ricevuto: ${candidate}).`);
  }
  return prefixed as Hex32String;
}

function computeBasketId(descriptor: BasketDescriptor): Hex32String {
  return ethers.keccak256(ethers.toUtf8Bytes(basketKey(descriptor))) as Hex32String;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function tryLoadSnapshot(
  networkName: string,
  chainId: bigint,
  overridePath?: string
): { snapshot?: BasketDeployment; snapshotPath?: string } {
  if (overridePath) {
    const resolved = path.resolve(overridePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Snapshot personalizzato non trovato: ${resolved}`);
    }
    const data = JSON.parse(fs.readFileSync(resolved, "utf8")) as BasketDeployment;
    return { snapshot: data, snapshotPath: resolved };
  }

  try {
    const snapshot = loadBasketDeployment(networkName, chainId);
    return { snapshot };
  } catch {
    return {};
  }
}

function deriveTargets(args: ParsedArgs, snapshot?: BasketDeployment): BasketTarget[] {
  const symbolsArg = pickStringArg(args, ["basket", "baskets", "basket-symbol"], ["NAV_BASKET", "NAV_SYMBOL"]);
  const basketSymbols = parseList(symbolsArg);
  const basketIds = parseList(pickStringArg(args, ["basket-id", "basket-ids"], ["NAV_BASKET_ID"]));
  const positional = Array.isArray(args._) ? (args._ as string[]) : [];
  if (positional.length > 0 && basketSymbols.length === 0 && basketIds.length === 0) {
    basketSymbols.push(...positional);
  }

  const targets = new Map<string, BasketTarget>();

  for (const symbol of basketSymbols) {
    const descriptor =
      BASKETS.find((entry) => entry.symbol.toLowerCase() === symbol.toLowerCase()) ??
      BASKETS.find((entry) => basketKey(entry).toLowerCase() === symbol.toLowerCase());
    if (descriptor) {
      targets.set(computeBasketId(descriptor), { basketId: computeBasketId(descriptor), descriptor });
      continue;
    }
    if (ethers.isHexString(symbol, 32)) {
      const normalized = symbol.startsWith("0x") ? symbol : `0x${symbol}`;
      targets.set(normalized.toLowerCase(), { basketId: normalized as Hex32String });
    } else {
      console.warn(`⚠️  Basket sconosciuto: ${symbol}`);
    }
  }

  for (const idCandidate of basketIds) {
    try {
      const normalized = normalizeBasketId(idCandidate, "BasketId");
      targets.set(normalized.toLowerCase(), { basketId: normalized });
    } catch (error) {
      console.warn(`⚠️  BasketId non valido (${idCandidate}):`, error instanceof Error ? error.message : error);
    }
  }

  if (targets.size === 0) {
    for (const descriptor of BASKETS) {
      const basketId = computeBasketId(descriptor);
      targets.set(basketId, { basketId, descriptor });
    }
  }

  if (snapshot?.baskets) {
    for (const basket of snapshot.baskets) {
      const idValue = typeof basket.basketId === "string" ? basket.basketId : String(basket.basketId);
      if (ethers.isHexString(idValue, 32)) {
        const normalized = (idValue.startsWith("0x") ? idValue : `0x${idValue}`) as Hex32String;
        if (!targets.has(normalized.toLowerCase())) {
          targets.set(normalized.toLowerCase(), { basketId: normalized });
        }
      }
    }
  }

  return Array.from(targets.values());
}

async function inspectBasket(
  manager: BasketManager,
  navOracle: NAVOracleAdapter,
  target: BasketTarget,
  snapshot?: BasketDeployment
): Promise<BasketReport> {
  const report: BasketReport = {
    basketId: target.basketId,
    symbol: target.descriptor?.symbol,
    name: target.descriptor?.name,
  };

  try {
    const tokenAddress = await manager.basketTokenOf(target.basketId);
    report.tokenAddress = tokenAddress;
    if (tokenAddress === ethers.ZeroAddress) {
      report.error = "Basket registrato senza token";
      return report;
    }

    const token = (await ethers.getContractAt("BasketToken", tokenAddress)) as BasketToken;
    const [tokenSymbol, tokenName, decimals, totalSupply] = await Promise.all([
      token.symbol(),
      token.name(),
      token.decimals(),
      token.totalSupply(),
    ]);

    report.symbol = report.symbol ?? tokenSymbol;
    report.name = report.name ?? tokenName;
    report.decimals = Number(decimals);
    report.totalSupply = totalSupply;

    const observation = await navOracle.getObservation(target.basketId);
    const nav = observation.nav ?? observation[0];
    const timestamp = Number(observation.timestamp ?? observation[1] ?? 0n);
    const staleness = Number(observation.stalenessThreshold ?? observation[2] ?? 0n);

    if (nav && nav > 0n) {
      report.nav = nav;
      report.navTimestamp = timestamp;
      report.navStaleness = staleness;
      const now = Math.floor(Date.now() / 1000);
      report.isStale = staleness !== 0 && timestamp !== 0 ? now - timestamp > staleness : false;

      const supplyFloat = Number(ethers.formatUnits(totalSupply, Number(decimals)));
      const navFloat = Number(ethers.formatUnits(nav, 18));
      report.totalValueUsd =
        Number.isFinite(supplyFloat) && Number.isFinite(navFloat) ? supplyFloat * navFloat : undefined;
    } else {
      report.error = "NAV non disponibile";
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
  }

  if (!report.name && snapshot?.baskets) {
    const fallback = snapshot.baskets.find((entry) => {
      if (typeof entry.basketId === "string") {
        return entry.basketId.toLowerCase() === report.basketId.toLowerCase();
      }
      return false;
    });
    if (fallback) {
      report.name = fallback.name;
      report.symbol = report.symbol ?? fallback.symbol;
    }
  }

  return report;
}

function formatReport(report: BasketReport): void {
  console.log("\n────────────────────────────────────────────────");
  console.log(`🧺 Basket ${report.symbol ?? "?"} (${report.basketId})`);
  if (report.name) {
    console.log(`   Nome:          ${report.name}`);
  }
  if (report.tokenAddress) {
    console.log(`   Token:         ${report.tokenAddress}`);
  }
  if (report.decimals !== undefined) {
    console.log(`   Decimals:      ${report.decimals}`);
  }
  if (report.totalSupply !== undefined && report.decimals !== undefined) {
    console.log(`   Total supply:  ${ethers.formatUnits(report.totalSupply, report.decimals)}`);
  }
  if (report.nav !== undefined) {
    console.log(`   NAV per share: ${Number(ethers.formatUnits(report.nav, 18)).toFixed(4)} USD`);
  }
  if (report.totalValueUsd !== undefined) {
    console.log(`   TVL stimato:   $${report.totalValueUsd.toFixed(2)}`);
  }
  if (report.navTimestamp) {
    const iso = new Date(report.navTimestamp * 1000).toISOString();
    console.log(`   Ultimo NAV:    ${iso}`);
  }
  if (report.navStaleness) {
    console.log(`   Stalenza max:  ${Math.round(report.navStaleness / 60)} minuti`);
  }
  if (report.isStale !== undefined) {
    console.log(`   È stantio?:    ${report.isStale ? "⚠️  sì" : "✅ no"}`);
  }
  if (report.error) {
    console.log(`   Errore:        ${report.error}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const addressesOverride = pickStringArg(args, ["addresses"], ["NAV_ADDRESSES_PATH"]);
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkLabel, addressesOverride);

  const snapshotOverride = pickStringArg(args, ["snapshot"], ["NAV_SNAPSHOT_PATH"]);
  const { snapshot, snapshotPath } = tryLoadSnapshot(networkLabel, network.chainId, snapshotOverride);

  const managerCandidate =
    pickStringArg(args, ["manager"], ["NAV_MANAGER"]) ?? addresses.contracts?.BasketManager ?? snapshot?.manager;
  const navOracleCandidate =
    pickStringArg(args, ["nav-oracle", "oracle"], ["NAV_ORACLE"]) ??
    addresses.contracts?.NAVOracleAdapter ??
    snapshot?.navOracle ??
    snapshot?.oracle;

  if (!managerCandidate || !ethers.isAddress(managerCandidate)) {
    throw new Error("BasketManager non trovato. Usa --manager o aggiorna il file di indirizzi.");
  }
  if (!navOracleCandidate || !ethers.isAddress(navOracleCandidate)) {
    throw new Error("NAVOracleAdapter non trovato. Usa --nav-oracle o aggiorna il file di indirizzi.");
  }

  const managerAddress = ethers.getAddress(managerCandidate);
  const navOracleAddress = ethers.getAddress(navOracleCandidate);
  saveAddress(networkLabel, "BasketManager", managerAddress, addressesOverride);
  saveAddress(networkLabel, "NAVOracleAdapter", navOracleAddress, addressesOverride);

  const manager = (await ethers.getContractAt("BasketManager", managerAddress)) as BasketManager;
  const navOracle = (await ethers.getContractAt("NAVOracleAdapter", navOracleAddress)) as NAVOracleAdapter;

  const targets = deriveTargets(args, snapshot);
  if (targets.length === 0) {
    console.log("Nessun basket da analizzare.");
    return;
  }

  const reports: BasketReport[] = [];
  for (const target of targets) {
    reports.push(await inspectBasket(manager, navOracle, target, snapshot));
  }

  if (hasFlag(args, ["json", "output-json"], ["NAV_OUTPUT_JSON"])) {
    console.log(
      JSON.stringify(
        {
          network: networkLabel,
          addressesPath,
          snapshotPath,
          reports,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n📡 NAV overview su ${networkLabel}`);
  console.log(`   Addresses file: ${addressesPath}`);
  if (snapshotPath) {
    console.log(`   Snapshot:       ${snapshotPath}`);
  }

  for (const report of reports) {
    formatReport(report);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ NAV script failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export {};
