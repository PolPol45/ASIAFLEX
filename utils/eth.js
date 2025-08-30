// Compatibilità ethers v5 - helper minimo con fallback RPC e timeout su network detection
let ethersPkg;
try {
  ethersPkg = require('ethers');
} catch (err) {
  throw new Error('ethers non è installato. Esegui: npm install ethers@5');
}

const version = String(ethersPkg.version || '');
const isV6 = version.startsWith('6');

function _effectiveRpcUrl(input) {
  if (input) return input;
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.SEPOLIA_RPC_URL) return process.env.SEPOLIA_RPC_URL;
  return 'http://127.0.0.1:8545';
}

function _makeProvider(url) {
  if (isV6) {
    return new ethersPkg.JsonRpcProvider(url);
  } else {
    return new ethersPkg.providers.JsonRpcProvider(url);
  }
}

function getProvider(rpcUrl) {
  const url = _effectiveRpcUrl(rpcUrl);
  const provider = _makeProvider(url);
  // attach url for better errors later
  provider._debugUrl = url;
  return provider;
}

function waitForNetwork(provider, timeoutMs = 10000) {
  // provider.getNetwork() may hang if RPC non risponde; race con timeout
  return Promise.race([
    provider.getNetwork(),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`timeout after ${timeoutMs}ms waiting for network at ${provider._debugUrl || 'unknown'}`)), timeoutMs)
    )
  ]);
}

async function ensureNetwork(provider, timeoutMs = 10000) {
  try {
    const net = await waitForNetwork(provider, timeoutMs);
    return net;
  } catch (err) {
    // migliora il messaggio con l'URL se disponibile
    const url = provider && provider._debugUrl ? provider._debugUrl : 'unknown';
    const e = new Error(`Could not detect network for RPC ${url}: ${err.message}`);
    e.original = err;
    throw e;
  }
}

function getWallet(privateKey = '', rpcUrl) {
  if (!privateKey && !process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY non fornita né come argomento né come env');
  }
  const key = privateKey || process.env.PRIVATE_KEY;
  const provider = rpcUrl ? getProvider(rpcUrl) : (process.env.RPC_URL || process.env.SEPOLIA_RPC_URL ? getProvider() : undefined);
  return new ethersPkg.Wallet(key, provider);
}

const walletFromKey = getWallet;
const walletFromPrivateKey = getWallet;

async function estimateGas(tx = {}, rpcUrl) {
  const provider = rpcUrl ? getProvider(rpcUrl) : getProvider();
  await ensureNetwork(provider, 10000); // fallisce velocemente se RPC non raggiungibile
  return provider.estimateGas(tx);
}

module.exports = {
  getProvider,
  ensureNetwork,
  getWallet,
  walletFromKey,
  walletFromPrivateKey,
  estimateGas,
  _meta: { ethersVersion: version || 'unknown', isV6: !!isV6 }
};