#!/usr/bin/env ts-node
import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  Contract,
  Interface,
  JsonRpcProvider,
  TypedDataEncoder,
  Wallet,
  ZeroHash,
  getAddress,
  isAddress,
  parseEther,
} from "ethers";
import type { TypedDataField } from "ethers";
import { loadDeployment, resolveDeploymentPath } from "./utils/deployments";

const REDEEM_TYPES: Record<string, TypedDataField[]> = {
  RedeemRequest: [
    { name: "from", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "timestamp", type: "uint256" },
    { name: "reserveHash", type: "bytes32" },
  ],
};

type CLIFlags = Record<string, string | boolean>;

type RedeemPermit = {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: typeof REDEEM_TYPES;
  message: {
    from: string;
    amount: string;
    timestamp: string;
    reserveHash: string;
  };
  signature: string;
  digest: string;
  meta: {
    owner: string;
    recipient: string;
    amountWei: string;
    deadline: number;
    deadlineIso: string;
    treasurySigner?: string;
    requestExpiration?: number;
    requestExpirationSource?: "onchain" | "config";
    nonce?: string | null;
  };
};

interface GenerateOptions {
  network: string;
  rpcUrl: string;
  addressesPath?: string;
  owner: string;
  recipient: string;
  amountWei: bigint;
  reserveHash: string;
  timestamp: number;
  deadlineSecs: number;
  treasurySignerPk: string;
}

function parseArgs(argv: string[]): CLIFlags {
  const parsed: CLIFlags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const body = token.slice(2);
    const eqIdx = body.indexOf("=");
    if (eqIdx >= 0) {
      const key = body.slice(0, eqIdx);
      const value = body.slice(eqIdx + 1);
      parsed[key] = value;
      continue;
    }
    const key = body;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = "true";
    }
  }
  return parsed;
}

