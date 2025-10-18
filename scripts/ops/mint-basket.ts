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

type MintBasketInputs = {
  basketId: string;
  descriptor: BasketDescriptor;
  depositWei: bigint;
  depositInput: string;
  beneficiary: string;
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

function printHelp(): void {
  console.log(
    "Usage: node scripts/ops/mint-basket.ts --basket <symbol> --deposit <amount> --beneficiary <address> [options]\n"
  );
  console.log("Required flags:");
  console.log("  --basket <symbol>           Basket symbol (e.g. EUFX)");
  console.log("  --deposit <amount>          Base asset deposit amount (decimal, 18 decimals)");
  console.log("  --beneficiary <address>     Recipient of the BasketToken shares");
  console.log("\nOptional flags:");
  console.log("  --account <address>         Operator/controller address (defaults to first signer)");
  console.log("  --signer <address>          Treasury signer for proof generation");
  console.log("  --nav <decimal>             Override NAV price (18 decimals)");
  console.log("  --seed-nav <decimal>        Seed NAV locally (solo hardhat)");
  console.log("  --slippage <bps>            Max slippage in basis points (default 100)");
  console.log("  --dry-run                   Preview mint without sending transaction");
  console.log("  --addresses <path>          Deployment file override");
  console.log("  --snapshot <path>           Basket snapshot override");
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

async function resolveInputs(args: ParsedArgs): Promise<MintBasketInputs> {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name || network.chainId.toString();

  const addressesOverride = pickStringArg(args, ["addresses"], ["BASKET_ADDRESSES_PATH"]);
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkName, addressesOverride);

  const snapshotOverride = pickStringArg(args, ["snapshot"], ["BASKET_SNAPSHOT_PATH"]);
  const { snapshot, snapshotPath } = resolveSnapshotOverride(networkName, network.chainId, snapshotOverride);

  const positional = Array.isArray(args._) ? (args._ as string[]) : [];

  const basketIdOverride = pickStringArg(args, ["basket-id"], ["BASKET_ID"]);
  const basketInput = pickStringArg(args, ["basket", "basket-symbol"], ["BASKET_SYMBOL", "BASKET"]) ?? positional[0];

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

  const depositInput =
    pickStringArg(args, ["deposit"], ["BASKET_DEPOSIT"]) ??
    positional[1] ??
    (await maybePrompt("Importo da depositare (in base asset)", undefined));

  const depositWeiOverride = pickStringArg(args, ["deposit-wei"], ["BASKET_DEPOSIT_WEI"]);
  const depositWei = depositWeiOverride
    ? parseBigint(depositWeiOverride, "Importo in wei")
    : parseDecimalToWei(depositInput, "Importo da depositare");

  const beneficiaryInput = pickStringArg(args, ["beneficiary", "to"], ["BASKET_BENEFICIARY"]) ?? positional[2];

  let accountInput = pickStringArg(args, ["account", "from"], ["BASKET_ACCOUNT"]);

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

  let beneficiary = beneficiaryInput ? normalizeAddress(beneficiaryInput, "Beneficiario") : undefined;
  if (!beneficiary) {
    if (promptsEnabled()) {
      beneficiary = await prompt("Indirizzo beneficiario", account);
    } else {
      throw new Error("Beneficiario non specificato.");
    }
  }
  const normalizedBeneficiary = normalizeAddress(beneficiary, "Beneficiario");

  let signerInput = pickStringArg(args, ["signer", "treasury"], ["BASKET_SIGNER"]);
  if (!signerInput && promptsEnabled()) {
    const accounts = (await ethers.provider.send("eth_accounts", [])) as string[];
    const defaultSigner = accounts[0] ?? account;
    await logAvailableAccounts(defaultSigner);
    signerInput = await prompt("Indirizzo del treasury signer", defaultSigner);
  }
  const signer = normalizeAddress(signerInput, "Treasury signer");

  const signatureInput = pickStringArg(args, ["signature"], ["BASKET_SIGNATURE"]) ?? positional[3];

  const proofHash = normalizeBytes32(
    pickStringArg(args, ["proof", "proof-hash"], ["BASKET_PROOF"]) ?? ethers.ZeroHash,
    "Proof hash"
  );

  const navInput = pickStringArg(args, ["nav"], ["BASKET_NAV"]);
  const navWeiOverride = pickStringArg(args, ["nav-wei"], ["BASKET_NAV_WEI"]);
  const seedNavInput = pickStringArg(args, ["seed-nav"], ["BASKET_SEED_NAV"]);

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

  const deadlineInput = pickStringArg(args, ["deadline"], ["BASKET_DEADLINE"]);
  const deadline = deadlineInput
    ? parseBigint(deadlineInput, "Deadline")
    : BigInt(Math.floor(Date.now() / 1000) + 3600);

  const nonceInput = pickStringArg(args, ["nonce"], ["BASKET_NONCE"]);
  const nonce = nonceInput ? parseBigint(nonceInput, "Nonce") : 0n;

  const slippageBps = parseSlippageBps(pickStringArg(args, ["slippage", "slippage-bps"], ["BASKET_SLIPPAGE_BPS"]), 100);

  const dryRun = hasFlag(args, ["dry-run", "dry"], ["BASKET_DRY_RUN"]);

  return {
    basketId,
    descriptor,
    depositWei,
    depositInput: depositInput ?? "",
    beneficiary: normalizedBeneficiary,
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

async function mintBasket(inputs: MintBasketInputs) {
  const network = await ethers.provider.getNetwork();
  const networkLabel = network.name || network.chainId.toString();

  const { basketId, descriptor } = inputs;

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

  const basketSymbol = descriptor.symbol.toUpperCase();
  const snapshotToken = inputs.snapshot?.baskets?.find(
    (entry) => entry.symbol?.toUpperCase() === basketSymbol
  )?.tokenAddress;

  let tokenAddress =
    addresses.BasketTokens?.[basketSymbol] ??
    (addresses.contracts?.[`BasketTokens.${basketSymbol}`] as string | undefined) ??
    snapshotToken;

  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    try {
      tokenAddress = await manager.basketTokenOf(basketId as `0x${string}`);
    } catch (error) {
      throw new Error(
        `Impossibile determinare il BasketToken per ${descriptor.symbol}: ${(error as Error).message ?? error}`
      );
    }

    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      throw new Error(`BasketToken non registrato per ${descriptor.symbol}. Rieseguire lo script di deploy/register.`);
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

  const notional = inputs.depositWei;
  let expectedShares: bigint;
  try {
    expectedShares = await manager.quoteMint(basketId as `0x${string}`, notional);
  } catch (error) {
    throw new Error(`quoteMint fallita: ${(error as Error).message ?? error}`);
  }

  const minTokensOut =
    inputs.slippageBps === 0 ? expectedShares : (expectedShares * BigInt(10_000 - inputs.slippageBps)) / 10_000n;

  const navValue = inputs.nav;
  const navTimestamp = inputs.navTimestamp;

  const deadlineDate = new Date(Number(inputs.deadline) * 1000);

  console.log("\n🧺 Mint Basket Summary");
  console.log(`   Network: ${networkLabel}`);
  console.log(`   Basket:  ${descriptor.symbol} (${descriptor.name})`);
  console.log(`   BasketId: ${basketId}`);
  console.log(`   Treasury: ${treasuryAddress}`);
  console.log(`   Manager:  ${managerAddress}`);
  if (navOracleAddress) {
    console.log(`   NAV Oracle: ${navOracleAddress}`);
  }
  console.log("\n👥 Partecipanti");
  console.log(`   Operatore:   ${inputs.account}${hasControllerRole ? " (controller)" : ""}`);
  console.log(`   Beneficiario: ${inputs.beneficiary}`);
  console.log(`   Signer:      ${inputs.signer}`);
  console.log("\n💰 Parametri");
  console.log(`   Deposito:        ${ethers.formatUnits(notional, 18)} base units`);
  console.log(
    `   NAV corrente:    ${ethers.formatUnits(navValue, 18)} USD${
      navTimestamp ? ` (aggiornato ${new Date(navTimestamp * 1000).toISOString()})` : ""
    }`
  );
  console.log(`   Shares attese:   ${ethers.formatUnits(expectedShares, 18)}`);
  if (inputs.slippageBps > 0) {
    console.log(`   Min shares (${inputs.slippageBps} bps slippage): ${ethers.formatUnits(minTokensOut, 18)}`);
  }
  console.log(`   Deadline:        ${deadlineDate.toISOString()} (${inputs.deadline})`);
  console.log(`   Proof hash:      ${inputs.proofHash}`);
  console.log(`   Nonce:           ${inputs.nonce}`);
  console.log(`   Dry run:         ${inputs.dryRun ? "sì" : "no"}`);

  const request: MintRedeemRequest = {
    basketId,
    to: inputs.beneficiary,
    notional,
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

  const balanceBefore = await token.balanceOf(inputs.beneficiary);

  if (inputs.dryRun) {
    const estimatedValue = (expectedShares * navValue) / 10n ** 18n;
    console.log("\n🧪 Modalità DRY-RUN: nessuna transazione verrà inviata.");
    console.log(`   Valore stimato delle shares: ${formatUsd(estimatedValue)}`);
    return;
  }

  console.log("\n🚀 Invia transazione mintWithProof...");
  const tx = await treasury.mintWithProof(request, signature, inputs.signer);
  console.log(`   Tx hash: ${tx.hash}`);
  const receipt = await tx.wait();
  const blockNumber = receipt?.blockNumber;
  console.log(`   Confermata nel blocco ${blockNumber}`);

  const balanceAfter = await token.balanceOf(inputs.beneficiary);
  const mintedShares = balanceAfter - balanceBefore;
  const mintedValue = (mintedShares * navValue) / ethers.parseUnits("1", 18);

  console.log("\n✅ Mint completato");
  console.log(`   Shares mintate: ${ethers.formatUnits(mintedShares, 18)}`);
  console.log(`   Valore stimato: ${formatUsd(mintedValue)}`);
  console.log(`   Nuovo saldo beneficiario: ${ethers.formatUnits(balanceAfter, 18)}`);

  const operationRecord = {
    type: "basket_mint",
    network: networkLabel,
    timestamp: new Date().toISOString(),
    basket: {
      symbol: descriptor.symbol,
      name: descriptor.name,
      region: descriptor.region,
      strategy: descriptor.strategy,
      basketId,
    },
    params: {
      account: inputs.account,
      beneficiary: inputs.beneficiary,
      depositInput: inputs.depositInput,
      depositWei: inputs.depositWei.toString(),
      nav: navValue.toString(),
      deadline: inputs.deadline.toString(),
      proofHash: inputs.proofHash,
      nonce: inputs.nonce.toString(),
      signer: inputs.signer,
      signature,
      slippageBps: inputs.slippageBps,
      minTokensOut: minTokensOut.toString(),
      digest,
    },
    nav: {
      value: navValue.toString(),
      timestamp: navTimestamp ?? null,
    },
    results: {
      mintedShares: mintedShares.toString(),
      mintedValueUsd: mintedValue.toString(),
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

  saveOperation(networkLabel, "basket_mint", operationRecord);
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help === true) {
      printHelp();
      return;
    }
    const inputs = await resolveInputs(args);
    await mintBasket(inputs);
  } catch (error) {
    console.error("❌ Mint basket fallito:", (error as Error).message ?? error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}

export { mintBasket };
