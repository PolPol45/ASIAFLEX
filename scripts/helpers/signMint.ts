import hre from "hardhat";

const { ethers } = hre;

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i += 2) {
    const key = raw[i];
    const value = raw[i + 1];
    if (!key || !value) {
      continue;
    }
    args[key.replace(/^--/, "")] = value;
  }
  return args;
}

async function main() {
  const params = parseArgs();
  const basketId = params.basket;
  const treasury = params.treasury;

  if (!basketId) {
    throw new Error("Missing --basket <bytes32>");
  }
  if (!treasury) {
    throw new Error("Missing --treasury <address>");
  }

  const [signer] = await ethers.getSigners();
  const network = await signer.provider!.getNetwork();

  const domain = {
    name: "BasketTreasury",
    version: "1",
    chainId: Number(network.chainId),
    verifyingContract: treasury,
  };

  const types = {
    MintRedeem: [
      { name: "basketId", type: "bytes32" },
      { name: "to", type: "address" },
      { name: "notional", type: "uint256" },
      { name: "nav", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "proofHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const message = {
    basketId,
    to: params.to ?? signer.address,
    notional: params.notional ? BigInt(params.notional) : 0n,
    nav: params.nav ? BigInt(params.nav) : 0n,
    deadline: params.deadline ? BigInt(params.deadline) : BigInt(Math.floor(Date.now() / 1000) + 3600),
    proofHash: params.proof ?? ethers.ZeroHash,
    nonce: params.nonce ? BigInt(params.nonce) : 0n,
  };

  const signature = await signer.signTypedData(domain, types, message);

  console.log(
    JSON.stringify(
      {
        domain,
        types,
        message,
        signature,
        signer: signer.address,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to sign basket mint payload", error);
  process.exitCode = 1;
});