function flagString(flags: CLIFlags, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function resolveNetwork(flags: CLIFlags): string {
  return flagString(flags, "network") ?? process.env.HARDHAT_NETWORK ?? "sepolia";
}

function resolveRpcUrl(network: string, flags: CLIFlags): string {
  const flagValue = flagString(flags, "rpc");
  if (flagValue && flagValue.length > 0) {
    return flagValue;
  }
  const envKey = `RPC_URL_${network.toUpperCase()}`;
  const candidate = process.env[envKey] ?? process.env.RPC_URL ?? process.env.JSON_RPC_URL;
  if (!candidate || candidate.length === 0) {
    throw new Error(`Configurare l'RPC per ${network} (variabile ${envKey} o RPC_URL)`);
  }
  return candidate;
}

function resolveAddressesPath(flags: CLIFlags): string | undefined {
  const candidate = flagString(flags, "addresses") ?? process.env.E2E_ADDRESSES_PATH;
  return candidate ? resolve(process.cwd(), candidate) : undefined;
}

function normalizeAddress(value: string | undefined, label: string, fallback?: string): string {
  const candidate = value ?? fallback;
  if (!candidate) {
    throw new Error(`${label} address mancante`);
  }
  if (!isAddress(candidate)) {
    throw new Error(`${label} deve essere un address valido (${candidate})`);
  }
  return getAddress(candidate);
}

function normalizeReserveHash(value: string | undefined): string {
  if (!value || value.length === 0) {
    return ZeroHash;
  }
  if (!value.startsWith("0x") || value.length !== 66) {
    throw new Error("reserveHash deve essere un hex da 32 byte (0x...)");
  }
  return value;
}

function resolveTimestamp(raw: string | undefined): number {
  if (!raw) {
    return Math.floor(Date.now() / 1000);
  }
  if (!/^[0-9]+$/.test(raw)) {
    throw new Error("timestamp deve essere un intero positivo (secondi UNIX)");
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("timestamp deve essere maggiore di zero");
  }
  return parsed;
}

function parseAmount(raw: string | undefined): bigint {
  if (!raw || raw.trim().length === 0) {
    throw new Error("Importo redeem mancante (amount)");
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith("0x") || /^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return parseEther(trimmed);
  }
  throw new Error(`Formato importo non riconosciuto: ${raw}`);
}

function resolveDeadlineSecs(flags: CLIFlags): number {
  const direct = flagString(flags, "deadline");
  const legacy = flagString(flags, "deadline-secs");
  const envValue = process.env.E2E_REDEEM_DEADLINE_SECS;
  const attempt = [direct, legacy, envValue, "900"];
  for (const candidate of attempt) {
    if (!candidate) {
      continue;
    }
    const parsed = Number.parseInt(candidate, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 900;
}

async function loadDeploymentSnapshot(
  network: string,
  chainId: bigint,
  addressesPath?: string
): Promise<Record<string, unknown>> {
  if (addressesPath) {
    const raw = await readFile(addressesPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  }
  return loadDeployment(network, chainId);
}

function resolveControllerAddress(snapshot: Record<string, unknown>, network: string): string {
  const lookup = (value: unknown): string | undefined => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    const controller = record.BasketTreasuryController ?? record.TreasuryController;
    return typeof controller === "string" ? controller : undefined;
  };

  const address =
    lookup(snapshot.addresses) ??
    lookup(snapshot.contracts) ??
    (typeof snapshot.BasketTreasuryController === "string" ? snapshot.BasketTreasuryController : undefined) ??
    (typeof snapshot.TreasuryController === "string" ? snapshot.TreasuryController : undefined);

  if (!address || !isAddress(address)) {
    const attempted = resolveDeploymentPath(network, undefined);
    throw new Error(`TreasuryController non trovato nel deployment (${attempted})`);
  }

  return getAddress(address);
}

function logOptionalWarning(label: string, error: unknown): void {
  if (process.env.AUTOSIGN_DEBUG !== "1") {
    return;
  }
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[AUTOSIGN][WARN] ${label}: ${reason}`);
}

async function detectDomain(provider: JsonRpcProvider, controller: string): Promise<{ name: string; version: string }> {
  const domain = { name: "TreasuryController", version: "1" };
  const abi = new Interface([
    "function name() view returns (string)",
    "function NAME() view returns (string)",
    "function version() view returns (string)",
  ]);
  const contract = new Contract(controller, abi, provider);
  try {
    const reported = await contract.name();
    if (typeof reported === "string" && reported.length > 0) {
      domain.name = reported;
    }
  } catch (error) {
    logOptionalWarning("controller.name unavailable", error);
  }
  if (domain.name === "TreasuryController") {
    try {
      const reported = await contract.NAME();
      if (typeof reported === "string" && reported.length > 0) {
        domain.name = reported;
      }
    } catch (error) {
      logOptionalWarning("controller.NAME unavailable", error);
    }
  }
  try {
    const reported = await contract.version();
    if (typeof reported === "string" && reported.length > 0) {
      domain.version = reported;
    }
  } catch (error) {
    logOptionalWarning("controller.version unavailable", error);
  }
  return domain;
}

async function fetchContext(
  provider: JsonRpcProvider,
  controller: string
): Promise<{ treasurySigner?: string; requestExpiration?: number }> {
  const context: { treasurySigner?: string; requestExpiration?: number } = {};

  const signerAbi = new Interface(["function getTreasurySigner() view returns (address)"]);
  const signerContract = new Contract(controller, signerAbi, provider);
  try {
    const signer = await signerContract.getTreasurySigner();
    if (isAddress(signer)) {
      context.treasurySigner = getAddress(signer);
    }
  } catch (error) {
    logOptionalWarning("getTreasurySigner unavailable", error);
  }

  const expirationAbi = new Interface(["function getRequestExpiration() view returns (uint256)"]);
  const expirationContract = new Contract(controller, expirationAbi, provider);
  try {
    const value = await expirationContract.getRequestExpiration();
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      context.requestExpiration = parsed;
    }
  } catch (error) {
    logOptionalWarning("getRequestExpiration unavailable", error);
  }

  return context;
}

async function generatePermit(options: GenerateOptions): Promise<RedeemPermit> {
  const provider = new JsonRpcProvider(options.rpcUrl);
  const networkInfo = await provider.getNetwork();
  const chainId = Number(networkInfo.chainId);

  const snapshot = await loadDeploymentSnapshot(options.network, networkInfo.chainId, options.addressesPath);
  const controllerAddress = resolveControllerAddress(snapshot, options.network);

  const domainInfo = await detectDomain(provider, controllerAddress);
  const domain = {
    name: domainInfo.name,
    version: domainInfo.version,
    chainId,
    verifyingContract: controllerAddress,
  } as const;

  const wallet = new Wallet(options.treasurySignerPk, provider);
  const typedMessage = {
    from: options.owner,
    amount: options.amountWei,
    timestamp: BigInt(options.timestamp),
    reserveHash: options.reserveHash,
  } as const;

  const signature = await wallet.signTypedData(domain, REDEEM_TYPES, typedMessage);
  const digest = TypedDataEncoder.hash(domain, REDEEM_TYPES, typedMessage);

  const deadline = options.timestamp + options.deadlineSecs;
  const context = await fetchContext(provider, controllerAddress);

  const permit: RedeemPermit = {
    domain: {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract,
    },
    types: REDEEM_TYPES,
    message: {
      from: options.owner,
      amount: options.amountWei.toString(),
      timestamp: BigInt(options.timestamp).toString(),
      reserveHash: options.reserveHash,
    },
    signature,
    digest,
    meta: {
      owner: options.owner,
      recipient: options.recipient,
      amountWei: options.amountWei.toString(),
      deadline,
      deadlineIso: new Date(deadline * 1000).toISOString(),
      treasurySigner: context.treasurySigner,
      requestExpiration: context.requestExpiration,
      requestExpirationSource: context.requestExpiration !== undefined ? "onchain" : undefined,
      nonce: null,
    },
  };

  const nonceLabel = permit.meta.nonce ?? "n/a";
  console.log(
    `[AUTOSIGN] domain={name=${domain.name},version=${domain.version},chainId=${domain.chainId},verifyingContract=${domain.verifyingContract}} nonce=${nonceLabel} deadline=${deadline}`
  );

  return permit;
}

async function outputPermit(permit: RedeemPermit, outPath: string | null): Promise<void> {
  const serialized = `${JSON.stringify(permit, null, 2)}\n`;
  if (!outPath) {
    process.stdout.write(serialized);
    return;
  }
  const directory = dirname(outPath);
  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }
  await writeFile(outPath, serialized, "utf8");
  console.log(`[AUTOSIGN] saved permit to ${outPath}`);
}

function resolveOutPath(flags: CLIFlags): string | null {
  const candidate = flagString(flags, "out") ?? flagString(flags, "out-path");
  return candidate ? resolve(process.cwd(), candidate) : null;
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  const privateKey = process.env.E2E_TREASURY_SIGNER_PK ?? process.env.TREASURY_SIGNER_PK;
  if (!privateKey || privateKey.trim().length === 0) {
    throw new Error("E2E_TREASURY_SIGNER_PK non configurata");
  }

  const network = resolveNetwork(flags);
  const rpcUrl = resolveRpcUrl(network, flags);
  const addressesPath = resolveAddressesPath(flags);

  const owner = normalizeAddress(
    flagString(flags, "owner") ?? flagString(flags, "from") ?? process.env.REDEEM_FROM ?? process.env.E2E_RECIPIENT,
    "owner"
  );
  const recipient = normalizeAddress(
    flagString(flags, "recipient") ?? process.env.REDEEM_RECIPIENT,
    "recipient",
    owner
  );
  const amountWei = parseAmount(
    flagString(flags, "amount") ?? process.env.REDEEM_AMOUNT ?? process.env.E2E_REDEEM_AMOUNT
  );
  const reserveHash = normalizeReserveHash(flagString(flags, "reserveHash") ?? process.env.REDEEM_RESERVE_HASH);
  const timestamp = resolveTimestamp(flagString(flags, "timestamp") ?? process.env.REDEEM_TIMESTAMP);
  const deadlineSecs = resolveDeadlineSecs(flags);

  const permit = await generatePermit({
    network,
    rpcUrl,
    addressesPath,
    owner,
    recipient,
    amountWei,
    reserveHash,
    timestamp,
    deadlineSecs,
    treasurySignerPk: privateKey,
  });

  const outPath = resolveOutPath(flags);
  await outputPermit(permit, outPath);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[AUTOSIGN] errore:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export type { RedeemPermit };
export { generatePermit };
