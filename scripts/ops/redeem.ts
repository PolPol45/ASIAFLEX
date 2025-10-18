import "dotenv/config";
import hre from "hardhat";
import { ensureOracleNav, showNavQuote } from "./utils/nav";
import { getSignerOrImpersonate, logAvailableAccounts } from "./utils/signer";
import { loadDeployment } from "./utils/deployments";
import { saveOperation } from "./utils/operations";
import { prompt, promptsEnabled } from "./utils/prompt";

const { ethers } = hre;

interface RedeemParams {
  from: string;
  amount: string; // amount in wei
  reserveHash: string;
  timestamp: bigint;
  signature: string;
  caller: string;
  dryRun: boolean;
}

interface ParsedInput {
  from?: string;
  amount?: string;
  reserveHash?: string;
  timestamp?: string;
  signature?: string;
  caller?: string;
  dryRun: boolean;
}

function parseInputArgs(): ParsedInput {
  const rawArgs = process.argv.slice(2);

  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
  const flagArgs = rawArgs.filter((arg) => arg.startsWith("--"));

  const [cliFrom, cliAmount, cliReserveHash, cliTimestamp, cliSignature] = positionalArgs;

  let dryRunFlag = false;
  let callerFlag: string | undefined;

  for (const flag of flagArgs) {
    if (flag === "--dry-run") {
      dryRunFlag = true;
    } else if (flag.startsWith("--caller=")) {
      callerFlag = flag.slice("--caller=".length);
    }
  }

  return {
    from: cliFrom,
    amount: cliAmount,
    reserveHash: cliReserveHash,
    timestamp: cliTimestamp,
    signature: cliSignature,
    caller: callerFlag,
    dryRun: dryRunFlag,
  };
}

function normalizeHex(value: string | undefined, expectedBytes: number, label: string): string {
  if (!value) {
    throw new Error(`${label} non fornito.`);
  }

  if (!ethers.isHexString(value)) {
    throw new Error(`${label} deve essere una stringa esadecimale valida (0x...).`);
  }

  if (ethers.dataLength(value) !== expectedBytes) {
    throw new Error(`${label} deve avere ${expectedBytes} byte (fornito ${ethers.dataLength(value)}).`);
  }

  return ethers.hexlify(value as `0x${string}`);
}

function parseTimestamp(value: string | undefined): bigint {
  if (!value) {
    throw new Error("Timestamp non fornito.");
  }

  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    throw new Error(`Timestamp non valido: ${value}`);
  }

  const parsed = BigInt(trimmed);
  if (parsed <= 0n) {
    throw new Error("Timestamp deve essere maggiore di zero.");
  }

  return parsed;
}

