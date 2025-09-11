require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/09e5eac1c74a44ddb4b767941110fd10",
      accounts: ["0xc097364fb53f374ddc82c32b4940cf5e1817e148f0126a8a2b3587a0572a312d"],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: "AS88X9EZ1GQ8MKPIIUMK8QCNCQ2DRJZSQU", // ← tua API Key valida
    },
  },
};
