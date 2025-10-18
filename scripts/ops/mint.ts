import "dotenv/config";
import hre from "hardhat";
import { ensureOracleNav, showNavQuote } from "./utils/nav";
import { getSignerOrImpersonate, logAvailableAccounts } from "./utils/signer";
import { loadDeployment } from "./utils/deployments";
import { saveOperation } from "./utils/operations";
import { prompt, promptsEnabled } from "./utils/prompt";

const { ethers } = hre;

interface MintParams {
  to: string;
  amount: string;
  attestationHash?: string;
  signer: string;
  dryRun?: boolean;
}

interface ParsedInput {
  to?: string;
  amount?: string;
  attestationHash?: string;
  signer?: string;
  dryRun: boolean;
}

function parseInputArgs(): ParsedInput {
  const rawArgs = process.argv.slice(2);

  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith("--"));
  const flagArgs = rawArgs.filter((arg) => arg.startsWith("--"));

  const [cliTo, cliAmount, cliAttestation] = positionalArgs;
  let dryRunFlag = false;
  let signerFlag: string | undefined;

  for (const flag of flagArgs) {
    if (flag === "--dry-run") {
      dryRunFlag = true;
    } else if (flag.startsWith("--signer=")) {
      signerFlag = flag.slice("--signer=".length);
    }
  }

  return {
    to: cliTo,
    amount: cliAmount,
    attestationHash: cliAttestation,
    signer: signerFlag,
    dryRun: dryRunFlag,
  };
}

async function resolveMintParams(): Promise<MintParams> {
  const cli = parseInputArgs();

  const initialRecipient = cli.to ?? process.env.MINT_TO;
  let to = initialRecipient;
  let amountInput = cli.amount ?? process.env.MINT_AMOUNT;
  const attestationHash = cli.attestationHash ?? process.env.MINT_ATTESTATION;
  const initialSigner = cli.signer ?? process.env.MINT_SIGNER;
  const dryRun = cli.dryRun || (process.env.MINT_DRY_RUN ?? "").toLowerCase() === "true";

  if (!amountInput) {
    amountInput = await prompt("Quanti AFX vuoi mintare?");
  }

  if (!amountInput) {
    throw new Error("Nessun importo fornito per il mint.");
  }

  let amount: string;
  try {
    amount = ethers.parseEther(amountInput).toString();
  } catch (parseError) {
    const detail = parseError instanceof Error ? parseError.message : String(parseError);
    throw new Error(`Importo non valido: ${amountInput}. Dettagli: ${detail}`);
  }

  if (!to) {
    to = await prompt("Inserisci l'indirizzo destinatario", initialRecipient);
  }

  if (!to || !ethers.isAddress(to)) {
    throw new Error(
      "Mint recipient address missing or invalid. Provide it as CLI arg or set MINT_TO/rispondi al prompt con un address valido."
    );
  }

  const normalizedRecipient = ethers.getAddress(to);

  let signerCandidate = initialSigner;

  if (!signerCandidate) {
    const availableAccounts = (await hre.network.provider.send("eth_accounts", [])) as string[];
    const defaultSigner = availableAccounts[0];
    if (promptsEnabled()) {
      await logAvailableAccounts(defaultSigner);
    }
    signerCandidate = await prompt("Indica l'indirizzo Treasury che firmerà il mint", defaultSigner);
  }

  if (!signerCandidate || !ethers.isAddress(signerCandidate)) {
    throw new Error("Indirizzo signer mancante o non valido.");
  }

  const normalizedSigner = ethers.getAddress(signerCandidate);

  return {
    to: normalizedRecipient,
    amount,
    attestationHash,
    signer: normalizedSigner,
    dryRun,
  };
}

