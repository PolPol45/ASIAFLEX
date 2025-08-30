// Test di integrazione per utils/eth.js
// Uso: configura .env con RPC_URL e PRIVATE_KEY oppure esporta le variabili prima di lanciare
require('dotenv').config();

(async () => {
  try {
    const path = './utils/eth';
    const eth = require(path);
    console.log('Caricato', path);

    let ethersPkg = null;
    try { ethersPkg = require('ethers'); } catch (e) { /* no ethers */ }
    console.log('ethers presente:', !!ethersPkg, ethersPkg && (ethersPkg.version || ethersPkg.version));

    if (typeof eth.getProvider === 'function') {
      const provider = await eth.getProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
      const net = await provider.getNetwork();
      console.log('Provider ok, network:', net.chainId, net.name || '');
    } else {
      console.log('getProvider non trovato in utils/eth');
    }

    const walletFn = eth.getWallet || eth.walletFromKey || eth.walletFromPrivateKey;
    if (typeof walletFn === 'function') {
      try {
        const wallet = await walletFn(process.env.PRIVATE_KEY || '');
        console.log('Wallet ok, address:', wallet && (wallet.address || wallet._address || wallet.address?.toString?.()));
      } catch (err) {
        console.log('Creazione wallet fallita:', err.message || err);
      }
    } else {
      console.log('Nessuna funzione getWallet/walletFromKey/walletFromPrivateKey trovata in utils/eth');
    }

    if (typeof eth.estimateGas === 'function') {
      try {
        const estimate = await eth.estimateGas({
          to: '0x0000000000000000000000000000000000000000',
          value: 0
        });
        console.log('estimateGas:', estimate && (estimate.toString ? estimate.toString() : estimate));
      } catch (err) {
        console.log('estimateGas ha lanciato errore (atteso in alcuni provider):', err.message || err);
      }
    } else {
      console.log('estimateGas non trovato in utils/eth');
    }

    process.exit(0);
  } catch (err) {
    console.error('Errore test integrazione:', err);
    process.exit(1);
  }
})();