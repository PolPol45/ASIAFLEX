import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "./tasks";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

const sanitizeRpcUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0 || trimmed.includes("YOUR_INFURA_KEY") || trimmed.includes("YOUR_ALCHEMY_KEY")) {
    return undefined;
  }

  return trimmed;
};

const normalizePrivateKey = (key?: string): string | undefined => {
  if (!key) {
    return undefined;
  }

  const trimmed = key.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const stripped = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (/^[0-9a-fA-F]{64}$/.test(stripped)) {
    return `0x${stripped}`;
  }

  return undefined;
};

const MAINNET_RPC_URL = sanitizeRpcUrl(process.env.MAINNET_RPC_URL);
const SEPOLIA_RPC_URL = sanitizeRpcUrl(process.env.SEPOLIA_RPC_URL);
const POLYGON_RPC_URL = sanitizeRpcUrl(process.env.POLYGON_RPC_URL);
const DEPLOYER_PRIVATE_KEY = normalizePrivateKey(process.env.PRIVATE_KEY);
const ENABLE_MAINNET_FORK = process.env.ENABLE_MAINNET_FORK === "true";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    hardhat: {
      forking:
        ENABLE_MAINNET_FORK && MAINNET_RPC_URL
          ? {
              url: MAINNET_RPC_URL,
              blockNumber: undefined, // Latest block
            }
          : undefined,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      timeout: 60000,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      ...(DEPLOYER_PRIVATE_KEY ? { accounts: [DEPLOYER_PRIVATE_KEY] } : {}),
      gasPrice: "auto",
    },
    mainnet: {
      url: MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      ...(DEPLOYER_PRIVATE_KEY ? { accounts: [DEPLOYER_PRIVATE_KEY] } : {}),
      gasPrice: "auto",
    },
    polygon: {
      url: POLYGON_RPC_URL || "https://polygon-rpc.com",
      ...(DEPLOYER_PRIVATE_KEY ? { accounts: [DEPLOYER_PRIVATE_KEY] } : {}),
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["node_modules/@openzeppelin/contracts/build/contracts/**/*.json"],
    dontOverrideCompile: false,
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
