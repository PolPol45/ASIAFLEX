import "dotenv/config";
import { ethers } from "hardhat";
import type { AsiaFlexToken } from "../../typechain-types";
import { ensureOracleNav, showNavQuote } from "./utils/nav";
import { getSignerOrImpersonate, logAvailableAccounts } from "./utils/signer";
import { saveOperation } from "./utils/operations";
import { prompt, promptsEnabled } from "./utils/prompt";
import { loadAddresses, saveAddress } from "../helpers/addresses";

interface BurnParams {
  from: string;
  amount: string;
  attestationHash?: string;
  signer: string;
  dryRun?: boolean;
  addressesPath?: string;
}

interface ParsedInput {
  from?: string;
  amount?: string;
  attestationHash?: string;
  signer?: string;
  dryRun: boolean;
  addressesPath?: string;
}

function parseInputArgs(): ParsedInput {
  const rawArgs = process.argv.slice(2);

  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
  const flagArgs = rawArgs.filter((arg) => arg.startsWith("--"));

  const [cliFrom, cliAmount, cliAttestation] = positionalArgs;
  let dryRunFlag = false;
  let signerFlag: string | undefined;

  let addressesFlag: string | undefined;

  for (let i = 0; i < flagArgs.length; i++) {
    const flag = flagArgs[i];
    if (flag === "--dry-run") {
      dryRunFlag = true;
      continue;
    }

    if (flag.startsWith("--signer=")) {
      signerFlag = flag.slice("--signer=".length);
      continue;
    }

    if (flag.startsWith("--addresses=")) {
      addressesFlag = flag.slice("--addresses=".length);
      continue;
    }

    if (flag === "--addresses" && flagArgs[i + 1] && !flagArgs[i + 1].startsWith("--")) {
      addressesFlag = flagArgs[i + 1];
      i += 1;
      continue;
    }
  }

  return {
    from: cliFrom,
    amount: cliAmount,
    attestationHash: cliAttestation,
    signer: signerFlag,
    dryRun: dryRunFlag,
    addressesPath: addressesFlag,
  };
}

async function resolveBurnParams(): Promise<BurnParams> {
  const cli = parseInputArgs();

  const initialAccount = cli.from ?? process.env.BURN_FROM;
  let from = initialAccount;
  let amountInput = cli.amount ?? process.env.BURN_AMOUNT;
  const attestationHash = cli.attestationHash ?? process.env.BURN_ATTESTATION;
  const initialSigner = cli.signer ?? process.env.BURN_SIGNER;
  const dryRun = cli.dryRun || (process.env.BURN_DRY_RUN ?? "").toLowerCase() === "true";
  const addressesPath = cli.addressesPath ?? process.env.BURN_ADDRESSES_PATH;

  if (!amountInput) {
    amountInput = await prompt("Quanti AFX vuoi bruciare?");
  }

  if (!amountInput) {
    throw new Error("Nessun importo fornito per il burn.");
  }

  let amount: string;
  try {
    amount = ethers.parseEther(amountInput).toString();
  } catch (error) {
    throw new Error(`Importo non valido: ${amountInput}`);
  }

  if (!from) {
    from = await selectAccount("Seleziona o inserisci l'indirizzo da cui bruciare i token", initialAccount);
  }

  if (!from || !ethers.isAddress(from)) {
    throw new Error("Indirizzo mittente mancante o non valido.");
  }

  const normalizedFrom = ethers.getAddress(from);

  let signerCandidate = initialSigner;

  if (!signerCandidate) {
    if (promptsEnabled()) {
      await logAvailableAccounts(normalizedFrom);
    }
    signerCandidate = await selectAccount(
      "Seleziona o inserisci l'indirizzo Treasury che firmerà il burn",
      normalizedFrom
    );
  }

  if (!signerCandidate || !ethers.isAddress(signerCandidate)) {
    throw new Error("Indirizzo signer mancante o non valido.");
  }

  const normalizedSigner = ethers.getAddress(signerCandidate);

  return {
    from: normalizedFrom,
    amount,
    attestationHash,
    signer: normalizedSigner,
    dryRun,
    addressesPath,
  };
}

async function selectAccount(question: string, defaultValue?: string): Promise<string> {
  const signers = await ethers.getSigners();
  const uniqueAddresses = Array.from(
    new Map(signers.map((signer) => [signer.address.toLowerCase(), signer.address])).values()
  );

  if (uniqueAddresses.length > 0 && promptsEnabled()) {
    console.log("\n👥 Account disponibili:");
    uniqueAddresses.forEach((address, index) => {
      const marker = defaultValue && address.toLowerCase() === defaultValue.toLowerCase() ? " (default)" : "";
      console.log(`  [${index}] ${address}${marker}`);
    });
  }

  const answer = await prompt(`${question} (indice o address)`, defaultValue);
  const trimmed = answer.trim();

  if (/^\d+$/.test(trimmed)) {
    const index = Number(trimmed);
    if (index >= 0 && index < uniqueAddresses.length) {
      return uniqueAddresses[index];
    }
    throw new Error(`Indice account non valido: ${trimmed}`);
  }

  return trimmed;
}

