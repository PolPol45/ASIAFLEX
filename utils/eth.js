// Helper per provider/wallet/contract e invio tx compatibile ethers v5/v6
const ethers = require('ethers');
const config = require('./config');

const JsonRpcProviderClass = (ethers.providers && ethers.providers.JsonRpcProvider) || ethers.JsonRpcProvider;
const WalletClass = ethers.Wallet || (ethers && ethers.Wallet);

function getProvider() {
  if (!config.SEPOLIA_RPC_URL) {
    throw new Error('Missing SEPOLIA_RPC_URL in env');
  }
  return new JsonRpcProviderClass(config.SEPOLIA_RPC_URL);
}

function getWallet(provider) {
  if (!config.PRIVATE_KEY) return null;
  return new WalletClass(config.PRIVATE_KEY, provider);
}

async function getContract(address, abi, useSigner = true) {
  const provider = getProvider();
  const wallet = getWallet(provider);
  const signerOrProvider = useSigner && wallet ? wallet : provider;
  return new ethers.Contract(address, abi, signerOrProvider);
}

async function sendTx(contractWithSigner, method, args = [], overrides = {}) {
  if (!contractWithSigner || typeof contractWithSigner[method] !== 'function') {
    throw new Error(`Method ${method} not found on contract`);
  }

  // try estimate gas (non-fatal)
  let estimated = null;
  try {
    const estimateContainer = contractWithSigner.estimateGas || contractWithSigner.estimateGas; // both versions
    const estimateFn = estimateContainer && (estimateContainer[method] || estimateContainer[method]);
    if (typeof estimateFn === 'function') {
      // call estimateGas with same args + overrides if accepted
      estimated = await estimateFn.apply(estimateContainer, args.concat([overrides]));
    }
  } catch (e) {
    // ignore estimate error
  }

  // normalize and add buffer (+20%) for gasLimit
  if (estimated) {
    try {
      if (typeof estimated === 'bigint') {
        overrides.gasLimit = (estimated * 120n) / 100n;
      } else if (typeof estimated === 'object' && typeof estimated.mul === 'function') {
        // ethers v5 BigNumber
        overrides.gasLimit = estimated.mul(120).div(100);
      } else {
        // fallback: use estimated as-is
        overrides.gasLimit = estimated;
      }
    } catch (e) {
      // ignore and continue without gasLimit
    }
  }

  const txResponse = await contractWithSigner[method](...args, overrides);

  // wait for mining if possible
  if (txResponse && typeof txResponse.wait === 'function') {
    return txResponse.wait();
  }
  // otherwise return the response object
  return txResponse;
}

module.exports = {
  getProvider,
  getWallet,
  getContract,
  sendTx,
};