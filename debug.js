const ethers = require("ethers");
const url = process.env.RPC_URL || "https://sepolia.infura.io/v3/09e5eac1c74a44ddb4b767941110fd10";
console.log("using RPC_URL=", url);
const provider = new ethers.providers.JsonRpcProvider(url);
provider
  .getNetwork()
  .then((n) => console.log("network", n))
  .catch((err) => {
    console.error("getNetwork error:", err && err.message);
    console.error(err && err.stack);
    process.exit(1);
  });
