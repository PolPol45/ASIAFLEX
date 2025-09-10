import { HardhatUserConfig } from "hardhat/config";

// Test-specific configuration
export const testConfig = {
  // Gas settings for tests
  gasLimit: 30000000,
  gasPrice: 1000000000, // 1 gwei

  // Coverage settings
  coverageThreshold: {
    statements: 95,
    branches: 95,
    functions: 95,
    lines: 95,
  },

  // Timeouts
  timeout: 60000, // 60 seconds

  // Test accounts with known private keys (for testing only)
  testAccounts: [
    {
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
      balance: "10000000000000000000000", // 10,000 ETH
    },
    {
      privateKey: "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
      balance: "10000000000000000000000", // 10,000 ETH
    },
  ],

  // Fork testing configuration
  fork: {
    enabled: process.env.FORK_TESTING === "true",
    url: process.env.MAINNET_RPC_URL || "",
    blockNumber: process.env.FORK_BLOCK_NUMBER ? parseInt(process.env.FORK_BLOCK_NUMBER) : undefined,
  },

  // Test data constants
  constants: {
    SUPPLY_CAP: "1000000", // 1M tokens
    MAX_DAILY_MINT: "10000", // 10K tokens
    MAX_DAILY_NET_INFLOWS: "50000", // 50K tokens
    INITIAL_NAV: "100", // $100
    STALENESS_THRESHOLD: 86400, // 24 hours
    DEVIATION_THRESHOLD: 1000, // 10%
    REQUEST_EXPIRATION: 3600, // 1 hour
  },

  // Test scenarios
  scenarios: {
    smallAmount: "100",
    mediumAmount: "1000",
    largeAmount: "10000",
    maxAmount: "50000",
    
    navIncrease: {
      small: "105", // 5%
      medium: "110", // 10%
      large: "120", // 20%
      extreme: "200", // 100%
    },
    
    navDecrease: {
      small: "95", // 5%
      medium: "90", // 10%
      large: "80", // 20%
      extreme: "50", // 50%
    },
  },
};

export default testConfig;