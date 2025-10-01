import hre from "hardhat";

const { ethers } = hre;

export interface SignerOptions {
  balanceEther?: string;
}

function normalizeAddress(address: string): string {
  try {
    return ethers.getAddress(address);
  } catch {
    throw new Error(`Indirizzo non valido: ${address}`);
  }
}

async function listProviderAccounts(): Promise<string[]> {
  const accounts = (await hre.network.provider.send("eth_accounts", [])) as string[];
  return accounts.map((account) => ethers.getAddress(account));
}

function canImpersonateNetwork(chainId: bigint, name?: string): boolean {
  if (chainId === BigInt(31337)) {
    return true;
  }

  const normalized = (name ?? "").toLowerCase();
  return normalized === "hardhat" || normalized === "localhost";
}

export async function logAvailableAccounts(defaultAddress?: string): Promise<void> {
  const accounts = await listProviderAccounts();
  if (accounts.length === 0) {
    return;
  }

  console.log("\n👥 Account locali rilevati:");
  accounts.forEach((account, idx) => {
    const marker = defaultAddress && account.toLowerCase() === defaultAddress.toLowerCase() ? " (default)" : "";
    console.log(`  [${idx}] ${account}${marker}`);
  });
}

export async function getSignerOrImpersonate(address: string, options?: SignerOptions) {
  const target = normalizeAddress(address);
  const accounts = await listProviderAccounts();

  if (!accounts.map((account) => account.toLowerCase()).includes(target.toLowerCase())) {
    const network = await ethers.provider.getNetwork();
    if (!canImpersonateNetwork(network.chainId, network.name)) {
      throw new Error(
        `Impossibile ottenere un signer per ${target}. Aggiungi la chiave privata al network config oppure esegui su una rete che supporti l'impersonation.`
      );
    }

    console.log(`🔓 Impersono l'account ${target} su ${network.name ?? "unknown"}...`);
    await hre.network.provider.send("hardhat_impersonateAccount", [target]);

    const balanceEther = options?.balanceEther ?? "10";
    await hre.network.provider.send("hardhat_setBalance", [target, ethers.toBeHex(ethers.parseEther(balanceEther))]);
  }

  return await ethers.getSigner(target);
}
