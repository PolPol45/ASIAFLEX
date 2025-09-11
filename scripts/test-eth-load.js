// semplice smoke test per utils/eth
const u = require("../utils/eth");

(async () => {
  try {
    console.log("utils meta:", u._meta);
    const provider = u.getProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
    console.log("provider debug URL:", provider._debugUrl);
    try {
      const wallet = process.env.PRIVATE_KEY ? u.getWallet() : null;
      console.log("wallet available:", !!wallet);
    } catch (e) {
      console.log("wallet creation threw (ok if no PRIVATE_KEY):", e.message);
    }
    process.exit(0);
  } catch (err) {
    console.error("ERROR loading utils:", err);
    process.exit(1);
  }
})();
