import "dotenv/config";
import hre from "hardhat";
import type { AsiaFlexToken } from "../../typechain-types";
import axios from "axios";
import { getSignerOrImpersonate } from "./utils/signer";
import { loadDeployment } from "./utils/deployments";
import { saveOperation } from "./utils/operations";
import { prompt, promptsEnabled } from "./utils/prompt";

const { ethers } = hre;

type AddressLike = string;

interface TransferParams {
  from: AddressLike;
  to: AddressLike;
  amount: string;
  dryRun?: boolean;
}

interface ParsedInput {
  from?: AddressLike;
  to?: AddressLike;
  amount?: string;
  dryRun: boolean;
}

function parseInputArgs(): ParsedInput {
  const rawArgs = process.argv.slice(2);

  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
  const flagArgs = rawArgs.filter((arg) => arg.startsWith("--"));

  const [cliFrom, cliTo, cliAmount] = positionalArgs;
  const dryRunFlag = flagArgs.includes("--dry-run");

  return {
    from: cliFrom,
    to: cliTo,
    amount: cliAmount,
    dryRun: dryRunFlag,
  };
}

async function resolveTransferParams(): Promise<TransferParams> {
  const cli = parseInputArgs();

  const initialFrom = cli.from ?? process.env.TRANSFER_FROM;
  const initialTo = cli.to ?? process.env.TRANSFER_TO;
  let from = initialFrom;
  let to = initialTo;
  let amountInput = cli.amount ?? process.env.TRANSFER_AMOUNT;
  const dryRun = cli.dryRun || (process.env.TRANSFER_DRY_RUN ?? "").toLowerCase() === "true";

  if (!amountInput) {
    amountInput = await prompt("Quanti AFX vuoi trasferire?");
  }

  if (!amountInput) {
    throw new Error("Nessun importo fornito per il transfer.");
  }

  let amount: string;
  try {
    amount = ethers.parseEther(amountInput).toString();
  } catch (error) {
    throw new Error(`Importo non valido: ${amountInput}`);
  }

  from = await prompt("Indica l'indirizzo mittente", initialFrom);
  if (!from || !ethers.isAddress(from)) {
    throw new Error("Indirizzo mittente mancante o non valido.");
  }

  to = await prompt("Indica l'indirizzo destinatario", initialTo);
  if (!to || !ethers.isAddress(to)) {
    throw new Error("Indirizzo destinatario mancante o non valido.");
  }

  if (from.toLowerCase() === to.toLowerCase()) {
    throw new Error("Indirizzo mittente e destinatario coincidono. Specifica indirizzi diversi.");
  }

  return {
    from,
    to,
    amount,
    dryRun,
  };
}

async function fetchLiveNavPrice(): Promise<bigint | undefined> {
  const symbol = process.env.ETF_SYMBOL ?? "AAXJ";
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  ALPHA_VANTAGE_API_KEY non configurata: impossibile sincronizzare il NAV automaticamente.");
    return undefined;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await axios.get(url, { timeout: 10_000 });
    const priceStr = response.data?.["Global Quote"]?.["05. price"];

    if (!priceStr) {
      console.warn("⚠️  Risposta AlphaVantage priva di prezzo valido:", response.data);
      return undefined;
    }

    return ethers.parseUnits(priceStr, 18);
  } catch (error) {
    console.warn("⚠️  Errore durante il fetch del NAV da AlphaVantage:", (error as Error).message);
    return undefined;
  }
}

async function ensureOracleNav(oracleAddress: string | undefined, dryRun: boolean): Promise<bigint | undefined> {
  if (!oracleAddress || !ethers.isAddress(oracleAddress)) {
    console.warn(
      "ℹ️  Nessun NAVOracleAdapter valido indicato nel file di deployment, salto la sincronizzazione automatica."
    );
    return undefined;
  }

  const liveNav = await fetchLiveNavPrice();
  if (!liveNav) {
    return undefined;
  }

  try {
    const oracle = await ethers.getContractAt("NAVOracleAdapter", oracleAddress);
    const navData = await oracle.getNAV();
    const currentNav: bigint = navData.nav ?? navData[0];

    if (currentNav === liveNav) {
      console.log(`ℹ️  NAV già allineato al valore live (${ethers.formatEther(liveNav)}).`);
      return liveNav;
    }

    if (dryRun) {
      console.log(
        `🧪 DRY RUN: aggiornerei il NAV da ${ethers.formatEther(currentNav)} a ${ethers.formatEther(liveNav)}.`
      );
      return liveNav;
    }

    try {
      const tx = await oracle.updateNAV(liveNav);
      console.log(`🔄 Aggiornamento NAV in corso (tx: ${tx.hash})...`);
      await tx.wait();
      console.log(`✅ NAV aggiornato a ${ethers.formatEther(liveNav)}.`);
      return liveNav;
    } catch (error) {
      const message = (error as Error).message || "";
      if (message.includes("DeviationTooHigh")) {
        console.log("⚠️  DeviationTooHigh: provo ad usare forceUpdateNAV.");
        const tx = await oracle.forceUpdateNAV(liveNav);
        console.log(`🔄 Aggiornamento forzato NAV (tx: ${tx.hash})...`);
        await tx.wait();
        console.log(`✅ NAV aggiornato forzatamente a ${ethers.formatEther(liveNav)}.`);
        return liveNav;
      }

      throw error;
    }
  } catch (error) {
    console.warn("⚠️  Impossibile aggiornare l'oracolo NAV:", (error as Error).message);
    return undefined;
  }
}

