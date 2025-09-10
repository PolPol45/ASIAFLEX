require("dotenv").config();
const hre = require("hardhat");
const readline = require("readline");

// Funzione per chiedere l’indirizzo al terminale
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function main() {
  const [sender] = await hre.ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error("❌ CONTRACT_ADDRESS non definito nel file .env");
  }

  const AsiaFlexToken = await hre.ethers.getContractAt("AsiaFlexToken", contractAddress);

  const recipient = await prompt("👉 Inserisci l'indirizzo del destinatario: ");

  if (!hre.ethers.isAddress(recipient)) {
    throw new Error("❌ L'indirizzo inserito non è valido.");
  }

  const amount = hre.ethers.parseUnits("10", 18); // 10 token con 18 decimali

  console.log(`🚀 Trasferimento di 10 AFX token a ${recipient} in corso...`);

  const tx = await AsiaFlexToken.transfer(recipient, amount);
  console.log("📨 Transazione inviata:", tx.hash);

  await tx.wait();
  console.log(`✅ Trasferimento completato a ${recipient}`);
}

main().catch((error) => {
  console.error("Errore:", error.message || error);
  process.exit(1);
});
