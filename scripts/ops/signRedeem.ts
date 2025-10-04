import "dotenv/config";
import hre from "hardhat";
import { loadDeployment } from "./utils/deployments";
import { prompt, promptsEnabled } from "./utils/prompt";
import { logAvailableAccounts } from "./utils/signer";

const { ethers } = hre;

type RedeemRequest = {
  from: string;
  amount: bigint;
  timestamp: bigint;
  reserveHash: string;
};

type ParsedInput = {
  from?: string;
  amount?: string;
  reserveHash?: string;
  timestamp?: string;
  signer?: string;
};

function parseArgs(): ParsedInput {
  const args = process.argv.slice(2);
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const flags = args.filter((arg) => arg.startsWith("--"));

  const [from, amount, reserveHash, timestamp] = positional;
  let signer: string | undefined;

  for (const flag of flags) {
    if (flag.startsWith("--signer=")) {
      signer = flag.slice("--signer=".length);
    }
  }

  return { from, amount, reserveHash, timestamp, signer };
}

function normalizeAddress(label: string, value?: string): string {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${label} non valido: ${value}`);
  }
  return ethers.getAddress(value);
}

function normalizeBytes32(label: string, value?: string): string {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  if (!ethers.isHexString(value)) {
    throw new Error(`${label} deve essere una stringa esadecimale valida.`);
  }
  if (ethers.dataLength(value) !== 32) {
    throw new Error(`${label} deve contenere esattamente 32 byte.`);
  }
  return value;
}

function parseTimestamp(label: string, value?: string): bigint {
  if (!value) {
    throw new Error(`${label} non specificato.`);
  }
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${label} deve essere un intero (secondi epoch).`);
  }
  return BigInt(value);
}

async function resolveInputs(): Promise<{ request: RedeemRequest; signerAddress: string }> {
  const cli = parseArgs();

  let from = cli.from ?? process.env.REDEEM_FROM;
  let amount = cli.amount ?? process.env.REDEEM_AMOUNT;
  let reserveHash = cli.reserveHash ?? process.env.REDEEM_RESERVE_HASH;
  let timestamp = cli.timestamp ?? process.env.REDEEM_TIMESTAMP;
  let signer = cli.signer ?? process.env.REDEEM_SIGNER;

  if (!from && promptsEnabled()) {
    from = await prompt("Indirizzo dell'utente da rimborsare");
  }
  const normalizedFrom = normalizeAddress("Indirizzo utente", from);

  if (!amount && promptsEnabled()) {
    amount = await prompt("Importo AFX da rimborsare (in token interi)");
  }
  if (!amount) {
    throw new Error("Importo non specificato.");
  }
  const amountWei = ethers.parseEther(amount);

  if (!reserveHash && promptsEnabled()) {
    reserveHash = await prompt("Reserve hash (bytes32)");
  }
  const normalizedReserve = normalizeBytes32("Reserve hash", reserveHash);

  if (!timestamp && promptsEnabled()) {
    const now = Math.floor(Date.now() / 1000).toString();
    timestamp = await prompt("Timestamp della richiesta (secondi)", now);
  }
  const parsedTimestamp = parseTimestamp("Timestamp", timestamp);

  if (!signer) {
    const accounts = (await hre.network.provider.send("eth_accounts", [])) as string[];
    const defaultSigner = accounts[0];
    if (promptsEnabled()) {
      await logAvailableAccounts(defaultSigner);
    }
    signer = await prompt("Indirizzo treasury signer", defaultSigner);
  }
  const signerAddress = normalizeAddress("Signer", signer);

  return {
    request: {
      from: normalizedFrom,
      amount: amountWei,
      timestamp: parsedTimestamp,
      reserveHash: normalizedReserve,
    },
    signerAddress,
  };
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const deployment = await loadDeployment(network.name, network.chainId);

  const controllerAddress = deployment.addresses?.TreasuryController;
  if (!controllerAddress || !ethers.isAddress(controllerAddress)) {
    throw new Error("Nessun TreasuryController valido trovato nel file di deployment.");
  }

  const { request, signerAddress } = await resolveInputs();
  const signer = await ethers.getSigner(signerAddress);

  const domain = {
    name: "TreasuryController",
    version: "1",
    chainId: network.chainId,
    verifyingContract: controllerAddress,
  };

  const types = {
    RedeemRequest: [
      { name: "from", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "reserveHash", type: "bytes32" },
    ],
  };

  console.log("\n📄 Payload EIP712 (RedeemRequest):");
  console.log(JSON.stringify(request, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2));

  const signature = await signer.signTypedData(domain, types, request);
  console.log("\n✍️  Firma generata:");
  console.log(signature);

  console.log("\n👉 Usa questi parametri nello script di redeem (REDEEM_SIGNATURE, ecc.).");
}

main().catch((error) => {
  console.error("❌ SignRedeem failed:", error);
  process.exitCode = 1;
});
