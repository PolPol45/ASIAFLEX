import hre from "hardhat";
import axios from "axios";

const { ethers } = hre;

type NavMode = "mint" | "burn" | "generic";

const NAV_SKIP_FETCH = (process.env.NAV_SKIP_FETCH ?? "").toLowerCase() === "true";
const NAV_CACHE_TTL_SECONDS = Number(process.env.NAV_CACHE_TTL_SECONDS ?? "60");

let cachedNav: { value: bigint; fetchedAt: number } | undefined;

function isCacheValid(): boolean {
  if (!cachedNav) {
    return false;
  }

  if (!Number.isFinite(NAV_CACHE_TTL_SECONDS) || NAV_CACHE_TTL_SECONDS <= 0) {
    return false;
  }

  const ageMs = Date.now() - cachedNav.fetchedAt;
  return ageMs < NAV_CACHE_TTL_SECONDS * 1000;
}

export async function fetchLiveNavPrice(): Promise<bigint | undefined> {
  if (NAV_SKIP_FETCH) {
    console.log("ℹ️  NAV_SKIP_FETCH attivo: salto il fetch del NAV live.");
    return cachedNav?.value;
  }

  if (isCacheValid()) {
    return cachedNav?.value;
  }

  const symbol = process.env.ETF_SYMBOL ?? "AAXJ";
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  ALPHA_VANTAGE_API_KEY non configurata: impossibile sincronizzare automaticamente il NAV.");
    return undefined;
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await axios.get(url, { timeout: 10_000 });
    const priceStr = response.data?.["Global Quote"]?.["05. price"];

    if (!priceStr) {
      console.warn("⚠️  Risposta AlphaVantage priva di prezzo valido:", response.data);
      return undefined;
    }

    const nav = ethers.parseUnits(priceStr, 18);
    cachedNav = { value: nav, fetchedAt: Date.now() };
    return nav;
  } catch (error) {
    console.warn("⚠️  Errore durante il fetch del NAV da AlphaVantage:", (error as Error).message);
    return undefined;
  }
}

export async function ensureOracleNav(oracleAddress: string | undefined, dryRun: boolean): Promise<bigint | undefined> {
  if (!oracleAddress || !ethers.isAddress(oracleAddress)) {
    console.warn(
      "ℹ️  Nessun NAVOracleAdapter valido trovato nel file di deployment; salto la sincronizzazione automatica."
    );
    return undefined;
  }

  const liveNav = await fetchLiveNavPrice();
  if (!liveNav) {
    return undefined;
  }

  try {
    const oracle = await ethers.getContractAt("NAVOracleAdapter", oracleAddress);
    const navData = await oracle.getNAV();
    const currentNav: bigint = navData.nav ?? navData[0];

    if (currentNav === liveNav) {
      console.log(`ℹ️  NAV già allineato al valore live (${ethers.formatEther(liveNav)}).`);
      return liveNav;
    }

    if (dryRun) {
      console.log(
        `🧪 DRY RUN: aggiornerei il NAV da ${ethers.formatEther(currentNav)} a ${ethers.formatEther(liveNav)}.`
      );
      return liveNav;
    }

    try {
      const tx = await oracle.updateNAV(liveNav);
      console.log(`🔄 Aggiornamento NAV in corso (tx: ${tx.hash})...`);
      await tx.wait();
      console.log(`✅ NAV aggiornato a ${ethers.formatEther(liveNav)}.`);
      return liveNav;
    } catch (error) {
      const message = (error as Error).message || "";
      if (message.includes("DeviationTooHigh")) {
        console.log("⚠️  DeviationTooHigh: provo a usare forceUpdateNAV.");
        const tx = await oracle.forceUpdateNAV(liveNav);
        console.log(`🔄 Aggiornamento forzato NAV (tx: ${tx.hash})...`);
        await tx.wait();
        console.log(`✅ NAV aggiornato forzatamente a ${ethers.formatEther(liveNav)}.`);
        return liveNav;
      }

      throw error;
    }
  } catch (error) {
    console.warn("⚠️  Impossibile aggiornare l'oracolo NAV:", (error as Error).message);
    return undefined;
  }
}

export async function showNavQuote(
  oracleAddress: string | undefined,
  amountWei: string,
  navOverride?: bigint,
  options?: { mode?: NavMode }
): Promise<void> {
  const mode = options?.mode ?? "generic";

  if (!oracleAddress || !ethers.isAddress(oracleAddress)) {
    console.log("ℹ️  Nessun NAVOracleAdapter trovato nel file di deployment.");
    return;
  }

  try {
    const oracle = await ethers.getContractAt("NAVOracleAdapter", oracleAddress);
    const navData = await oracle.getNAV();
    const navRaw: bigint = navOverride ?? navData.nav ?? navData[0];
    const timestamp = navData.timestamp ?? navData[1];

    const navFloat = Number(ethers.formatEther(navRaw));
    const amountTokens = Number(ethers.formatEther(amountWei));
    const totalValue = navFloat * amountTokens;

    console.log("\n💹 NAV attuale (per 1 AFX): $" + navFloat.toFixed(2));

    let valueLine: string;
    if (mode === "burn") {
      valueLine = `💵 Valore stimato da bruciare (${amountTokens} AFX): $${totalValue.toFixed(2)}`;
    } else if (mode === "mint") {
      valueLine = `💵 Valore stimato per ${amountTokens} AFX: $${totalValue.toFixed(2)}`;
    } else {
      valueLine = `💵 Valore stimato (${amountTokens} AFX): $${totalValue.toFixed(2)}`;
    }

    console.log(`${valueLine} (ultimo aggiornamento: ${new Date(Number(timestamp) * 1000).toISOString()})`);
  } catch (error) {
    console.warn("⚠️  Impossibile recuperare il NAV corrente:", (error as Error).message);
  }
}
