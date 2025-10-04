import "dotenv/config";
import fs from "fs";
import path from "path";
import hre from "hardhat";
import type { Log, WebSocketProvider } from "ethers";
import type { AsiaFlexToken, BasketManager, BasketToken, NAVOracleAdapter } from "../../typechain-types";
import { BASKETS, basketKey, type BasketDescriptor } from "../deploy/basketDescriptors";
import { loadAddresses, saveAddress } from "../helpers/addresses";
import { loadBasketDeployment, type BasketDeployment } from "./utils/baskets";
import { getSignerOrImpersonate, logAvailableAccounts } from "./utils/signer";
import { prompt, promptsEnabled } from "./utils/prompt";
import { saveOperation } from "./utils/operations";

const { ethers } = hre;

type ParsedArgs = { _: string[]; [key: string]: string | boolean | string[] };
type Hex32String = `0x${string}`;

type TransferInputs = {
  from: string;
  to: string;
  amountInput?: string;
  amountWeiOverride?: bigint;
  dryRun: boolean;
  legacy: boolean;
  basketId: Hex32String;
  descriptor?: BasketDescriptor;
  managerAddress?: string;
  tokenAddress?: string;
  navOracleAddress?: string;
  addressesPath: string;
  addressesOverride?: string;
  snapshotPath?: string;
  wssUrl?: string;
};

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);
const TRANSFER_LEDGER_DIR = path.join(__dirname, "../ledger");

type LedgerRecord = {
  ts: number;
  network: string;
  basketId: string;
  token: string;
  from: string;
  to: string;
  amountWei: string;
  amountFmt: string;
  txHash: string;
  block: number | null;
  eventSeen: boolean;
  via: "wss" | "poll";
};

