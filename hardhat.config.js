"use strict";
const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        let desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
const __importStar =
  (this && this.__importStar) ||
  (function () {
    let ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          const ar = [];
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      const result = {};
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomicfoundation/hardhat-toolbox");
require("@typechain/hardhat");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-storage-layout");
require("./tasks");
// Load environment variables
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const sanitizeRpcUrl = (url) => {
  if (!url) {
    return undefined;
  }
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.includes("YOUR_INFURA_KEY") || trimmed.includes("YOUR_ALCHEMY_KEY")) {
    return undefined;
  }
  return trimmed;
};
const normalizePrivateKey = (key) => {
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
const requestedMochaTimeout = process.env.MOCHA_TIMEOUT ? Number(process.env.MOCHA_TIMEOUT) : undefined;
const mochaTimeout =
  Number.isFinite(requestedMochaTimeout) && requestedMochaTimeout !== 0 ? requestedMochaTimeout : 60000;
const config = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
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
  },
  mocha: {
    timeout: mochaTimeout,
  },
};
exports.default = config;
