import fs from "fs";
import path from "path";
import type { BaseContract } from "ethers";

type HardhatEthers = typeof import("hardhat") extends { ethers: infer E } ? E : never;
type ContractName = "BasketManager" | "MedianOracle" | "NAVOracleAdapter";

let cachedEthers: HardhatEthers | undefined;

function getEthers(): HardhatEthers {
  if (!cachedEthers) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const hardhat = require("hardhat") as typeof import("hardhat");
    cachedEthers = hardhat.ethers;
  }
  return cachedEthers;
}

export type BasketTokensMap = Record<string, string>;

export type CombinedAddresses = DeploymentFile & {
  MedianOracle?: string;
  NAVOracleAdapter?: string;
  BasketManager?: string;
  BasketTreasuryController?: string;
  BasketTokens?: BasketTokensMap;
};

function ensureBasketTokens(target: CombinedAddresses): void {
  if (!target.BasketTokens || typeof target.BasketTokens !== "object") {
    target.BasketTokens = {};
  }
}

function normalizeCombinedFrom(raw: unknown, networkHint: string): CombinedAddresses {
  const parsed =
    (typeof raw === "object" && raw !== null ? (raw as CombinedAddresses) : undefined) ??
    ({ network: networkHint } as CombinedAddresses);

  const combined: CombinedAddresses = {
    ...parsed,
    network: parsed.network || networkHint,
    contracts: { ...(parsed.contracts ?? {}) },
    addresses: { ...(parsed.addresses ?? {}) },
    BasketTokens: { ...(parsed.BasketTokens ?? {}) },
  };

  ensureBasketTokens(combined);
  return combined;
}

function inferTreasury(snapshot: Record<string, unknown>, base: CombinedAddresses): string | undefined {
  const snapshotTreasury =
    (snapshot.basketTreasuryController as string | undefined) ||
    (snapshot.treasury as string | undefined) ||
    (snapshot.basketTreasury as string | undefined);

  return (
    snapshotTreasury ||
    base.BasketTreasuryController ||
    (base.contracts?.BasketTreasuryController as string | undefined) ||
    (base.contracts?.TreasuryController as string | undefined) ||
    (base.addresses?.BasketTreasuryController as string | undefined) ||
    (base.addresses?.TreasuryController as string | undefined)
  );
}

function setKey(target: CombinedAddresses, key: string, value?: string): void {
  if (!value) {
    return;
  }
  target.contracts[key] = value;
  target.addresses = target.addresses ?? {};
  target.addresses[key] = value;
}

export function mergeBasketsIntoMain(mainPath: string, basketsPath: string): CombinedAddresses {
  ensureDirectory(path.dirname(mainPath));

  const networkHint = path.basename(mainPath, path.extname(mainPath));
  const snapshotExists = fs.existsSync(basketsPath);
  const snapshotRaw = snapshotExists ? JSON.parse(fs.readFileSync(basketsPath, "utf8")) : undefined;

  const baseRaw = fs.existsSync(mainPath)
    ? JSON.parse(fs.readFileSync(mainPath, "utf8"))
    : createTemplate((snapshotRaw?.network as string | undefined) || networkHint);

  const base = normalizeCombinedFrom(baseRaw, (snapshotRaw?.network as string | undefined) || networkHint);

  if (!snapshotRaw) {
    fs.writeFileSync(mainPath, JSON.stringify(base, null, 2));
    return base;
  }

  const medianOracle = snapshotRaw.medianOracle as string | undefined;
  const navOracle = snapshotRaw.navOracle as string | undefined;
  const manager = snapshotRaw.manager as string | undefined;
  const treasury = inferTreasury(snapshotRaw as Record<string, unknown>, base);

  if (medianOracle) {
    base.MedianOracle = medianOracle;
    setKey(base, "MedianOracle", medianOracle);
  }

  if (navOracle) {
    base.NAVOracleAdapter = navOracle;
    setKey(base, "NAVOracleAdapter", navOracle);
  }

  if (manager) {
    base.BasketManager = manager;
    setKey(base, "BasketManager", manager);
  }

  if (treasury) {
    base.BasketTreasuryController = treasury;
    setKey(base, "BasketTreasuryController", treasury);
  }

  const baskets = Array.isArray(snapshotRaw.baskets) ? snapshotRaw.baskets : [];
  for (const basket of baskets) {
    const symbol = typeof basket?.symbol === "string" ? basket.symbol.toUpperCase() : undefined;
    const tokenAddress = typeof basket?.tokenAddress === "string" ? basket.tokenAddress : undefined;
    if (!symbol || !tokenAddress) {
      continue;
    }
    base.BasketTokens![symbol] = tokenAddress;
    setKey(base, `BasketTokens.${symbol}`, tokenAddress);
  }

  fs.writeFileSync(mainPath, JSON.stringify(base, null, 2));
  return base;
}

/**
 * Merges the main addresses snapshot with a baskets snapshot if present.
 * Writes the combined result back to addrsPath.
 */
export function mergeBasketsSnapshot(basePath: string, basketsPath: string): CombinedAddresses {
  return mergeBasketsIntoMain(basePath, basketsPath);
}