async function resolveRedeemParams(): Promise<RedeemParams> {
  const cli = parseInputArgs();

  const initialFrom = cli.from ?? process.env.REDEEM_FROM;
  const initialAmount = cli.amount ?? process.env.REDEEM_AMOUNT;
  const initialReserve = cli.reserveHash ?? process.env.REDEEM_RESERVE_HASH;
  const initialTimestamp = cli.timestamp ?? process.env.REDEEM_TIMESTAMP;
  const initialSignature = cli.signature ?? process.env.REDEEM_SIGNATURE;
  const initialCaller = cli.caller ?? process.env.REDEEM_CALLER;
  const dryRun = cli.dryRun || (process.env.REDEEM_DRY_RUN ?? "").toLowerCase() === "true";

  let from = initialFrom;
  let amountInput = initialAmount;
  let reserveHash = initialReserve;
  let timestampInput = initialTimestamp;
  let signature = initialSignature;
  let caller = initialCaller;

  if (!from) {
    from = await prompt("Indirizzo dell'utente che richiede il redeem?");
  }

  if (!from || !ethers.isAddress(from)) {
    throw new Error("Indirizzo utente non valido: specifica un address Ethereum valido.");
  }

  const normalizedFrom = ethers.getAddress(from);

  if (!amountInput) {
    amountInput = await prompt("Quanti AFX vuoi bruciare?");
  }

  if (!amountInput) {
    throw new Error("Nessun importo fornito per il redeem.");
  }

  let amountWei: string;
  try {
    amountWei = ethers.parseEther(amountInput).toString();
  } catch (parseError) {
    const detail = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Importo non valido: ${amountInput}. Dettagli: ${detail}`);
  }

  if (!reserveHash) {
    reserveHash = await prompt("Inserisci il reserve hash (attestazione)");
  }

  const normalizedReserve = normalizeHex(reserveHash, 32, "Reserve hash");

  if (!timestampInput) {
    timestampInput = await prompt("Timestamp UNIX della richiesta di redeem (secondi)");
  }

  const timestamp = parseTimestamp(timestampInput);

  if (!signature) {
    signature = await prompt("Firma EIP712 del treasury per il redeem (0x...)");
  }

  const normalizedSignature = normalizeHex(signature, 65, "Firma");

  if (!caller) {
    const accounts = (await hre.network.provider.send("eth_accounts", [])) as string[];
    const defaultCaller = accounts[0];
    if (promptsEnabled()) {
      await logAvailableAccounts(defaultCaller);
    }
    caller = await prompt("Indirizzo che invierà la transazione di redeem", defaultCaller);
  }

  if (!caller || !ethers.isAddress(caller)) {
    throw new Error("Indirizzo del caller non valido.");
  }

  const normalizedCaller = ethers.getAddress(caller);

  return {
    from: normalizedFrom,
    amount: amountWei,
    reserveHash: normalizedReserve,
    timestamp,
    signature: normalizedSignature,
    caller: normalizedCaller,
    dryRun,
  };
}

async function redeem(params: RedeemParams) {
  const network = await ethers.provider.getNetwork();
  const callerSigner = await getSignerOrImpersonate(params.caller);
  const callerAddress = await callerSigner.getAddress();

  console.log(`🪙 Executing redeem operation on ${network.name}`);
  console.log(`👤 Caller: ${callerAddress}`);
  console.log(`👤 User (from): ${params.from}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);
  console.log(`🔐 Reserve Hash: ${params.reserveHash}`);
  console.log(`🕒 Request Timestamp: ${params.timestamp} (${new Date(Number(params.timestamp) * 1000).toISOString()})`);

  const deployment = await loadDeployment(network.name, network.chainId);
  const tokenAddress = deployment.addresses?.AsiaFlexToken;
  const oracleAddress = deployment.addresses?.NAVOracleAdapter;
  const controllerAddress = deployment.addresses?.TreasuryController;

  if (!controllerAddress || !ethers.isAddress(controllerAddress)) {
    throw new Error("Indirizzo TreasuryController non trovato nel file di deployment.");
  }

  const token = await ethers.getContractAt("AsiaFlexToken", tokenAddress);
  const controller = await ethers.getContractAt("TreasuryController", controllerAddress);

  const syncedNav = await ensureOracleNav(oracleAddress, params.dryRun);
  await showNavQuote(oracleAddress, params.amount, syncedNav, { mode: "burn" });

  console.log("\n🔍 Pre-flight checks:");

  const isPaused = await controller.paused();
  console.log(`   TreasuryController Paused: ${isPaused ? "❌" : "✅"}`);
  if (isPaused && !params.dryRun) {
    throw new Error("TreasuryController è in pausa: impossibile procedere con il redeem.");
  }

  const request = {
    from: params.from,
    amount: params.amount,
    timestamp: params.timestamp,
    reserveHash: params.reserveHash,
  };

  const isSignatureValid = await controller.verifyRedeemSignature(request, params.signature);
  console.log(`   Firma valida: ${isSignatureValid ? "✅" : "❌"}`);
  if (!isSignatureValid && !params.dryRun) {
    throw new Error("Firma EIP712 non valida per la richiesta di redeem.");
  }

  const expirationWindow = await controller.getRequestExpiration();
  const deadline = request.timestamp + expirationWindow;
  const now = BigInt(Math.floor(Date.now() / 1000));
  console.log(`   Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);
  if (now > deadline && !params.dryRun) {
    throw new Error("La richiesta di redeem è scaduta.");
  }

  const alreadyUsed = await controller.isRedeemRequestUsed(request, params.signature);
  console.log(`   Richiesta già utilizzata: ${alreadyUsed ? "❌" : "✅"}`);
  if (alreadyUsed && !params.dryRun) {
    throw new Error("La richiesta di redeem risulta già utilizzata.");
  }

  const userBalance = await token.balanceOf(params.from);
  console.log(`   Saldo utente: ${ethers.formatEther(userBalance)} AFX`);
  if (BigInt(params.amount) > userBalance && !params.dryRun) {
    throw new Error("L'utente non dispone di abbastanza AFX per completare il redeem.");
  }

  const isUserBlacklisted = await token.isBlacklisted(params.from);
  console.log(`   Utente in blacklist: ${isUserBlacklisted ? "❌" : "✅"}`);
  if (isUserBlacklisted && !params.dryRun) {
    throw new Error("L'utente è in blacklist.");
  }

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - Nessuna transazione inviata. Tutti i controlli sono stati superati.");
    return;
  }

  console.log("\n🔥 Esecuzione redeem...");

  try {
    const tx = await controller.connect(callerSigner).executeRedeem(request, params.signature);
    console.log(`📤 Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    const newBalance = await token.balanceOf(params.from);
    const newTotalSupply = await token.totalSupply();

    console.log(`📊 Nuovo saldo utente: ${ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 Nuova total supply: ${ethers.formatEther(newTotalSupply)} AFX`);

    const operation = {
      type: "redeem",
      network: network.name,
      timestamp: new Date().toISOString(),
      caller: callerAddress,
      params: {
        ...params,
        amount: params.amount.toString(),
        timestamp: params.timestamp.toString(),
      },
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      },
      results: {
        userBalance: newBalance.toString(),
        totalSupply: newTotalSupply.toString(),
      },
    };

    saveOperation(network.name, "redeem", operation);
  } catch (error) {
    console.error("❌ Redeem fallito:", error);
    throw error;
  }
}

async function main() {
  let params: RedeemParams;

  try {
    params = await resolveRedeemParams();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log(
      "Usage: HARDHAT_NETWORK=localhost REDEEM_FROM=0x... REDEEM_AMOUNT=123 REDEEM_RESERVE_HASH=0x... REDEEM_TIMESTAMP=1690000000 REDEEM_SIGNATURE=0x... npx hardhat run scripts/ops/redeem.ts"
    );
    console.log(
      "CLI: npx hardhat run scripts/ops/redeem.ts 0xUser 123 0xReserveHash 1690000000 0xSignature --caller=0xOps"
    );
    process.exit(1);
    return;
  }

  await redeem(params);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { redeem };