async function mint(params: MintParams) {
  const network = await ethers.provider.getNetwork();
  const signer = await getSignerOrImpersonate(params.signer);
  const signerAddress = await signer.getAddress();

  console.log(`🪙 Executing mint operation on ${network.name}`);
  console.log(`👤 Signer: ${signerAddress}`);
  console.log(`🎯 To: ${params.to}`);
  console.log(`💰 Amount: ${ethers.formatEther(params.amount)} AFX`);
  console.log(
    `🔐 Attestation Hash: ${params.attestationHash || "0x0000000000000000000000000000000000000000000000000000000000000000"}`
  );

  const deployment = await loadDeployment(network.name, network.chainId);
  const oracleAddress = deployment.addresses?.NAVOracleAdapter;
  const isDryRun = Boolean(params.dryRun);

  const syncedNav = await ensureOracleNav(oracleAddress, isDryRun);
  await showNavQuote(oracleAddress, params.amount, syncedNav, { mode: "mint" });

  const token = await ethers.getContractAt("AsiaFlexToken", deployment.addresses.AsiaFlexToken);

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

  // Check daily caps
  const remainingMint = await token.getRemainingDailyMint();
  const remainingNetInflow = await token.getRemainingDailyNetInflows();
  console.log(`   Remaining Daily Mint: ${ethers.formatEther(remainingMint)} AFX`);
  console.log(`   Remaining Daily Net Inflow: ${ethers.formatEther(remainingNetInflow)} AFX`);

  if (BigInt(params.amount) > remainingMint) {
    console.log(`⚠️  Warning: Amount exceeds daily mint cap`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds daily mint cap");
    }
  }

  if (BigInt(params.amount) > remainingNetInflow) {
    console.log(`⚠️  Warning: Amount exceeds daily net inflow cap`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds daily net inflow cap");
    }
  }

  // Check supply cap
  const totalSupply = await token.totalSupply();
  const supplyCap = await token.supplyCap();
  const remainingSupply = supplyCap - totalSupply;
  console.log(`   Remaining Supply Cap: ${ethers.formatEther(remainingSupply)} AFX`);

  if (BigInt(params.amount) > remainingSupply) {
    console.log(`⚠️  Warning: Amount exceeds supply cap`);
    if (!params.dryRun) {
      throw new Error("Amount exceeds supply cap");
    }
  }

  // Check recipient is not blacklisted
  const isBlacklisted = await token.isBlacklisted(params.to);
  console.log(`   Recipient Blacklisted: ${isBlacklisted ? "❌" : "✅"}`);
  if (isBlacklisted && !params.dryRun) {
    throw new Error("Recipient is blacklisted");
  }

  if (params.dryRun) {
    console.log("\n🧪 DRY RUN - No transaction will be sent");
    console.log("✅ All checks passed - mint would succeed");
    return;
  }

  // Execute mint
  console.log("\n🚀 Executing mint...");
  const attestationHash = params.attestationHash || ethers.ZeroHash;

  try {
    const tx = await token.connect(signer)["mint(address,uint256,bytes32)"](params.to, params.amount, attestationHash);
    console.log(`📤 Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

    // Log new balances
    const newBalance = await token.balanceOf(params.to);
    const newTotalSupply = await token.totalSupply();
    console.log(`📊 New recipient balance: ${ethers.formatEther(newBalance)} AFX`);
    console.log(`📊 New total supply: ${ethers.formatEther(newTotalSupply)} AFX`);

    // Save operation
    const operation = {
      type: "mint",
      network: network.name,
      timestamp: new Date().toISOString(),
      signer: signerAddress,
      params,
      transaction: {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      },
      results: {
        recipientBalance: newBalance.toString(),
        totalSupply: newTotalSupply.toString(),
      },
    };

    saveOperation(network.name, "mint", operation);
  } catch (error) {
    console.error("❌ Mint failed:", error);
    throw error;
  }
}

// CLI interface
async function main() {
  let params: MintParams;

  try {
    params = await resolveMintParams();
  } catch (error) {
    console.error("❌", (error as Error).message);
    console.log(
      "Usage (Hardhat v2.26+): MINT_TO=0x... MINT_AMOUNT=123 HARDHAT_NETWORK=localhost npx hardhat run scripts/ops/mint.ts"
    );
    console.log("Legacy (direct node/ts-node): npx ts-node scripts/ops/mint.ts 0x... 123 --dry-run");
    process.exit(1);
    return;
  }

  await mint(params);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Script failed:", error);
    process.exitCode = 1;
  });
}

export { mint };
