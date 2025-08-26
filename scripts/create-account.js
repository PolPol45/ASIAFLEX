const { Wallet } = require("ethers");

function createWallet() {
  const wallet = Wallet.createRandom();
  console.log("📬 Address:", wallet.address);
  console.log("🔑 Private Key:", wallet.privateKey);
  console.log("🧪 Mnemonic:", wallet.mnemonic.phrase);
}

createWallet();
