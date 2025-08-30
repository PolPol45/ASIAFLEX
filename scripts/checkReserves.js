// Robust checkReserves script - diagnostica automatica e messaggi esplicativi
// Supporta più nomi di env var, verifica codice all'indirizzo, effettua call raw e tenta decode,
// prova a caricare l'ABI dall'artifact se necessario e fornisce suggerimenti azionabili.
//
// Uso: node scripts/checkReserves.js [--dry-run]
// Eseguibile anche con: npx hardhat run scripts/checkReserves.js --network sepolia -- --dry-run

require("dotenv").config();
const hre = (() => {
  try { return require("hardhat"); } catch (e) { return null; }
})();
let ethersPkg;
try {
  ethersPkg = require("ethers");
} catch (e) {
  if (hre && hre.ethers) ethersPkg = hre.ethers;
  else ethersPkg = null;
}

function makeProvider(rpc) {
  if (!rpc) return null;
  if (ethersPkg && ethersPkg.JsonRpcProvider) return new ethersPkg.JsonRpcProvider(rpc);
  if (ethersPkg && ethersPkg.providers && ethersPkg.providers.JsonRpcProvider) return new ethersPkg.providers.JsonRpcProvider(rpc);
  if (hre && hre.ethers && hre.ethers.JsonRpcProvider) return new hre.ethers.JsonRpcProvider(rpc);
  throw new Error("Nessun provider JSON-RPC disponibile (installa ethers o esegui con hardhat).");
}

function makeInterface(abi) {
  if (ethersPkg && ethersPkg.Interface) return new ethersPkg.Interface(abi);
  if (hre && hre.ethers && hre.ethers.Interface) return new hre.ethers.Interface(abi);
  throw new Error("Nessuna Interface disponibile (installa ethers o esegui con hardhat).");
}

