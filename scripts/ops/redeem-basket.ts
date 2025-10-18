import "dotenv/config";
import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

import type { BasketManager, BasketToken, BasketTreasuryController, NAVOracleAdapter } from "../../typechain-types";
import { loadAddresses, saveAddress } from "../helpers/addresses";
import { basketTreasuryDomain, signMintRedeem, type MintRedeemRequest } from "../helpers/eip712";
import { BASKETS, basketKey, type BasketDescriptor } from "../deploy/basketDescriptors";
import { promptsEnabled, prompt } from "./utils/prompt";
import { getSignerOrImpersonate, logAvailableAccounts } from "./utils/signer";
import { saveOperation } from "./utils/operations";
import { loadBasketDeployment, type BasketDeployment } from "./utils/baskets";

type ParsedArgs = { _: string[]; [key: string]: string | boolean | string[] };

type RedeemBasketInputs = {
  basketId: string;
  descriptor: BasketDescriptor;
  notionalWei: bigint;
  notionalInput: string;
  holder: string;
  account: string;
  signer: string;
  signature?: string;
  proofHash: string;
  nav: bigint;
  navTimestamp?: number;
  deadline: bigint;
  nonce: bigint;
  slippageBps: number;
  dryRun: boolean;
  addressesPath: string;
  snapshotPath?: string;
  snapshot?: BasketDeployment;
};

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
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