async function showPriceQuote(oracleAddress: string | undefined, amountWei: string, navOverride?: bigint) {
  if (!oracleAddress || !ethers.isAddress(oracleAddress)) {
    return;
  }

  try {
    const oracle = await ethers.getContractAt("NAVOracleAdapter", oracleAddress);
    const navData = await oracle.getNAV();
    const navRaw: bigint = navOverride ?? navData.nav ?? navData[0];
    const timestamp = navData.timestamp ?? navData[1];

    const navFloat = Number(ethers.formatEther(navRaw));
    const amountTokens = Number(ethers.formatEther(amountWei));
    const totalValue = navFloat * amountTokens;

    console.log("\n💹 NAV attuale (per 1 AFX): $" + navFloat.toFixed(2));
    console.log(
      `💵 Valore stimato per ${amountTokens} AFX: $${totalValue.toFixed(2)} (ultimo aggiornamento: ${new Date(Number(timestamp) * 1000).toISOString()})`
    );
  } catch (error) {
    console.warn("⚠️  Impossibile recuperare il NAV corrente:", (error as Error).message);
  }
}

async function transferTokens(params: TransferParams) {
  const network = await ethers.provider.getNetwork();

  console.log(`🚚 Executing transfer on ${network.name}`);
  console.log(`👤 Mittente: ${params.from}`);
  console.log(`🎯 Destinatario: ${params.to}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);

  const deployment = await loadDeployment(network.name, network.chainId);
  const oracleAddress: string | undefined = deployment.addresses?.NAVOracleAdapter;
  const syncedNav = await ensureOracleNav(oracleAddress, Boolean(params.dryRun));
  await showPriceQuote(oracleAddress, params.amount, syncedNav);

  const token = (await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken)) as AsiaFlexToken;

  console.log("\n🔍 Pre-flight checks:");

  const isPaused = await token.paused();
  console.log(`   Contract Paused: ${isPaused ? "❌" : "✅"}`);
  if (isPaused && !params.dryRun) {
    throw new Error("Il contratto è in pausa");
  }

  const senderBlacklisted = await token.isBlacklisted(params.from);
  console.log(`   Mittente in blacklist: ${senderBlacklisted ? "❌" : "✅"}`);
  if (senderBlacklisted && !params.dryRun) {
    throw new Error("Il mittente è in blacklist");
  }

  const recipientBlacklisted = await token.isBlacklisted(params.to);
  console.log(`   Destinatario in blacklist: ${recipientBlacklisted ? "❌" : "✅"}`);
  if (recipientBlacklisted && !params.dryRun) {
    throw new Error("Il destinatario è in blacklist");
  }

  const senderBalance = await token.balanceOf(params.from);
  console.log(`   Saldo mittente: ${ethers.formatEther(senderBalance)} AFX`);

  if (BigInt(params.amount) > senderBalance) {
    console.log("⚠️  Attenzione: importo superiore al saldo del mittente");
    if (!params.dryRun) {
      throw new Error("Importo superiore al saldo disponibile");
    }
  }

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - Nessuna transazione verrà inviata");
    console.log("✅ Tutti i controlli superati - il transfer andrebbe a buon fine");
    return;
  }

  const signer = await getSignerOrImpersonate(params.from);

  console.log("\n🚀 Eseguo il transfer...");
  const tokenWithSigner = token.connect(signer);

  try {
    const tx = await tokenWithSigner.transfer(params.to, params.amount);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    const newSenderBalance = await token.balanceOf(params.from);
    const newRecipientBalance = await token.balanceOf(params.to);
    console.log(`📊 Nuovo saldo mittente: ${ethers.formatEther(newSenderBalance)} AFX`);
    console.log(`📊 Nuovo saldo destinatario: ${ethers.formatEther(newRecipientBalance)} AFX`);

    const operation = {
      type: "transfer",
      network: network.name,
      timestamp: new Date().toISOString(),
      params,
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      },
      results: {
        senderBalance: newSenderBalance.toString(),
        recipientBalance: newRecipientBalance.toString(),
      },
    };

    await saveOperation(network.name, "transfer", operation);
  } catch (error) {
    console.error("❌ Transfer failed:", error);
    throw error;
  }
}

async function main() {
  let params: TransferParams;

  try {
    params = await resolveTransferParams();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log(
      "Usage (Hardhat v2.26+): TRANSFER_FROM=0x... TRANSFER_TO=0x... TRANSFER_AMOUNT=123 HARDHAT_NETWORK=localhost npx hardhat run scripts/ops/transfer.ts"
    );
    console.log("Legacy (ts-node): npx ts-node scripts/ops/transfer.ts 0xFrom 0xTo 123 --dry-run");
    process.exit(1);
    return;
  }

  await transferTokens(params);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { transferTokens as transfer };