async function fileExists(path) {
  const fs = require('fs');
  try {
    await fs.promises.access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('dry-run');

  // supporta più nomi di env var
  const address = process.env.CONTRACT_ADDRESS
    || process.env.ASIAFLEX_TOKEN_ADDRESS
    || process.env.ASIAFLEX_TOKEN_ADDR
    || process.env.ASIAFLEX_TOKEN_ADDRESS; // tolleranza per possibili typo

  if (!address) {
    console.error("❌ Nessun indirizzo contratto trovato. Imposta nel .env una delle variabili:");
    console.error("   CONTRACT_ADDRESS, ASIAFLEX_TOKEN_ADDRESS, ASIAFLEX_TOKEN_ADDR");
    process.exit(1);
  }

  const rpc = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
  console.log("🔎 Using RPC:", rpc);
  console.log("🔎 Checking contract address:", address);
  console.log("🔎 dryRun:", dryRun);

  let provider;
  try {
    provider = makeProvider(rpc);
  } catch (err) {
    console.error("❌ Errore creando provider:", err.message || err);
    process.exit(1);
  }

  // 1) controlla codice all'indirizzo
  let code;
  try {
    code = await provider.getCode(address);
  } catch (err) {
    console.error("❌ Errore durante provider.getCode:", err.message || err);
    process.exit(1);
  }

  if (!code || code === "0x") {
    console.error("❌ Nessun contratto deployato all'indirizzo specificato (code === 0x).");
    console.error("   - Controlla che l'indirizzo sia corretto e che la rete RPC sia quella giusta.");
    console.error("   - Variabili env disponibili:", {
      CONTRACT_ADDRESS: !!process.env.CONTRACT_ADDRESS,
      ASIAFLEX_TOKEN_ADDRESS: !!process.env.ASIAFLEX_TOKEN_ADDRESS,
      ASIAFLEX_TOKEN_ADDR: !!process.env.ASIAFLEX_TOKEN_ADDR,
      RPC_PROVIDED: !!(process.env.SEPOLIA_RPC_URL || process.env.RPC_URL)
    });
    console.error("   - Se stai usando Sepolia, verifica l'indirizzo su https://sepolia.etherscan.io/address/" + address);
    process.exit(1);
  }

  console.log("✅ Code length (chars):", code.length);
  console.log("✅ Code (first 200 chars):", code.slice(0, 200));

  // 2) prova call raw per reserves()
  const ifaceReserves = makeInterface(['function reserves() view returns (uint256)']);
  const callData = ifaceReserves.encodeFunctionData('reserves');

  let rawResult;
  try {
    rawResult = await provider.call({ to: address, data: callData });
    console.log("📡 Raw call result for reserves():", rawResult);
  } catch (err) {
    console.error("❌ Errore durante provider.call:", err.message || err);
    // non usciamo subito: proviamo altre strategie
    rawResult = null;
  }

  if (!rawResult || rawResult === '0x') {
    console.warn("⚠️ Raw call ha restituito 0x o nulla: probabilmente il contratto all'indirizzo NON espone reserves() con la stessa signature.");
    console.warn("   Possibili cause:");
    console.warn("   - All'indirizzo è deployato un contratto diverso.");
    console.warn("   - ABI usata non corrisponde alla funzione (signature mismatch).");
    console.warn("   - Stai interrogando la rete sbagliata.");
    // tentiamo di caricare l'ABI artifact locale e verificare la presenza della funzione
    const path = require('path');
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'AsiaFlexToken.sol', 'AsiaFlexToken.json');
    if (await fileExists(artifactPath)) {
      console.log("🔁 Trovato artifact locale:", artifactPath, " - provo a usare ABI dall'artifact e chiamare direttamente tramite contract.");
      try {
        const abi = require(artifactPath).abi;
        const iface = makeInterface(abi);
        const hasReserves = abi.some((item) => item.type === 'function' && item.name === 'reserves');
        console.log("   ABI contains 'reserves'?:", hasReserves);
        if (!hasReserves) {
          console.warn("   L'ABI locale non contiene reserves(); verifica il contratto sorgente.");
        } else {
          // crea contract con ABI e provider, poi chiama reserves()
          const contract = new (hre && hre.ethers && hre.ethers.Contract ? hre.ethers.Contract : (ethersPkg && ethersPkg.Contract)) (address, abi, provider);
          try {
            const reservesVal = await contract.reserves();
            console.log("📊 Current reserves (from artifact ABI):", (hre && hre.ethers && hre.ethers.formatUnits) ? hre.ethers.formatUnits(reservesVal, 18) : (ethersPkg && ethersPkg.formatUnits ? ethersPkg.formatUnits(reservesVal, 18) : String(reservesVal)));
            process.exit(0);
          } catch (err) {
            console.error("❌ Errore chiamando reserves() tramite ABI locale:", err.message || err);
            console.error("   Probabilmente l'indirizzo ospita un contratto diverso o la funzione è protetta/modificata.");
            process.exit(1);
          }
        }
      } catch (err) {
        console.error("❌ Errore caricando artifact locale:", err.message || err);
        process.exit(1);
      }
    } else {
      console.warn("ℹ️ Artifact locale non trovato:", artifactPath);
      console.warn("   Puoi ricompilare con: npx hardhat compile");
      console.warn("   Oppure verificare l'indirizzo su Etherscan per vedere quale ABI/contract è deployato.");
      process.exit(1);
    }
  } else {
    // rawResult contiene dati; proviamo a decodificare
    try {
      const decoded = ifaceReserves.decodeFunctionResult('reserves', rawResult);
      const value = decoded[0];
      console.log("✅ Decodifica raw call andata a buon fine.");
      try {
        const formatted = (hre && hre.ethers && hre.ethers.formatUnits) ? hre.ethers.formatUnits(value, 18) : (ethersPkg && ethersPkg.formatUnits ? ethersPkg.formatUnits(value, 18) : String(value));
        console.log("📊 Current reserves:", formatted, "AFX");
      } catch {
        console.log("📊 Current reserves (raw):", value.toString ? value.toString() : String(value));
      }
      process.exit(0);
    } catch (err) {
      console.error("❌ Impossibile decodificare rawResult con signature reserves():", err.message || err);
      console.error("   Questo indica che la funzione esiste ma la signature non corrisponde o il dato ha formato diverso.");
      console.error("   Suggerimento: verifica ABI del contratto deployato o usa l'ABI dall'artifact locale se disponibile.");
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err && err.message ? err.message : err);
  process.exit(1);
});