function printHelp(): void {
  console.log(
    "Usage: node scripts/ops/redeem-basket.ts --basket <symbol> --notional <amount> --holder <address> [options]\n"
  );
  console.log("Required flags:");
  console.log("  --basket <symbol>           Basket symbol (e.g. EUFX)");
  console.log("  --notional <amount>         Base asset notional to redeem (decimal, 18 decimals)");
  console.log("  --holder <address>          Address whose BasketToken shares will be burned");
  console.log("\nOptional flags:");
  console.log("  --account <address>         Operator/controller address (defaults to first signer)");
  console.log("  --signer <address>          Treasury signer for proof generation");
  console.log("  --nav <decimal>             Override NAV price (18 decimals)");
  console.log("  --seed-nav <decimal>        Seed NAV locally (Hardhat/localhost only)");
  console.log("  --slippage <bps>            Info-only tolerance on shares to burn (default 100)");
  console.log("  --dry-run                   Preview redeem without sending transaction");
  console.log("  --addresses <path>          Deployment file override");
  console.log("  --snapshot <path>           Basket snapshot override");
  console.log("  --proof <bytes32>           External proof hash (defaults to zero)");
  console.log("  --deadline <unix>           Explicit deadline (defaults to now + 1h)");
  console.log("  --nonce <value>             Nonce for EIP712 digest (defaults to 0)");
  console.log("  --signature <hex>           Precomputed treasury signature");
  console.log("  --help                      Show this help message");
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
    if (!envValue) continue;
    if (TRUE_VALUES.has(envValue.toLowerCase())) {
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

function normalizeBytes32(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  if (!ethers.isHexString(value, 32)) {
    throw new Error(`${label} deve essere un bytes32 (esadecimale, 0x...).`);
  }
  return value;
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

function parseDecimalToWei(value: string | undefined, label: string): bigint {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  try {
    return ethers.parseUnits(value.trim(), 18);
  } catch (error) {
    throw new Error(`${label} non valido (${(error as Error).message}).`);
  }
}

function parseSlippageBps(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    throw new Error(`Slippage BPS non valido: ${value}`);
  }
  const parsed = Number(trimmed);
  if (parsed < 0 || parsed > 10_000) {
    throw new Error(`Slippage BPS deve essere compreso tra 0 e 10000 (ricevuto ${parsed}).`);
  }
  return parsed;
}

function computeBasketId(descriptor: BasketDescriptor): string {
  return ethers.keccak256(ethers.toUtf8Bytes(basketKey(descriptor)));
}

function formatUsd(value: bigint): string {
  const formatted = Number(ethers.formatUnits(value, 18));
  return `$${formatted.toFixed(2)}`;
}

function summarizeBaskets(): void {
  console.log("\n🧺 Baskets disponibili:");
  for (const basket of BASKETS) {
    console.log(
      `   • ${basket.symbol.padEnd(6)} ${basket.name} [${basket.region.toUpperCase()} / ${basket.strategy.toUpperCase()}]`
    );
  }
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

  const matchingId = BASKETS.find((entry) => computeBasketId(entry).toLowerCase() === normalized.toLowerCase());
  if (matchingId) return matchingId;

  return undefined;
}

function resolveSnapshotOverride(
  networkName: string,
  chainId: bigint,
  snapshotOverride?: string
): { snapshot: BasketDeployment; snapshotPath?: string } {
  if (snapshotOverride) {
    const resolved = path.resolve(snapshotOverride);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Snapshot personalizzato non trovato: ${resolved}`);
    }
    const data = JSON.parse(fs.readFileSync(resolved, "utf8"));
    return { snapshot: data as BasketDeployment, snapshotPath: resolved };
  }

  try {
    const snapshot = loadBasketDeployment(networkName, chainId);
    return { snapshot };
  } catch (error) {
    console.warn(
      `⚠️  Nessun snapshot di basket trovato per ${networkName}. (${(error as Error).message}). ` +
        "Procedo senza snapshot: specifica manualmente indirizzi/NAV se necessario."
    );
    const fallback: BasketDeployment = {
      network: networkName,
      chainId: chainId.toString(),
      timestamp: new Date().toISOString(),
      baseAsset: ethers.ZeroAddress,
      manager: ethers.ZeroAddress,
      baskets: [],
    };
    return { snapshot: fallback };
  }
}

async function maybePrompt(question: string, fallback?: string): Promise<string | undefined> {
  if (!promptsEnabled()) {
    return fallback;
  }
  return prompt(question, fallback);
}

async function resolveInputs(args: ParsedArgs): Promise<RedeemBasketInputs> {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name || network.chainId.toString();

  const addressesOverride = pickStringArg(
    args,
    ["addresses"],
    ["BASKET_REDEEM_ADDRESSES_PATH", "BASKET_ADDRESSES_PATH"]
  );
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkName, addressesOverride);

  const snapshotOverride = pickStringArg(args, ["snapshot"], ["BASKET_REDEEM_SNAPSHOT_PATH", "BASKET_SNAPSHOT_PATH"]);
  const { snapshot, snapshotPath } = resolveSnapshotOverride(networkName, network.chainId, snapshotOverride);

  const positional = Array.isArray(args._) ? (args._ as string[]) : [];

  const basketIdOverride = pickStringArg(args, ["basket-id"], ["BASKET_REDEEM_BASKET_ID", "BASKET_ID"]);
  const basketInput =
    pickStringArg(args, ["basket", "basket-symbol"], ["BASKET_REDEEM_SYMBOL", "BASKET_SYMBOL", "BASKET"]) ??
    positional[0];

  let descriptor: BasketDescriptor | undefined;
  let basketId = basketIdOverride;

  if (basketId && !ethers.isHexString(basketId, 32)) {
    throw new Error("--basket-id deve essere un bytes32 (lunghezza 66, incluso 0x).");
  }

  if (!descriptor && basketInput) {
    descriptor = findDescriptor(basketInput);
  }

  if (!descriptor && basketId) {
    descriptor = BASKETS.find((entry) => computeBasketId(entry).toLowerCase() === basketId!.toLowerCase());
  }

  if (!descriptor && promptsEnabled()) {
    summarizeBaskets();
    const answer = await prompt("Seleziona il basket (symbol)", BASKETS[0]?.symbol ?? "");
    descriptor = findDescriptor(answer);
  }

  if (!descriptor) {
    throw new Error(
      "Impossibile determinare il basket richiesto. Specifica --basket <symbol> oppure --basket-id <bytes32>."
    );
  }

  if (!basketId) {
    basketId = computeBasketId(descriptor);
  }

  if (!ethers.isHexString(basketId, 32)) {
    throw new Error(`BasketId non valido (${basketId}).`);
  }

  const notionalInput =
    pickStringArg(args, ["notional", "amount", "withdraw"], ["BASKET_REDEEM_NOTIONAL", "BASKET_NOTIONAL"]) ??
    positional[1] ??
    (await maybePrompt("Notional da rimborsare (base asset)", undefined));

  const notionalWeiOverride = pickStringArg(args, ["notional-wei"], ["BASKET_REDEEM_NOTIONAL_WEI"]);
  const notionalWei = notionalWeiOverride
    ? parseBigint(notionalWeiOverride, "Notional in wei")
    : parseDecimalToWei(notionalInput, "Notional da rimborsare");

  const holderInput =
    pickStringArg(args, ["holder", "to", "beneficiary"], ["BASKET_REDEEM_HOLDER", "BASKET_BENEFICIARY"]) ??
    positional[2];

  let holder = holderInput ? normalizeAddress(holderInput, "Holder") : undefined;
  if (!holder) {
    if (promptsEnabled()) {
      holder = await prompt("Indirizzo che possiede le shares", addresses.contracts?.BasketManager);
    } else {
      throw new Error("Holder non specificato.");
    }
  }
  const normalizedHolder = normalizeAddress(holder, "Holder");

  let accountInput = pickStringArg(args, ["account", "from"], ["BASKET_REDEEM_ACCOUNT", "BASKET_ACCOUNT"]);
  if (!accountInput) {
    const [firstSigner] = await ethers.getSigners();
    accountInput = await maybePrompt(
      "Indirizzo dell'operatore (controller)",
      firstSigner ? await firstSigner.getAddress() : undefined
    );
  }

  if (!accountInput) {
    throw new Error("Indirizzo operatore non specificato.");
  }

  const account = normalizeAddress(accountInput, "Indirizzo operatore");

  let signerInput = pickStringArg(args, ["signer", "treasury"], ["BASKET_REDEEM_SIGNER", "BASKET_SIGNER"]);
  if (!signerInput && promptsEnabled()) {
    const accounts = (await ethers.provider.send("eth_accounts", [])) as string[];
    const defaultSigner = accounts[0] ?? account;
    await logAvailableAccounts(defaultSigner);
    signerInput = await prompt("Indirizzo del treasury signer", defaultSigner);
  }
  const signer = normalizeAddress(signerInput, "Treasury signer");

  const signatureInput =
    pickStringArg(args, ["signature"], ["BASKET_REDEEM_SIGNATURE", "BASKET_SIGNATURE"]) ?? positional[3];

  const proofHash = normalizeBytes32(
    pickStringArg(args, ["proof", "proof-hash"], ["BASKET_REDEEM_PROOF", "BASKET_PROOF"]) ?? ethers.ZeroHash,
    "Proof hash"
  );

  const navInput = pickStringArg(args, ["nav"], ["BASKET_REDEEM_NAV", "BASKET_NAV"]);
  const navWeiOverride = pickStringArg(args, ["nav-wei"], ["BASKET_REDEEM_NAV_WEI", "BASKET_NAV_WEI"]);
  const seedNavInput = pickStringArg(args, ["seed-nav"], ["BASKET_REDEEM_SEED_NAV", "BASKET_SEED_NAV"]);

  let nav: bigint | undefined;
  let navTimestamp: number | undefined;

  const navOracleAddress = addresses.contracts?.NAVOracleAdapter ?? snapshot.navOracle ?? snapshot.oracle ?? undefined;

  if (navWeiOverride) {
    nav = parseBigint(navWeiOverride, "NAV (wei)");
  } else if (navInput) {
    nav = parseDecimalToWei(navInput, "NAV (decimale)");
  } else if (navOracleAddress) {
    const navOracle = (await ethers.getContractAt("NAVOracleAdapter", navOracleAddress)) as NAVOracleAdapter;
    try {
      const observation = await navOracle.getObservation(basketId as `0x${string}`);
      nav = observation.nav ?? observation[0];
      navTimestamp = Number(observation.timestamp ?? observation[1]);
    } catch (error) {
      console.warn("⚠️  Impossibile recuperare il NAV dall'oracolo:", (error as Error).message ?? error);
    }
  }

  if ((!nav || nav === 0n) && seedNavInput) {
    if (network.name !== "hardhat" && network.chainId !== 31337n) {
      throw new Error("--seed-nav è disponibile solo sulla rete hardhat/localhost.");
    }
    const seedNavWei = parseDecimalToWei(seedNavInput, "--seed-nav");
    const medianOracleAddress =
      addresses.contracts?.MedianOracle ?? snapshot.medianOracle ?? snapshot.oracle ?? undefined;
    if (!medianOracleAddress) {
      throw new Error(
        "MedianOracle non configurato nello snapshot/addresses. Esegui prima la pipeline di deploy register baskets."
      );
    }

    const navOracleAddressForSeed = navOracleAddress ?? snapshot.navOracle;
    const [defaultSigner] = await ethers.getSigners();
    const assetId = ethers.keccak256(ethers.toUtf8Bytes(descriptor.symbol.toUpperCase()));
    const timestamp = BigInt(Math.floor(Date.now() / 1000));

    const medianOracle = await ethers.getContractAt("MedianOracle", medianOracleAddress, defaultSigner);
    await (await medianOracle.updatePrice(assetId, seedNavWei, timestamp, 18, "CLI", false)).wait();

    if (navOracleAddressForSeed) {
      const navOracleContract = await ethers.getContractAt("NAVOracleAdapter", navOracleAddressForSeed, defaultSigner);
      await (await navOracleContract.updateNAV(basketId as `0x${string}`, seedNavWei)).wait();
    }

    nav = seedNavWei;
    navTimestamp = Number(timestamp);
    console.log(
      `🌱 NAV seed completato per ${descriptor.symbol}: ${ethers.formatUnits(seedNavWei, 18)} USD (timestamp ${navTimestamp}).`
    );
  }

  if (!nav || nav === 0n) {
    throw new Error(
      "NAV non presente in oracolo. Esegui feeder commit oppure usa --seed-nav (hardhat) o --nav/--nav-wei."
    );
  }

  const deadlineInput = pickStringArg(args, ["deadline"], ["BASKET_REDEEM_DEADLINE", "BASKET_DEADLINE"]);
  const deadline = deadlineInput
    ? parseBigint(deadlineInput, "Deadline")
    : BigInt(Math.floor(Date.now() / 1000) + 3600);

  const nonceInput = pickStringArg(args, ["nonce"], ["BASKET_REDEEM_NONCE", "BASKET_NONCE"]);
  const nonce = nonceInput ? parseBigint(nonceInput, "Nonce") : 0n;

  const slippageBps = parseSlippageBps(
    pickStringArg(args, ["slippage", "slippage-bps"], ["BASKET_REDEEM_SLIPPAGE_BPS", "BASKET_SLIPPAGE_BPS"]),
    100
  );

  const dryRun = hasFlag(args, ["dry-run", "dry"], ["BASKET_REDEEM_DRY_RUN", "BASKET_DRY_RUN"]);

  return {
    basketId,
    descriptor,
    notionalWei,
    notionalInput: notionalInput ?? "",
    holder: normalizedHolder,
    account,
    signer,
    signature: signatureInput,
    proofHash,
    nav,
    navTimestamp,
    deadline,
    nonce,
    slippageBps,
    dryRun,
    addressesPath,
    snapshotPath,
    snapshot,
  };
}

async function redeemBasket(inputs: RedeemBasketInputs) {
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const { data: addressesData } = loadAddresses(networkLabel, inputs.addressesPath);
  let addresses = addressesData;

  const treasuryAddress = addresses.contracts?.BasketTreasuryController;
  if (!treasuryAddress) {
    throw new Error(`Nessun BasketTreasuryController registrato nel file di indirizzi (${inputs.addressesPath}).`);
  }

  const managerAddress = addresses.contracts?.BasketManager;
  if (!managerAddress) {
    throw new Error(`Nessun BasketManager registrato nel file di indirizzi (${inputs.addressesPath}).`);
  }

  const navOracleAddress = addresses.contracts?.NAVOracleAdapter;

  const operatorSigner = await getSignerOrImpersonate(inputs.account);
  const treasury = (await ethers.getContractAt(
    "BasketTreasuryController",
    treasuryAddress,
    operatorSigner
  )) as BasketTreasuryController;
  const manager = (await ethers.getContractAt("BasketManager", managerAddress, operatorSigner)) as BasketManager;

  const basketSymbol = inputs.descriptor.symbol.toUpperCase();
  const snapshotToken = inputs.snapshot?.baskets?.find(
    (entry) => entry.symbol?.toUpperCase() === basketSymbol
  )?.tokenAddress;

  let tokenAddress =
    addresses.BasketTokens?.[basketSymbol] ??
    (addresses.contracts?.[`BasketTokens.${basketSymbol}`] as string | undefined) ??
    snapshotToken;

  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    try {
      tokenAddress = await manager.basketTokenOf(inputs.basketId as `0x${string}`);
    } catch (error) {
      throw new Error(
        `Impossibile determinare il BasketToken per ${inputs.descriptor.symbol}: ${(error as Error).message ?? error}`
      );
    }

    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      throw new Error(
        `BasketToken non registrato per ${inputs.descriptor.symbol}. Rieseguire lo script di deploy/register.`
      );
    }

    addresses = saveAddress(networkLabel, ["BasketTokens", basketSymbol], tokenAddress, inputs.addressesPath);
  }

  tokenAddress = ethers.getAddress(tokenAddress);
  const tokenCode = await ethers.provider.getCode(tokenAddress);
  if (!tokenCode || tokenCode === "0x") {
    throw new Error(
      `Nessun contratto BasketToken trovato all'indirizzo ${tokenAddress}. Verificare deploy e snapshot aggiornati.`
    );
  }

  const token = (await ethers.getContractAt("BasketToken", tokenAddress)) as BasketToken;

  const controllerRole = await treasury.CONTROLLER_ROLE();
  const hasControllerRole = await treasury.hasRole(controllerRole, inputs.account);
  if (!hasControllerRole && !inputs.dryRun) {
    throw new Error(`L'operatore ${inputs.account} non possiede il CONTROLLER_ROLE su BasketTreasuryController.`);
  }

  const desiredShares = await manager.quoteMint(inputs.basketId as `0x${string}`, inputs.notionalWei);
  const shareTolerance =
    inputs.slippageBps === 0 ? desiredShares : (desiredShares * BigInt(10_000 + inputs.slippageBps)) / 10_000n;

  const navValue = inputs.nav;
  const navTimestamp = inputs.navTimestamp;
  const deadlineDate = new Date(Number(inputs.deadline) * 1000);

  const ONE_18 = ethers.parseUnits("1", 18);
  let controllerNotional = (desiredShares * ONE_18 + navValue - 1n) / navValue;
  let plannedShares = (controllerNotional * navValue) / ONE_18;
  if (plannedShares < desiredShares) {
    controllerNotional += 1n;
    plannedShares = (controllerNotional * navValue) / ONE_18;
  }

  if (plannedShares > shareTolerance && !inputs.dryRun) {
    throw new Error(
      `La conversione controller richiede ${ethers.formatUnits(plannedShares, 18)} shares, oltre la tolleranza di ${ethers.formatUnits(shareTolerance, 18)}.`
    );
  }

  console.log("\n🔥 Redeem Basket Summary");
  console.log(`   Network: ${networkLabel}`);
  console.log(`   Basket:  ${inputs.descriptor.symbol} (${inputs.descriptor.name})`);
  console.log(`   BasketId: ${inputs.basketId}`);
  console.log(`   Treasury: ${treasuryAddress}`);
  console.log(`   Manager:  ${managerAddress}`);
  if (navOracleAddress) {
    console.log(`   NAV Oracle: ${navOracleAddress}`);
  }
  console.log("\n👥 Partecipanti");
  console.log(`   Operatore:   ${inputs.account}${hasControllerRole ? " (controller)" : ""}`);
  console.log(`   Holder:      ${inputs.holder}`);
  console.log(`   Signer:      ${inputs.signer}`);
  console.log("\n💰 Parametri");
  console.log(`   Notional richiesto:  ${ethers.formatUnits(inputs.notionalWei, 18)} base units`);
  console.log(
    `   NAV corrente:      ${ethers.formatUnits(navValue, 18)} USD${
      navTimestamp ? ` (aggiornato ${new Date(navTimestamp * 1000).toISOString()})` : ""
    }`
  );
  console.log(`   Shares desiderate:  ${ethers.formatUnits(desiredShares, 18)}`);
  console.log(`   Shares calcolate:   ${ethers.formatUnits(plannedShares, 18)}`);
  if (inputs.slippageBps > 0) {
    console.log(`   Shares tollerate (+${inputs.slippageBps} bps): ${ethers.formatUnits(shareTolerance, 18)}`);
  }
  console.log(`   Payload notional:   ${ethers.formatUnits(controllerNotional, 18)} (parametro request.notional)`);
  console.log(`   Deadline:           ${deadlineDate.toISOString()} (${inputs.deadline})`);
  console.log(`   Proof hash:         ${inputs.proofHash}`);
  console.log(`   Nonce:              ${inputs.nonce}`);
  console.log(`   Dry run:            ${inputs.dryRun ? "sì" : "no"}`);

  const request: MintRedeemRequest = {
    basketId: inputs.basketId,
    to: inputs.holder,
    notional: controllerNotional,
    nav: navValue,
    deadline: inputs.deadline,
    proofHash: inputs.proofHash,
    nonce: inputs.nonce,
  };

  const digest = await treasury.computeDigest(request);
  const alreadyUsed = await treasury.usedDigests(digest);
  if (alreadyUsed) {
    throw new Error("La richiesta risulta già utilizzata (digest marcato come usato).");
  }

  let signature = inputs.signature;
  if (!signature) {
    console.log("\n✍️  Nessuna firma fornita. Provo a firmare con il treasury signer locale...");
    const signerAccount = await getSignerOrImpersonate(inputs.signer);
    const domain = basketTreasuryDomain(network.chainId, treasuryAddress);
    signature = await signMintRedeem(signerAccount, domain, request);
    console.log(`   Firma generata: ${signature}`);
  }

  const isSignatureValid = await treasury.verifySignature(inputs.signer, request, signature);
  if (!isSignatureValid) {
    throw new Error("La firma fornita non è valida per il treasury signer specificato.");
  }

  const balanceBefore = await token.balanceOf(inputs.holder);
  console.log(`\n🔍 Pre-flight checks:`);
  console.log(`   Holder balance: ${ethers.formatUnits(balanceBefore, 18)} shares`);

  if (balanceBefore < plannedShares) {
    const message = `Saldo insufficiente: servono ${ethers.formatUnits(plannedShares, 18)} shares`;
    if (inputs.dryRun) {
      console.warn(`   ⚠️  ${message}`);
    } else {
      throw new Error(message);
    }
  }

  if (inputs.dryRun) {
    const estimatedValue = (plannedShares * navValue) / ONE_18;
    console.log("\n🧪 Modalità DRY-RUN: nessuna transazione verrà inviata.");
    console.log(`   Valore stimato del rimborso: ${formatUsd(estimatedValue)}`);
    return;
  }

  console.log("\n🔥 Invia transazione redeemWithProof...");
  const tx = await treasury.redeemWithProof(request, signature, inputs.signer);
  console.log(`   Tx hash: ${tx.hash}`);
  const receipt = await tx.wait();
  const blockNumber = receipt?.blockNumber;
  console.log(`   Confermata nel blocco ${blockNumber}`);

  const balanceAfter = await token.balanceOf(inputs.holder);
  const burnedShares = balanceBefore - balanceAfter;
  const redeemedValue = (burnedShares * navValue) / ONE_18;

  console.log("\n✅ Redeem completato");
  console.log(`   Shares bruciate: ${ethers.formatUnits(burnedShares, 18)}`);
  console.log(`   Valore stimato: ${formatUsd(redeemedValue)}`);
  console.log(`   Nuovo saldo holder: ${ethers.formatUnits(balanceAfter, 18)}`);

  const operationRecord = {
    type: "basket_redeem",
    network: networkLabel,
    timestamp: new Date().toISOString(),
    basket: {
      symbol: inputs.descriptor.symbol,
      name: inputs.descriptor.name,
      region: inputs.descriptor.region,
      strategy: inputs.descriptor.strategy,
      basketId: inputs.basketId,
    },
    params: {
      account: inputs.account,
      holder: inputs.holder,
      notionalInput: inputs.notionalInput,
      notionalWei: inputs.notionalWei.toString(),
      controllerNotional: controllerNotional.toString(),
      nav: navValue.toString(),
      deadline: inputs.deadline.toString(),
      proofHash: inputs.proofHash,
      nonce: inputs.nonce.toString(),
      signer: inputs.signer,
      signature,
      slippageBps: inputs.slippageBps,
      desiredShares: desiredShares.toString(),
      plannedShares: plannedShares.toString(),
      toleranceShares: shareTolerance.toString(),
      digest,
    },
    nav: {
      value: navValue.toString(),
      timestamp: navTimestamp ?? null,
    },
    results: {
      burnedShares: burnedShares.toString(),
      redeemedValueUsd: redeemedValue.toString(),
      balances: {
        before: balanceBefore.toString(),
        after: balanceAfter.toString(),
      },
      transaction: {
        hash: tx.hash,
        blockNumber,
        gasUsed: receipt?.gasUsed?.toString() ?? null,
      },
    },
    meta: {
      addressesPath: inputs.addressesPath,
      snapshotPath: inputs.snapshotPath ?? null,
    },
  };

  saveOperation(networkLabel, "basket_redeem", operationRecord);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help === true) {
      printHelp();
      return;
    }
    const inputs = await resolveInputs(args);
    await redeemBasket(inputs);
  } catch (error) {
    console.error("❌ Redeem basket fallito:", (error as Error).message ?? error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}

export { redeemBasket };