/**
 * Asserts that a contract exists at the given address and exposes the expected ABI entry point.
 * Exits with error if not.
 */
export async function assertContractAt<T extends BaseContract = BaseContract>(
  addr: string,
  abiName: ContractName
): Promise<T> {
  const ethers = getEthers();
  const code = await ethers.provider.getCode(addr);
  if (!code || code === "0x") {
    const network = await ethers.provider.getNetwork();
    console.error(`❌ Nessun contratto trovato su ${network.name} (${network.chainId}) all'indirizzo ${addr}`);
    process.exit(1);
  }
  let contract: BaseContract;
  try {
    contract = (await ethers.getContractAt(abiName, addr)) as BaseContract;
  } catch (e) {
    const network = await ethers.provider.getNetwork();
    console.error(
      `❌ ABI ${abiName} incompatibile con il contratto a ${addr} su ${network.name} (${network.chainId}). Dettagli: ${(e as Error).message}`
    );
    process.exit(1);
  }
  const requiredFn: Record<ContractName, string> = {
    BasketManager: "basketTokenOf",
    MedianOracle: "updatePrice",
    NAVOracleAdapter: "updateNAV",
  };

  const requirement = requiredFn[abiName];
  if (requirement) {
    try {
      contract.interface.getFunction(requirement);
    } catch (error) {
      const network = await ethers.provider.getNetwork();
      console.error(
        `❌ Il contratto ${abiName} a ${addr} su ${network.name} (${network.chainId}) non espone ${requirement}(). ` +
          "Verifica la versione deployata e rigenera lo snapshot."
      );
      if (error instanceof Error && error.message) {
        console.error(`Dettagli: ${error.message}`);
      }
      process.exit(1);
    }
  }
  return contract as T;
}

export type DeploymentFile = {
  network: string;
  contracts: Record<string, string>;
  addresses?: Record<string, string>;
  [key: string]: unknown;
};

export type LoadAddressesResult = {
  filePath: string;
  data: CombinedAddresses;
};

const DEPLOYMENTS_DIR = path.join(__dirname, "../deployments");

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolvePath(networkName: string, overridePath?: string) {
  if (overridePath) {
    return path.resolve(overridePath);
  }
  ensureDirectory(DEPLOYMENTS_DIR);
  return path.join(DEPLOYMENTS_DIR, `${networkName}.json`);
}

function createTemplate(networkName: string): CombinedAddresses {
  return {
    network: networkName,
    contracts: {},
    addresses: {},
    BasketTokens: {},
  };
}

export function loadAddresses(networkName: string, overridePath?: string): LoadAddressesResult {
  const filePath = resolvePath(networkName, overridePath);

  if (!fs.existsSync(filePath)) {
    const template = createTemplate(networkName);
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    return { filePath, data: { ...template } };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: CombinedAddresses;
  try {
    parsed = JSON.parse(raw) as CombinedAddresses;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }

  const contractsSource = {
    ...(typeof parsed.addresses === "object" && parsed.addresses !== null
      ? (parsed.addresses as Record<string, string>)
      : {}),
    ...(typeof parsed.contracts === "object" && parsed.contracts !== null
      ? (parsed.contracts as Record<string, string>)
      : {}),
  };

  parsed.contracts = contractsSource;
  parsed.addresses = { ...contractsSource };
  parsed.BasketTokens = { ...(parsed.BasketTokens ?? {}) };
  if (parsed.BasketTokens) {
    for (const [symbol, value] of Object.entries(parsed.BasketTokens)) {
      parsed.contracts[`BasketTokens.${symbol}`] = value;
    }
  }
  if (!parsed.network) {
    parsed.network = networkName;
  }
  return { filePath, data: parsed };
}

type AddressKey = string | [string, ...string[]];

export function saveAddress(
  networkName: string,
  key: AddressKey,
  address: string,
  overridePath?: string
): CombinedAddresses {
  const { filePath, data } = loadAddresses(networkName, overridePath);
  const keyPath = Array.isArray(key) ? key : [key];
  const joinKey = keyPath.join(".");

  const updated: CombinedAddresses = {
    ...data,
    contracts: {
      ...data.contracts,
      [joinKey]: address,
    },
    addresses: {
      ...(data.addresses || {}),
      [joinKey]: address,
    },
  };

  let cursor: Record<string, unknown> = updated;
  for (let i = 0; i < keyPath.length; i += 1) {
    const segment = keyPath[i];
    if (i === keyPath.length - 1) {
      cursor[segment] = address;
    } else {
      if (typeof cursor[segment] !== "object" || cursor[segment] === null) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
  }

  if (keyPath[0] === "BasketTokens") {
    const symbol = keyPath[1];
    if (!updated.BasketTokens) {
      updated.BasketTokens = {};
    }
    if (symbol) {
      updated.BasketTokens[symbol] = address;
    }
  }

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export function getContractAddress(networkName: string, key: string, overridePath?: string): string | undefined {
  const { data } = loadAddresses(networkName, overridePath);
  if (data.contracts[key]) {
    return data.contracts[key];
  }
  const segments = key.split(".");
  let cursor: unknown = data;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" ? cursor : undefined;
}
