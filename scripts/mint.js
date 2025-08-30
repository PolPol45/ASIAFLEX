#!/usr/bin/env node
/**
 * scripts/mint.js (v3)
 *
 * Unified interactive mint/orchestration script.
 * - Supporta: --usd, --amount, --to, --dry-run, --yes, --set-price, --set-reserves
 * - Se --to non è passato, chiede interattivamente l'indirizzo (mostra MINT_TO come default).
 *
 * Env (.env):
 *  SEPOLIA_RPC_URL or RPC_URL
 *  PRIVATE_KEY            (necessaria per inviare tx)
 *  ASIAFLEX_TOKEN_ADDRESS or CONTRACT_ADDRESS
 *  MINT_TO                (opzionale default recipient)
 *
 * Usage examples:
 *  node scripts/mint.js                         # interattivo: chiede mode/amount/to
 *  node scripts/mint.js --usd 50 --to 0x...     # non-interattivo
 *  node scripts/mint.js --usd 50 --dry-run
 *  node scripts/mint.js dry-run                 # supports positional dry-run
 *  node scripts/mint.js --set-price 85.48 --set-reserves 1000 --usd 50 --to 0x...
 */
const { ethers } = require("hardhat");
require("dotenv").config();
const readline = require("readline");

const ABI = require("../artifacts/contracts/AsiaFlexToken.sol/AsiaFlexToken.json").abi;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { flags: {}, params: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run" || a === "dry-run") out.flags.dryRun = true;
    if (a === "--yes" || a === "-y" || a === "yes") out.flags.yes = true;
    if (a === "--help" || a === "-h") out.flags.help = true;
    if (a === "--usd" || a === "--amount" || a === "--to" || a === "--set-price" || a === "--set-reserves") {
      const v = args[i + 1];
      if (!v || v.startsWith("--")) throw new Error(`Missing value for ${a}`);
      if (a === "--usd") out.params.usd = v;
      if (a === "--amount") out.params.amount = v;
      if (a === "--to") out.params.to = v;
      if (a === "--set-price") out.params.setPrice = v;
      if (a === "--set-reserves") out.params.setReserves = v;
      i++;
      continue;
    }
  }
  return out;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/mint.js               # interactive prompts
  node scripts/mint.js --usd <USD>   # mint by USD (non-interactive)
  node scripts/mint.js --amount <AFX># mint by AFX amount
  Options:
    --to <address>         Recipient address (or set MINT_TO in .env)
    --set-price <USD>      (optional) set contract price before mint
    --set-reserves <AFX>   (optional) set reserves before mint
    --dry-run              Show calculation only, do not send tx
    --yes                  Skip confirmation prompt (or set AUTO_CONFIRM=1)
