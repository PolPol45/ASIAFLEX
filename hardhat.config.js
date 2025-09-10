require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/09e5eac1c74a44ddb4b767941110fd10",
      accounts: ["c097364fb53f374ddc82c32b4940cf5e1817e148f0126a8a2b3587a0572a312d"]
    }
  },
  etherscan: {
    apiKey: "1MF7GANW3DH67CBYU3P28S77YZFMAPZD3H"
  }
};