type EventTrackingResult = {
  eventSeen: boolean;
  via: "wss" | "poll";
  blockNumber?: number;
};

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
      const value = trimmed.slice(eqIndex + 1);
      parsed[key] = value;
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

  for (const envKey of envKeys) {
    const envValue = process.env[envKey];
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

  for (const envKey of envKeys) {
    const envValue = process.env[envKey];
    if (envValue && TRUE_VALUES.has(envValue.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function normalizeAddress(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${label} non è un address valido: ${value}`);
  }
  return ethers.getAddress(value);
}

function parseBigint(value: string | undefined, label: string): bigint {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  try {
    const parsed = BigInt(value.trim());
    if (parsed < 0n) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw new Error(`${label} deve essere un intero non negativo (ricevuto: ${value}).`);
  }
}

function computeBasketId(descriptor: BasketDescriptor): Hex32String {
  return ethers.keccak256(ethers.toUtf8Bytes(basketKey(descriptor))) as Hex32String;
}

function normalizeBasketId(candidate: string | undefined, label: string): Hex32String | undefined {
  if (!candidate) {
    return undefined;
  }
  const prefixed = candidate.startsWith("0x") ? candidate : `0x${candidate}`;
  if (!ethers.isHexString(prefixed, 32)) {
    throw new Error(`${label} deve essere un bytes32 valido (ricevuto: ${candidate}).`);
  }
  return prefixed as Hex32String;
}

function findDescriptor(candidate: string): BasketDescriptor | undefined {
  const normalized = candidate.trim();
  const bySymbol = BASKETS.find((entry) => entry.symbol.toLowerCase() === normalized.toLowerCase());
  if (bySymbol) return bySymbol;

  const byKey = BASKETS.find((entry) => basketKey(entry).toLowerCase() === normalized.toLowerCase());
  if (byKey) return byKey;

  if (/^[0-9]+$/.test(normalized)) {
    const index = Number(normalized);
    if (index >= 0 && index < BASKETS.length) {
      return BASKETS[index];
    }
  }

  const hashed = BASKETS.find((entry) => computeBasketId(entry).toLowerCase() === normalized.toLowerCase());
  return hashed;
}

function summarizeBaskets(): void {
  console.log("\n🧺 Baskets disponibili:");
  BASKETS.forEach((basket, index) => {
    console.log(
      `   [${index}] ${basket.symbol.padEnd(6)} ${basket.name} (${basket.region.toUpperCase()} / ${basket.strategy.toUpperCase()})`
    );
  });
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ledgerPathForNetwork(network: string): string {
  ensureDir(TRANSFER_LEDGER_DIR);
  return path.join(TRANSFER_LEDGER_DIR, `transfers-${network}.jsonl`);
}

function appendLedgerRecord(network: string, record: LedgerRecord): string {
  const ledgerPath = ledgerPathForNetwork(network);
  fs.appendFileSync(ledgerPath, `${JSON.stringify(record)}\n`);
  return ledgerPath;
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

async function maybePrompt(question: string, fallback?: string): Promise<string | undefined> {
  if (!promptsEnabled()) {
    return fallback;
  }
  return prompt(question, fallback);
}

async function resolveTransferInputs(args: ParsedArgs): Promise<TransferInputs> {
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const addressesOverride = pickStringArg(args, ["addresses"], ["TRANSFER_ADDRESSES_PATH"]);
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkLabel, addressesOverride);

  const snapshotOverride = pickStringArg(args, ["snapshot"], ["TRANSFER_SNAPSHOT_PATH"]);
  const { snapshot, snapshotPath } = tryLoadSnapshot(networkLabel, network.chainId, snapshotOverride);

  const legacy = hasFlag(args, ["legacy"], ["TRANSFER_LEGACY"]);
  const wssUrl = pickStringArg(args, ["wss", "wss-provider"], ["WSS_PROVIDER", "TRANSFER_WSS_PROVIDER"]);

  const positional = Array.isArray(args._) ? (args._ as string[]) : [];
  let descriptor: BasketDescriptor | undefined;
  let basketId: Hex32String | undefined;

  if (!legacy) {
    const basketInput =
      pickStringArg(args, ["basket", "basket-symbol"], ["TRANSFER_BASKET", "TRANSFER_BASKET_SYMBOL"]) ?? positional[3];
    const basketIdOverride = pickStringArg(args, ["basket-id"], ["TRANSFER_BASKET_ID"]);

    if (basketInput) {
      descriptor = findDescriptor(basketInput);
    }

    basketId = normalizeBasketId(basketIdOverride, "Basket Id");

    if (!descriptor && basketId) {
      descriptor = BASKETS.find((entry) => computeBasketId(entry).toLowerCase() === basketId!.toLowerCase());
    }

    if (!descriptor && promptsEnabled()) {
      summarizeBaskets();
      const answer = await prompt("Seleziona il basket (symbol)", BASKETS[0]?.symbol ?? "");
      descriptor = findDescriptor(answer);
    }

    if (!descriptor && !basketId) {
      throw new Error("Impossibile determinare il basket target. Specifica --basket <symbol> o --basket-id <bytes32>.");
    }

    if (!basketId) {
      basketId = computeBasketId(descriptor!);
    }
  } else {
    basketId = ethers.ZeroHash as Hex32String;
  }

  if (!basketId) {
    throw new Error("Basket non determinato. Usa --basket oppure specifica --legacy per AFX.");
  }

  const fromInput = pickStringArg(args, ["from"], ["TRANSFER_FROM"]) ?? positional[0];
  let from = fromInput ? normalizeAddress(fromInput, "Mittente") : undefined;
  if (!from) {
    if (promptsEnabled()) {
      await logAvailableAccounts();
      const answer = await prompt("Indirizzo mittente o indice", "");
      if (/^\d+$/.test(answer.trim())) {
        const accounts = await ethers.provider.send("eth_accounts", []);
        const index = Number(answer.trim());
        if (index < 0 || index >= accounts.length) {
          throw new Error(`Indice account non valido: ${answer}`);
        }
        from = normalizeAddress(accounts[index], "Mittente");
      } else {
        from = normalizeAddress(answer, "Mittente");
      }
    }
  }

  if (!from) {
    throw new Error("Indirizzo mittente non specificato.");
  }

  const toInput = pickStringArg(args, ["to", "beneficiary"], ["TRANSFER_TO", "TRANSFER_BENEFICIARY"]) ?? positional[1];
  let to = toInput ? normalizeAddress(toInput, "Destinatario") : undefined;
  if (!to) {
    if (promptsEnabled()) {
      to = normalizeAddress(await prompt("Indirizzo destinatario", from), "Destinatario");
    }
  }

  if (!to) {
    throw new Error("Indirizzo destinatario non specificato.");
  }

  if (to.toLowerCase() === from.toLowerCase()) {
    throw new Error("Mittente e destinatario coincidono. Specifica indirizzi distinti.");
  }

  const amountWeiOverride = pickStringArg(args, ["amount-wei", "wei"], ["TRANSFER_AMOUNT_WEI"]);
  const amountInput =
    pickStringArg(args, ["amount"], ["TRANSFER_AMOUNT"]) ??
    positional[2] ??
    (await maybePrompt("Quantità di shares da trasferire", undefined));

  if (!amountWeiOverride && (!amountInput || amountInput.trim().length === 0)) {
    throw new Error("Nessuna quantità specificata. Usa --amount <decimale> oppure --amount-wei <uint256>.");
  }

  const managerCandidate = legacy
    ? undefined
    : (pickStringArg(args, ["manager"], ["TRANSFER_MANAGER", "BASKET_MANAGER"]) ??
      addresses.contracts?.BasketManager ??
      snapshot?.manager);

  const managerAddress = managerCandidate ? normalizeAddress(managerCandidate, "BasketManager") : undefined;
  if (!legacy && !managerAddress) {
    throw new Error(
      "Indirizzo del BasketManager mancante. Specifica --manager, aggiorna il file di indirizzi o fornisci uno snapshot."
    );
  }

  const tokenOverride = pickStringArg(args, ["token", "basket-token"], ["TRANSFER_BASKET_TOKEN"]);

  const pickTokenFromAddresses = (): string | undefined => {
    if (legacy) {
      return addresses.contracts?.AsiaFlexToken;
    }

    const candidates: string[] = [];
    if (descriptor?.symbol) {
      const symbolUpper = descriptor.symbol.toUpperCase();
      candidates.push(`BasketToken_${symbolUpper}`);
      candidates.push(`BasketToken-${symbolUpper}`);
      candidates.push(`BasketToken${symbolUpper}`);
    }
    candidates.push(`BasketToken:${basketId}`);
    candidates.push("BasketToken");

    for (const key of candidates) {
      const value = addresses.contracts?.[key];
      if (value && ethers.isAddress(value)) {
        return ethers.getAddress(value);
      }
    }
    return undefined;
  };

  const tokenAddressCandidate = tokenOverride ?? pickTokenFromAddresses();
  const tokenAddress = tokenAddressCandidate
    ? normalizeAddress(tokenAddressCandidate, legacy ? "AsiaFlexToken" : "BasketToken")
    : undefined;

  if (legacy && !tokenAddress) {
    throw new Error("AsiaFlexToken non trovato. Usa --token oppure aggiorna il file di indirizzi.");
  }

  const navOracleCandidate =
    pickStringArg(args, ["nav-oracle", "oracle"], ["TRANSFER_NAV_ORACLE"]) ??
    addresses.contracts?.NAVOracleAdapter ??
    snapshot?.navOracle ??
    snapshot?.oracle;
  const navOracleAddress =
    navOracleCandidate && ethers.isAddress(navOracleCandidate) ? ethers.getAddress(navOracleCandidate) : undefined;

  return {
    from,
    to,
    amountInput: amountInput ?? undefined,
    amountWeiOverride: amountWeiOverride ? parseBigint(amountWeiOverride, "Importo in wei") : undefined,
    dryRun: hasFlag(args, ["dry-run", "dry"], ["TRANSFER_DRY_RUN"]),
    legacy,
    basketId: basketId!,
    descriptor,
    managerAddress,
    tokenAddress,
    navOracleAddress,
    addressesPath,
    addressesOverride,
    snapshotPath,
    wssUrl,
  };
}

type NavObservation = {
  nav: bigint;
  timestamp: number;
  staleness: number;
  deviation: number;
};

async function fetchNavObservation(
  basketId: Hex32String,
  navOracleAddress?: string
): Promise<NavObservation | undefined> {
  if (!navOracleAddress) {
    return undefined;
  }
  try {
    const oracle = (await ethers.getContractAt("NAVOracleAdapter", navOracleAddress)) as NAVOracleAdapter;
    const observation = await oracle.getObservation(basketId);
    const nav = observation.nav ?? observation[0];
    const timestamp = Number(observation.timestamp ?? observation[1] ?? 0n);
    const staleness = Number(observation.stalenessThreshold ?? observation[2] ?? 0n);
    const deviation = Number(observation.deviationThreshold ?? observation[3] ?? 0n);
    if (nav === 0n) {
      return undefined;
    }
    return { nav, timestamp, staleness, deviation };
  } catch (error) {
    console.warn(
      "⚠️  Impossibile recuperare l'osservazione NAV:",
      error instanceof Error ? error.message : String(error)
    );
    return undefined;
  }
}

function formatUsd(nav: bigint): string {
  return `$${Number(ethers.formatUnits(nav, 18)).toFixed(2)}`;
}

async function trackViaWebSocket(
  token: BasketToken | AsiaFlexToken,
  tokenAddress: string,
  from: string,
  to: string,
  amountWei: bigint,
  wssUrl?: string
): Promise<EventTrackingResult | undefined> {
  if (!wssUrl) {
    return undefined;
  }

  let provider: WebSocketProvider | undefined;
  try {
    provider = new ethers.WebSocketProvider(wssUrl);
    const wsProvider = provider as WebSocketProvider;
    const normalizedFrom = ethers.getAddress(from);
    const normalizedTo = ethers.getAddress(to);
    const fromTopic = ethers.zeroPadValue(normalizedFrom, 32);
    const toTopic = ethers.zeroPadValue(normalizedTo, 32);
    const transferTopic = ethers.id("Transfer(address,address,uint256)");

    const filter = {
      address: tokenAddress,
      topics: [transferTopic, fromTopic, toTopic],
    };

    const result = await Promise.race<EventTrackingResult | undefined | null>([
      new Promise<EventTrackingResult>((resolve) => {
        const handler = (log: Log) => {
          try {
            const parsed = token.interface.parseLog(log);
            const value = parsed?.args?.[2] as bigint;
            if (value === amountWei) {
              wsProvider.off(filter, handler);
              resolve({ eventSeen: true, via: "wss", blockNumber: log.blockNumber });
            }
          } catch (error) {
            console.warn(
              "⚠️  Impossibile decodificare evento Transfer via WSS:",
              error instanceof Error ? error.message : error
            );
          }
        };
        wsProvider.on(filter, handler);
      }),
      sleep(15_000).then(() => undefined),
    ]);

    return result ?? { eventSeen: false, via: "wss" };
  } catch (error) {
    console.warn("⚠️  Connessione WebSocket non disponibile:", error instanceof Error ? error.message : error);
    return { eventSeen: false, via: "wss" };
  } finally {
    if (provider) {
      try {
        provider.destroy();
      } catch (closeError) {
        console.warn("⚠️  Chiusura WebSocket fallita:", closeError instanceof Error ? closeError.message : closeError);
      }
    }
  }
}

async function trackViaPolling(
  token: BasketToken | AsiaFlexToken,
  from: string,
  to: string,
  amountWei: bigint,
  startBlock?: number
): Promise<EventTrackingResult> {
  const provider = ethers.provider;

  const normalizedFrom = ethers.getAddress(from);
  const normalizedTo = ethers.getAddress(to);
  const filter = token.filters.Transfer(normalizedFrom, normalizedTo, undefined);

  const baseBlock = startBlock ?? (await provider.getBlockNumber());
  let toBlock = baseBlock + 2;
  const delays = [1_000, 2_000, 4_000];

  for (const delay of delays) {
    try {
      const logs = await token.queryFilter(filter, baseBlock, toBlock);
      for (const log of logs) {
        const value = log.args?.[2] as bigint;
        if (value === amountWei) {
          return { eventSeen: true, via: "poll", blockNumber: log.blockNumber };
        }
      }
    } catch (error) {
      console.warn("⚠️  queryFilter fallita:", error instanceof Error ? error.message : error);
    }

    await sleep(delay);
    toBlock += 1;
  }

  return { eventSeen: false, via: "poll", blockNumber: baseBlock };
}

async function trackTransferEvent(
  token: BasketToken | AsiaFlexToken,
  tokenAddress: string,
  from: string,
  to: string,
  amountWei: bigint,
  receiptBlock?: number,
  wssUrl?: string
): Promise<EventTrackingResult> {
  const wssResult = await trackViaWebSocket(token, tokenAddress, from, to, amountWei, wssUrl);
  if (wssResult?.eventSeen) {
    return wssResult;
  }

  return trackViaPolling(token, from, to, amountWei, receiptBlock);
}

async function transferBasketShares(inputs: TransferInputs): Promise<void> {
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  if (inputs.managerAddress && !inputs.legacy) {
    saveAddress(networkLabel, "BasketManager", inputs.managerAddress, inputs.addressesOverride);
  }
  if (inputs.navOracleAddress) {
    saveAddress(networkLabel, "NAVOracleAdapter", inputs.navOracleAddress, inputs.addressesOverride);
  }

  let manager: BasketManager | undefined;
  if (!inputs.legacy) {
    if (!inputs.managerAddress) {
      throw new Error("BasketManager non disponibile per il basket selezionato.");
    }
    manager = (await ethers.getContractAt("BasketManager", inputs.managerAddress)) as BasketManager;
  }

  let tokenAddress = inputs.tokenAddress;
  if (!tokenAddress && manager) {
    tokenAddress = await manager.basketTokenOf(inputs.basketId);
  }

  if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
    throw new Error(
      inputs.legacy
        ? "AsiaFlexToken non registrato. Usa --token oppure aggiorna il file di indirizzi."
        : `Basket ${inputs.descriptor?.symbol ?? inputs.basketId} non registrato su ${inputs.managerAddress}.`
    );
  }

  const token: BasketToken | AsiaFlexToken = inputs.legacy
    ? ((await ethers.getContractAt("AsiaFlexToken", tokenAddress)) as AsiaFlexToken)
    : ((await ethers.getContractAt("BasketToken", tokenAddress)) as BasketToken);

  const decimals = Number(await token.decimals());
  const symbol = await token.symbol();
  const name = await token.name();

  const amountWei = inputs.amountWeiOverride
    ? inputs.amountWeiOverride
    : (() => {
        if (!inputs.amountInput) {
          throw new Error("Quantità da trasferire non disponibile.");
        }
        return ethers.parseUnits(inputs.amountInput.trim(), decimals);
      })();

  if (amountWei <= 0n) {
    throw new Error("La quantità da trasferire deve essere positiva.");
  }

  const tokenKey = inputs.legacy
    ? "AsiaFlexToken"
    : inputs.descriptor?.symbol
      ? `BasketToken_${inputs.descriptor.symbol.toUpperCase()}`
      : `BasketToken:${inputs.basketId}`;
  saveAddress(networkLabel, tokenKey, tokenAddress, inputs.addressesOverride);

  const navObservation = !inputs.legacy
    ? await fetchNavObservation(inputs.basketId, inputs.navOracleAddress)
    : undefined;
  const navLabel = navObservation ? formatUsd(navObservation.nav) : "n/d";

  console.log(`\n${inputs.legacy ? "🚚 AsiaFlex Legacy Transfer" : "🚚 AsiaFlex Basket Transfer"}`);
  console.log(`   Network:      ${networkLabel}`);
  if (!inputs.legacy) {
    console.log(`   Basket:       ${inputs.descriptor?.symbol ?? "custom"} (${inputs.descriptor?.name ?? "?"})`);
    console.log(`   Basket Id:    ${inputs.basketId}`);
  }
  console.log(`   Token:        ${tokenAddress}`);
  if (inputs.managerAddress) {
    console.log(`   Manager:      ${inputs.managerAddress}`);
  }
  if (inputs.navOracleAddress) {
    console.log(`   NAV Oracle:   ${inputs.navOracleAddress}`);
  }
  if (inputs.snapshotPath) {
    console.log(`   Snapshot:     ${inputs.snapshotPath}`);
  }

  console.log("\n👥 Partecipanti");
  console.log(`   Mittente:     ${inputs.from}`);
  console.log(`   Destinatario: ${inputs.to}`);
  console.log(`   Dry-run:      ${inputs.dryRun ? "sì" : "no"}`);
  if (inputs.wssUrl) {
    console.log(`   WSS:          ${inputs.wssUrl}`);
  }

  console.log("\n💰 Parametri");
  console.log(`   Token name:   ${name} (${symbol})`);
  console.log(`   Decimals:     ${decimals}`);
  console.log(`   Amount:       ${ethers.formatUnits(amountWei, decimals)} ${symbol}`);
  console.log(`   NAV share:    ${navLabel}`);

  const fromBalance = await token.balanceOf(inputs.from);
  const toBalance = await token.balanceOf(inputs.to);

  if (amountWei > fromBalance) {
    console.log(
      "⚠️  Attenzione: la quantità richiesta supera il saldo del mittente (" +
        `${ethers.formatUnits(fromBalance, decimals)} ${symbol}).`
    );
    if (!inputs.dryRun) {
      throw new Error("Saldo insufficiente per il trasferimento richiesto.");
    }
  }

  if (inputs.dryRun) {
    const projectedSender = fromBalance >= amountWei ? fromBalance - amountWei : 0n;
    const projectedRecipient = toBalance + amountWei;
    console.log("\n🧪 DRY RUN");
    console.log(`   Saldo mittente attuale:  ${ethers.formatUnits(fromBalance, decimals)} ${symbol}`);
    console.log(`   Saldo mittente previsto: ${ethers.formatUnits(projectedSender, decimals)} ${symbol}`);
    console.log(`   Saldo destinatario attuale:  ${ethers.formatUnits(toBalance, decimals)} ${symbol}`);
    console.log(`   Saldo destinatario previsto: ${ethers.formatUnits(projectedRecipient, decimals)} ${symbol}`);
    if (navObservation) {
      const notional = (amountWei * navObservation.nav) / ethers.parseUnits("1", 18);
      console.log(`   Valore nozionale stimato: ${ethers.formatUnits(notional, 18)} USD`);
    }
    return;
  }

  const signer = await getSignerOrImpersonate(inputs.from);
  const tokenWithSigner = token.connect(signer);

  console.log("\n🚀 Invio transazione...");
  const tx = await tokenWithSigner.transfer(inputs.to, amountWei);
  console.log(`   Hash: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("No receipt");
  }
  console.log(`✅ Confermata nel blocco ${receipt.blockNumber}`);

  const tracking = await trackTransferEvent(
    token,
    tokenAddress,
    inputs.from,
    inputs.to,
    amountWei,
    receipt.blockNumber,
    inputs.wssUrl
  );
  console.log(
    `   Tracking evento Transfer → via ${tracking.via}${tracking.eventSeen ? " (captured)" : " (non rilevato)"}`
  );

  const newSenderBalance = await token.balanceOf(inputs.from);
  const newRecipientBalance = await token.balanceOf(inputs.to);

  console.log(`\n📊 Saldi aggiornati`);
  console.log(`   Mittente:    ${ethers.formatUnits(newSenderBalance, decimals)} ${symbol}`);
  console.log(`   Destinatario:${ethers.formatUnits(newRecipientBalance, decimals)} ${symbol}`);

  const operation = {
    type: "transfer",
    network: networkLabel,
    timestamp: new Date().toISOString(),
    basket: {
      id: inputs.legacy ? "legacy" : inputs.basketId,
      symbol: inputs.descriptor?.symbol,
      name: inputs.descriptor?.name,
      token: tokenAddress,
      nav: navObservation?.nav?.toString(),
      navTimestamp: navObservation?.timestamp,
    },
    params: {
      from: inputs.from,
      to: inputs.to,
      amount: amountWei.toString(),
      decimals,
      dryRun: inputs.dryRun,
      addressesPath: inputs.addressesPath,
      snapshot: inputs.snapshotPath,
    },
    transaction: {
      hash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    },
    results: {
      senderBalance: newSenderBalance.toString(),
      recipientBalance: newRecipientBalance.toString(),
    },
  };

  saveOperation(networkLabel, "transfer", operation);

  const ledgerRecord: LedgerRecord = {
    ts: Math.floor(Date.now() / 1000),
    network: networkLabel,
    basketId: inputs.legacy ? "legacy" : inputs.basketId,
    token: tokenAddress,
    from: inputs.from,
    to: inputs.to,
    amountWei: amountWei.toString(),
    amountFmt: ethers.formatUnits(amountWei, decimals),
    txHash: tx.hash,
    block: tracking.blockNumber ?? receipt.blockNumber ?? null,
    eventSeen: tracking.eventSeen,
    via: tracking.via,
  };

  appendLedgerRecord(networkLabel, ledgerRecord);
  console.log("🔒 Transfer executed (details omitted for security).");
}

async function main(): Promise<void> {
  let inputs: TransferInputs;
  try {
    inputs = await resolveTransferInputs(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : String(error));
    console.log(
      "Usage: node scripts/ops/transfer.ts --network <net> --basket EUFX --from 0x... --to 0x... --amount 1.5 --addresses scripts/deployments/<net>.json [--wss wss://...]"
    );
    console.log("   Per il token legacy usa: --legacy --token 0xAsiaFlexTokenAddress");
    process.exit(1);
    return;
  }

  await transferBasketShares(inputs);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

export { transferBasketShares as transfer };