`);
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve((ans || "").trim());
    });
  });
}

async function promptYesNo(question) {
  if (process.env.AUTO_CONFIRM === "1") return true;
  const args = process.argv.slice(2);
  if (args.includes("--yes") || args.includes("-y") || args.includes("yes")) return true;
  const ans = await prompt(question);
  const a = String(ans || "").trim().toLowerCase();
  return a === "y" || a === "yes";
}

function bnOneEther() {
  return BigInt("1000000000000000000"); // 1e18
}

function validateAddress(addr) {
  if (!addr) throw new Error("Recipient address not provided");
  if (!ethers.isAddress(addr)) throw new Error("Address non valida");
  if (addr === "0x0000000000000000000000000000000000000000") throw new Error("Address zero non ammesso");
  return addr;
}

async function main() {
  try {
    const { flags, params } = parseArgs();
    if (flags.help) {
      printHelp();
      return;
    }

    const tokenAddress = process.env.ASIAFLEX_TOKEN_ADDRESS || process.env.CONTRACT_ADDRESS || process.env.ASIAFLEX_TOKEN_ADDR;
    if (!tokenAddress) throw new Error("ASIAFLEX_TOKEN_ADDRESS or CONTRACT_ADDRESS not set in .env");

    const rpc = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
    if (!rpc) throw new Error("SEPOLIA_RPC_URL or RPC_URL not set in .env");

    // Inputs (from CLI or interactive)
    let usdInput = params.usd;
    let amountInput = params.amount;
    // Keep the env default but detect if user passed --to
    const toFromArg = params.to; // undefined if not passed
    let to = toFromArg || process.env.MINT_TO || null;

    // If neither usd nor amount provided, ask user
    if (!usdInput && !amountInput) {
      const modeAns = await prompt("Vuoi mintare per USD (u) o per AFX (a)? [u/a, default u]: ");
      const mode = (modeAns || "u").trim().toLowerCase();
      if (mode === "a" || mode === "afx") {
        const amt = await prompt("Inserisci la quantità di AFX da mintare (es. 100): ");
        if (!amt) throw new Error("Quantità AFX non fornita.");
        amountInput = amt;
      } else {
        const usd = await prompt("Inserisci la quantità in USD da convertire (es. 50): ");
        if (!usd) throw new Error("Importo USD non fornito.");
        usdInput = usd;
      }
    }

    // If --to not provided, always ask for recipient (show MINT_TO as default)
    if (!toFromArg) {
      const defaultToLabel = process.env.MINT_TO ? ` (default ${process.env.MINT_TO})` : "";
      const toAns = await prompt(`Indirizzo destinatario${defaultToLabel}: `);
      to = (toAns || process.env.MINT_TO || "").trim();
      if (!to) throw new Error("Indirizzo destinatario non fornito.");
    }
    // Validate address
    to = validateAddress(to);

    // Setup provider and optional wallet
    const provider = new ethers.JsonRpcProvider(rpc);
    let wallet = null;
    if (process.env.PRIVATE_KEY) wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const contractRead = new ethers.Contract(tokenAddress, ABI, provider);
    const contractWrite = wallet ? new ethers.Contract(tokenAddress, ABI, wallet) : null;

    // Read reserves if available
    let reserves = null;
    try {
      const ifaceRes = new ethers.Interface(["function reserves() view returns (uint256)"]);
      const r = await provider.call({ to: tokenAddress, data: ifaceRes.encodeFunctionData("reserves") });
      reserves = ifaceRes.decodeFunctionResult("reserves", r)[0];
    } catch (err) {
      reserves = null;
    }

    // Optional orchestration: setPrice / setReserves BEFORE any dry-run/mint
    if (params.setPrice || params.setReserves) {
      if (!wallet) throw new Error("PRIVATE_KEY required to perform orchestration (setPrice/setReserves)");
      if (!contractWrite) throw new Error("contractWrite not initialized");

      if (params.setPrice) {
        const priceUnits = ethers.parseUnits(String(params.setPrice), 18);
        console.log(`💲 Setting on-chain price to ${params.setPrice} USD...`);
        const tx = await contractWrite.setPrice(priceUnits);
        console.log("  tx:", tx.hash);
        await tx.wait();
        console.log("✅ Price set");
      }

      if (params.setReserves) {
        const reservesUnits = ethers.parseUnits(String(params.setReserves), 18);
        console.log(`📦 Setting reserves to ${params.setReserves} AFX...`);
        const tx2 = await contractWrite.setReserves(reservesUnits);
        console.log("  tx:", tx2.hash);
        await tx2.wait();
        console.log("✅ Reserves set");
      }

      // re-read reserves after update
      try {
        const ifaceRes = new ethers.Interface(["function reserves() view returns (uint256)"]);
        const rr = await provider.call({ to: tokenAddress, data: ifaceRes.encodeFunctionData("reserves") });
        reserves = ifaceRes.decodeFunctionResult("reserves", rr)[0];
      } catch (err) {
        // keep previous or null
      }
    }

    // Path: USD input -> mintByUSD
    if (usdInput) {
      // Read on-chain price
      let price;
      try {
        price = await contractRead.getPrice();
      } catch (err) {
        throw new Error("Impossibile leggere getPrice() on-chain: " + (err.message || err));
      }
      if (!price || price === 0n) {
        throw new Error("Prezzo on-chain pari a zero o non disponibile.");
      }

      const usdScaled = ethers.parseUnits(String(usdInput), 18); // BigInt
      const amountToMint = (usdScaled * bnOneEther()) / BigInt(price); // BigInt arithmetic

      console.log("--- dry-run preview (mintByUSD) ---");
      console.log({
        to: to,
        usd: String(usdInput),
        price: ethers.formatUnits(price, 18),
        amountToMint: ethers.formatUnits(amountToMint, 18),
        reserves: reserves ? ethers.formatUnits(reserves, 18) : "n/a",
      });

      if (flags && flags.dryRun) { /* noop; handled below */ }

      if (flags && flags.dryRun) {
        console.log("Dry-run, nessuna tx inviata.");
        return;
      }

      // Use parsed flags variable
      if (flags && flags.dryRun) return;

      // If not dry-run, proceed to send tx
      if (!flags || !flags.dryRun) {
        if (!wallet) throw new Error("PRIVATE_KEY richiesta in .env per inviare transazioni");
        // Check reserves
        if (reserves && BigInt(reserves) < BigInt(amountToMint)) {
          throw new Error(`Non abbastanza riserve. Disponibili: ${ethers.formatUnits(reserves, 18)} AFX, richieste: ${ethers.formatUnits(amountToMint, 18)} AFX`);
        }

        const confirm = await promptYesNo(`Procedo a mintare ${ethers.formatUnits(amountToMint, 18)} AFX per ${usdInput} USD a ${to}? [y/N]: `);
        if (!confirm) {
          console.log("Operazione annullata dall'utente.");
          return;
        }

        try {
          const tx = await contractWrite.mintByUSD(to, usdScaled);
          console.log("TX sent:", tx.hash);
          const receipt = await tx.wait();
          console.log("TransactionHash:", receipt.transactionHash);
          console.log("Status:", receipt.status);
          console.log("BlockNumber:", receipt.blockNumber);
          console.log("GasUsed:", receipt.gasUsed ? receipt.gasUsed.toString() : "n/a");
          console.log(`✅ Mint completato: ${usdInput} USD -> ${ethers.formatUnits(amountToMint, 18)} AFX a ${to}`);
        } catch (err) {
          throw new Error("Errore durante mintByUSD: " + (err.message || err));
        }
      }
      return;
    }

    // Path: amountInput -> mint(amount)
    const amountScaled = ethers.parseUnits(String(amountInput), 18);

    console.log("--- dry-run preview (mint) ---");
    console.log({
      to: to,
      amount: String(amountInput),
      amountScaled: amountScaled.toString(),
      reserves: reserves ? ethers.formatUnits(reserves, 18) : "n/a",
    });

    if (flags && flags.dryRun) {
      console.log("Dry-run, nessuna tx inviata.");
      return;
    }

    if (!wallet) throw new Error("PRIVATE_KEY richiesta in .env per inviare transazioni");
    if (reserves && BigInt(reserves) < BigInt(amountScaled)) {
      throw new Error(`Non abbastanza riserve. Disponibili: ${ethers.formatUnits(reserves, 18)} AFX, richiesti: ${ethers.formatUnits(amountScaled, 18)} AFX`);
    }

    const confirmMint = await promptYesNo(`Procedo a mintare ${String(amountInput)} AFX a ${to}? [y/N]: `);
    if (!confirmMint) {
      console.log("Operazione annullata dall'utente.");
      return;
    }

    try {
      const tx = await contractWrite.mint(to, amountScaled);
      console.log("TX sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("TransactionHash:", receipt.transactionHash);
      console.log("Status:", receipt.status);
      console.log("BlockNumber:", receipt.blockNumber);
      console.log("GasUsed:", receipt.gasUsed ? receipt.gasUsed.toString() : "n/a");
      console.log(`✅ Mint completato: ${String(amountInput)} AFX a ${to}`);
    } catch (err) {
      throw new Error("Errore durante mint: " + (err.message || err));
    }
  } catch (err) {
    console.error("❌ Errore:", err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();