async function burn(params: BurnParams) {
  const network = await ethers.provider.getNetwork();
  const signer = await getSignerOrImpersonate(params.signer);
  const signerAddress = await signer.getAddress();
  const networkLabel = network.name || network.chainId.toString();
  const addressesOverride = params.addressesPath;
  const { data: addresses, filePath: addressesPath } = loadAddresses(networkLabel, addressesOverride);
  const tokenAddress = addresses.contracts?.AsiaFlexToken;

  if (!tokenAddress) {
    throw new Error(
      `AsiaFlexToken non registrato nel file di indirizzi (${addressesPath}). Specifica --addresses o aggiorna il deployment.`
    );
  }

  saveAddress(networkLabel, "AsiaFlexToken", tokenAddress, addressesOverride);

  console.log(`🔥 Executing burn operation on ${network.name}`);
  console.log(`👤 Signer: ${signerAddress}`);
  console.log(`🎯 From: ${params.from}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);
  console.log(
    `🔐 Attestation Hash: ${params.attestationHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}`
  );

  const oracleAddress = addresses.contracts?.NAVOracleAdapter;
  const isDryRun = Boolean(params.dryRun);
  const syncedNav = await ensureOracleNav(oracleAddress, isDryRun);
  await showNavQuote(oracleAddress, params.amount, syncedNav, { mode: "burn" });

  const token = (await ethers.getContractAt("AsiaFlexToken", tokenAddress)) as AsiaFlexToken;

  // Pre-flight checks
  console.log("\n🔍 Pre-flight checks:");

  // Check signer has TREASURY_ROLE
  const TREASURY_ROLE = await token.TREASURY_ROLE();
  const hasTreasuryRole = await token.hasRole(TREASURY_ROLE, signerAddress);
  console.log(`   Treasury Role: ${hasTreasuryRole ? "✅" : "❌"}`);
  if (!hasTreasuryRole && !params.dryRun) {
    throw new Error("Signer does not have TREASURY_ROLE");
  }

  // Check contract is not paused
  const isPaused = await token.paused();
  console.log(`   Contract Paused: ${isPaused ? "❌" : "✅"}`);
  if (isPaused && !params.dryRun) {
    throw new Error("Contract is paused");
  }

  // Check account balance
  const balance = await token.balanceOf(params.from);
  console.log(`   Account Balance: ${ethers.formatEther(balance)} AFX`);

  if (BigInt(params.amount) > balance) {
    console.log(`⚠️  Warning: Amount exceeds account balance`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds account balance");
    }
  }

  // Check account is not blacklisted
  const isBlacklisted = await token.isBlacklisted(params.from);
  console.log(`   Account Blacklisted: ${isBlacklisted ? "❌" : "✅"}`);
  if (isBlacklisted && !params.dryRun) {
    throw new Error("Account is blacklisted");
  }

  // Show impact on daily limits
  const remainingNetInflow = await token.getRemainingDailyNetInflows();
  console.log(`   Current Daily Net Inflow Used: ${ethers.formatEther(await token.dailyNetInflowAmount())} AFX`);
  console.log(`   Remaining Daily Net Inflow: ${ethers.formatEther(remainingNetInflow)} AFX`);
  console.log(`   ℹ️  Burning will reduce net inflow pressure`);

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log("✅ All checks passed - burn would succeed");
    return;
  }

  // Execute burn
  console.log("\n🚀 Executing burn...");
  const attestationHash = params.attestationHash || ethers.ZeroHash;

  try {
    const tx = await token.connect(signer).burn(params.from, params.amount, attestationHash);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Log new balances
    const newBalance = await token.balanceOf(params.from);
    const newTotalSupply = await token.totalSupply();
    console.log(`📊 New account balance: ${ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 New total supply: ${ethers.formatEther(newTotalSupply)} AFX`);

    // Save operation
    const operation = {
      type: "burn",
      network: networkLabel,
      timestamp: new Date().toISOString(),
      signer: signerAddress,
      params,
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      },
      results: {
        accountBalance: newBalance.toString(),
        totalSupply: newTotalSupply.toString(),
      },
    };

    saveOperation(networkLabel, "burn", operation);
    console.log("🔒 Burn eseguito (dettagli salvati).");
  } catch (error) {
    console.error("❌ Burn failed:", error);
    throw error;
  }
}

// CLI interface
async function main() {
  let params: BurnParams;

  try {
    params = await resolveBurnParams();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log(
      "Usage (Hardhat v2.26+): BURN_FROM=0x... BURN_AMOUNT=123 HARDHAT_NETWORK=localhost npx hardhat run scripts/ops/burn.ts"
    );
    console.log("Legacy (ts-node): npx ts-node scripts/ops/burn.ts 0x... 123 --dry-run");
    process.exit(1);
    return;
  }

  await burn(params);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { burn };
