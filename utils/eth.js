// Central eth helper: compatibile ethers v5/v6, provider/wallet/contract/sendTx utilities
const fs = require("fs");
const path = require("path");
const { toSafeObject, safeStringify } = require("./serializers");
let ethersPkg;
try {
  ethersPkg = require("ethers");
} catch (err) {
  throw new Error("ethers non è installato. Esegui: npm install ethers@6 (o ethers@5 se desideri v5)");
}
const version = String(ethersPkg.version || "");
const isV6 = version.startsWith("6");

function _effectiveRpcUrl(input) {
  if (input) return input;
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.SEPOLIA_RPC_URL) return process.env.SEPOLIA_RPC_URL;
  return "http://127.0.0.1:8545";
}
function _makeProvider(url) {
  if (isV6) return new ethersPkg.JsonRpcProvider(url);
  return new ethersPkg.providers.JsonRpcProvider(url);
}

function getProvider(rpcUrl) {
  const url = _effectiveRpcUrl(rpcUrl);
  const provider = _makeProvider(url);
  provider._debugUrl = url;
  return provider;
}

function getWallet(privateKey = undefined, rpcUrl = undefined) {
  const key = privateKey || process.env.PRIVATE_KEY;
  if (!key) return null;
  const provider = rpcUrl
    ? getProvider(rpcUrl)
    : process.env.RPC_URL || process.env.SEPOLIA_RPC_URL
      ? getProvider()
      : undefined;
  return provider ? new ethersPkg.Wallet(key, provider) : new ethersPkg.Wallet(key);
}

async function getContract(address, abiOrName, opts = {}) {
  // abiOrName can be ABI array or artifact name (e.g. "AsiaFlexToken")
  let abi = abiOrName;
  if (typeof abiOrName === "string" && !Array.isArray(abiOrName)) {
    // try to load artifact from artifacts/ or build artifacts path
    try {
      const maybe = require(
        path.join(__dirname, "..", "artifacts", "contracts", `${abiOrName}.sol`, `${abiOrName}.json`)
      );
      abi = maybe.abi || maybe;
    } catch (e) {
      // ignore; fallback if abi is not JSON
    }
  }
  const provider = getProvider(opts.rpcUrl);
  const wallet = getWallet(opts.privateKey, opts.rpcUrl);
  const signerOrProvider = wallet || provider;
  return new ethersPkg.Contract(address, abi, signerOrProvider);
}

async function estimateGas(contractOrProvider, txRequest, rpcUrl) {
  const provider =
    contractOrProvider && contractOrProvider.provider ? contractOrProvider.provider : getProvider(rpcUrl);
  if (!provider || !provider.estimateGas) throw new Error("Provider non disponibile per la stima gas");
  // ensure network responds quickly
  const estimate = await provider.estimateGas(txRequest);
  return estimate;
}

function _safeBigIntToNumber(bi) {
  try {
    return Number(bi.toString());
  } catch {
    return null;
  }
}

async function sendTx(target, method, args = [], opts = {}) {
  // opts: { dryRun, gasBufferPct (e.g. 20), waitConfirmations, timeoutMs, overrides }
  const dryRun = !!opts.dryRun;
  const gasBufferPct = opts.gasBufferPct || 20;
  const waitConfirmations = Number(opts.waitConfirmations || 1);
  const timeoutMs = Number(opts.timeoutMs || 120000);

  if (!target) throw new Error("Target (contract or signer) required");

  const contract = target;
  if (!contract[method]) throw new Error(`Method ${method} non trovato sul contratto/oggetto`);

  // populate transaction (ethers v5/v6 compatible)
  let populated;
  try {
    populated =
      contract.populateTransaction && contract.populateTransaction[method]
        ? await contract.populateTransaction[method](...args)
        : {};
  } catch (e) {
    populated = {};
  }

  // estimate gas (try using contract.estimateGas.method if available)
  let gasEstimate;
  try {
    if (contract.estimateGas && contract.estimateGas[method]) {
      gasEstimate = await contract.estimateGas[method](...args);
    } else if (populated && Object.keys(populated).length) {
      gasEstimate = await estimateGas(contract, { to: contract.address, data: populated.data });
    } else {
      gasEstimate = undefined;
    }
  } catch (err) {
    gasEstimate = undefined;
  }

  // compute gasLimit robustly for BigNumber (v5) or bigint (v6)
  let gasLimit;
  if (typeof gasEstimate !== "undefined" && gasEstimate !== null) {
    if (typeof gasEstimate === "bigint") {
      gasLimit = (gasEstimate * BigInt(100 + gasBufferPct)) / BigInt(100);
    } else if (typeof gasEstimate.mul === "function" && typeof gasEstimate.div === "function") {
      // ethers v5 BigNumber
      gasLimit = gasEstimate.mul(100 + gasBufferPct).div(100);
    } else {
      // fallback: convert to BigInt via string
      try {
        const n = BigInt(gasEstimate.toString());
        gasLimit = (n * BigInt(100 + gasBufferPct)) / BigInt(100);
      } catch (e) {
        gasLimit = undefined;
      }
    }
  }

  // prepare overrides
  const overrides = Object.assign({}, opts.overrides || {});
  if (gasLimit) {
    // set gasLimit in an appropriate type: ethers v5 BigNumber / v6 bigint both acceptable in overrides as string/number
    overrides.gasLimit =
      typeof gasLimit === "bigint"
        ? gasLimit
        : gasLimit && typeof gasLimit.toString === "function"
          ? gasLimit.toString()
          : gasLimit;
  }

  const txPreview = {
    to: contract.address,
    method,
    args: Array.isArray(args) ? args.map((a) => a) : args,
    gasEstimate:
      typeof gasEstimate === "undefined" || gasEstimate === null
        ? null
        : gasEstimate.toString
          ? gasEstimate.toString()
          : String(gasEstimate),
    gasLimit: gasLimit ? (gasLimit.toString ? gasLimit.toString() : String(gasLimit)) : null,
    overrides: toSafeObject(overrides),
  };

  if (dryRun) {
    // Only print the preview and return a safe (serializable) mock
    console.log("--- dry-run: tx preview ---");
    console.log(safeStringify(txPreview));
    return { dryRun: true, preview: toSafeObject(txPreview) };
  }

  // send tx
  let txResponse;
  try {
    // Attach overrides as last arg where supported
    txResponse = await contract[method](...args, overrides);
  } catch (err) {
    const e = new Error(`sendTx failed invoking ${method}: ${err && err.message ? err.message : err}`);
    e.original = err;
    throw e;
  }

  // wait for confirmation with timeout
  const waitPromise =
    txResponse && typeof txResponse.wait === "function"
      ? txResponse.wait(waitConfirmations)
      : (async () => txResponse)();

  const timeoutPromise = new Promise((_, rej) =>
    setTimeout(() => rej(new Error("timeout waiting for tx confirmation")), timeoutMs)
  );
  const receipt = await Promise.race([waitPromise, timeoutPromise]).catch((err) => {
    // attach tx hash if available
    if (txResponse && txResponse.hash) err.txHash = txResponse.hash;
    throw err;
  });

  return { txResponse, receipt };
}

module.exports = {
  getProvider,
  getWallet,
  getContract,
  estimateGas,
  sendTx,
  _meta: { ethersVersion: version, isV6 },
};
