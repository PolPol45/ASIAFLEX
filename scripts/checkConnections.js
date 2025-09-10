const { ethers } = require("ethers");
const config = require("../utils/config");
const { getProvider, getWallet } = require("../utils/eth");

async function main() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  console.log("[check] network:", network);

  const wallet = getWallet(provider);
  console.log("[check] wallet present:", !!wallet);
  if (wallet) {
    console.log("[check] wallet address:", wallet.address);
    const bal = await provider.getBalance(wallet.address);
    console.log("[check] wallet balance (ETH):", ethers.utils.formatEther(bal));
  }

  if (config.PROOF_OF_RESERVE_ADDRESS) {
    const addr = config.PROOF_OF_RESERVE_ADDRESS;
    const code = await provider.getCode(addr);
    const isContract = code && code !== "0x";
    console.log("[check] PROOF_OF_RESERVE_ADDRESS:", addr);
    console.log("[check] is contract:", isContract);
    const addrBal = await provider.getBalance(addr);
    console.log("[check] address balance (ETH):", ethers.utils.formatEther(addrBal));
  } else {
    console.log("[check] PROOF_OF_RESERVE_ADDRESS not set in .env");
  }
}

main().catch((err) => {
  console.error("[check] error:", err.message || err);
  process.exit(1);
});
