import { task } from "hardhat/config";

task("accounts", "Mostra gli account disponibili per la rete selezionata", async (_args, hre) => {
  const signers = await hre.ethers.getSigners();

  if (signers.length === 0) {
    console.log(
      "Nessun account disponibile. Assicurati che la rete fornisca chiavi locali o configura le private key nel file hardhat.config.ts."
    );
    return;
  }

  console.log(`Account disponibili su ${hre.network.name} (chainId: ${hre.network.config.chainId ?? "sconosciuto"}):`);
  for (const [index, signer] of signers.entries()) {
    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log(`  [${index}] ${signer.address} — saldo: ${hre.ethers.formatEther(balance)} ETH`);
  }
});
