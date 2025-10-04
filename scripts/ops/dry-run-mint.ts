import hre from "hardhat";

const { ethers } = hre;

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i += 2) {
    const key = raw[i];
    const value = raw[i + 1];
    if (!key || !value) continue;
    args[key.replace(/^--/, "")] = value;
  }
  return args;
}

async function main() {
  const params = parseArgs();
  const treasuryAddress = params.treasury;
  const basketId = params.basket;
  const signature = params.signature;
  const signer = params.signer;

  if (!treasuryAddress) throw new Error("Missing --treasury <address>");
  if (!basketId) throw new Error("Missing --basket <bytes32>");
  if (!signature) throw new Error("Missing --signature <0x>");
  if (!signer) throw new Error("Missing --signer <address>");

  const notional = params.notional ? BigInt(params.notional) : 0n;
  const nav = params.nav ? BigInt(params.nav) : 0n;
  const deadline = params.deadline ? BigInt(params.deadline) : BigInt(Math.floor(Date.now() / 1000) + 3600);
  const proofHash = params.proof ?? ethers.ZeroHash;
  const nonce = params.nonce ? BigInt(params.nonce) : 0n;
  const recipient = params.to ?? signer;

  const treasury = await ethers.getContractAt("BasketTreasuryController", treasuryAddress);
  const managerAddress = await treasury.basketManager();
  const manager = await ethers.getContractAt("BasketManager", managerAddress);

  const shares = await manager.quoteMint(basketId, notional);
  console.log(`📊 Quote for basket ${basketId}: notional ${notional.toString()} -> shares ${shares.toString()}`);

  const request = {
    basketId,
    to: recipient,
    notional,
    nav,
    deadline,
    proofHash,
    nonce,
  };

  const isValid = await treasury.verifySignature(signer, request, signature);
  console.log(`🔐 Signature valid for signer ${signer}: ${isValid}`);

  if (isValid) {
    const digest = await treasury.computeDigest(request);
    console.log(`🧾 Digest: ${digest}`);
  } else {
    console.warn("⚠️  Signature invalid, skipping digest output.");
  }
}

main().catch((error) => {
  console.error("Dry-run mint script failed", error);
  process.exitCode = 1;
});
