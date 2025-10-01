# Environment Variables

This document describes all environment variables used by the AsiaFlex system.

## Required Variables

### Deployment & Network Configuration

#### `MAINNET_RPC_URL`

- **Description**: RPC endpoint for Ethereum mainnet
- **Example**: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`
- **Required for**: Mainnet deployment, forking tests
- **Default**: None

#### `SEPOLIA_RPC_URL`

- **Description**: RPC endpoint for Sepolia testnet
- **Example**: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
- **Required for**: Sepolia testnet deployment and testing
- **Default**: None

#### `POLYGON_RPC_URL`

- **Description**: RPC endpoint for Polygon mainnet
- **Example**: `https://polygon-rpc.com`
- **Required for**: Polygon deployment
- **Default**: None

#### `PRIVATE_KEY`

- **Description**: Private key for deployment and operations (without 0x prefix)
- **Required for**: All network deployments and operations
- **Security**: NEVER commit this to version control
- **Default**: None

### Oracle Configuration

#### `ALPHA_VANTAGE_API_KEY`

- **Description**: API key for Alpha Vantage financial data
- **Example**: `YOUR_API_KEY_HERE`
- **Required for**: NAV price updates, oracle operations
- **Security**: Keep confidential, rate limits apply
- **Default**: None
- **Get Key**: https://www.alphavantage.co/support/#api-key

#### `NAV_SKIP_FETCH`

- **Description**: Skip fetching NAV from API (use cached/manual values)
- **Example**: `true` or `false`
- **Required for**: Offline testing, CI environments
- **Default**: `false`

#### `NAV_CACHE_DIR`

- **Description**: Directory for NAV cache storage
- **Example**: `.cache/nav`
- **Required for**: Custom cache location
- **Default**: `.cache/nav`

#### `NAV_CACHE_MAX_AGE`

- **Description**: Maximum age of cached NAV in seconds
- **Example**: `3600` (1 hour)
- **Required for**: Custom cache expiration
- **Default**: `3600`

### Operations Scripts

#### `MINT_SIGNER`

- **Description**: Address that will sign mint operations
- **Example**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Required for**: Mint operations
- **Default**: First account in Hardhat config

#### `MINT_TO`

- **Description**: Recipient address for minted tokens
- **Example**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Required for**: Mint operations
- **Default**: None (must be specified)

#### `MINT_AMOUNT`

- **Description**: Amount of tokens to mint (in AFX units)
- **Example**: `1000` (1000 AFX tokens)
- **Required for**: Mint operations
- **Default**: None (must be specified)

#### `MINT_DRY_RUN`

- **Description**: Perform dry run without executing transaction
- **Example**: `true` or `false`
- **Required for**: Testing mint operations
- **Default**: `false`

#### `BURN_SIGNER`

- **Description**: Address that will sign burn operations
- **Example**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Required for**: Burn operations
- **Default**: First account in Hardhat config

#### `BURN_FROM`

- **Description**: Address to burn tokens from
- **Example**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Required for**: Burn operations
- **Default**: None (must be specified)

#### `BURN_AMOUNT`

- **Description**: Amount of tokens to burn (in AFX units)
- **Example**: `100` (100 AFX tokens)
- **Required for**: Burn operations
- **Default**: None (must be specified)

#### `BURN_DRY_RUN`

- **Description**: Perform dry run without executing transaction
- **Example**: `true` or `false`
- **Required for**: Testing burn operations
- **Default**: `false`

#### `TRANSFER_SIGNER`

- **Description**: Address that will sign transfer operations
- **Example**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Required for**: Transfer operations
- **Default**: First account in Hardhat config

#### `TRANSFER_FROM`

- **Description**: Address to transfer tokens from
- **Example**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Required for**: Transfer operations
- **Default**: None (must be specified)

#### `TRANSFER_TO`

- **Description**: Address to transfer tokens to
- **Example**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Required for**: Transfer operations
- **Default**: None (must be specified)

#### `TRANSFER_AMOUNT`

- **Description**: Amount of tokens to transfer (in AFX units)
- **Example**: `50` (50 AFX tokens)
- **Required for**: Transfer operations
- **Default**: None (must be specified)

#### `TRANSFER_DRY_RUN`

- **Description**: Perform dry run without executing transaction
- **Example**: `true` or `false`
- **Required for**: Testing transfer operations
- **Default**: `false`

#### `TRANSFER_PROMPT`

- **Description**: Prompt for confirmation before executing transfer
- **Example**: `true` or `false`
- **Required for**: Non-interactive mode (CI/automation)
- **Default**: `true`

### Verification & Etherscan

#### `ETHERSCAN_API_KEY`

- **Description**: API key for Etherscan contract verification
- **Example**: `YOUR_ETHERSCAN_API_KEY`
- **Required for**: Contract verification on Etherscan
- **Default**: None

#### `POLYGONSCAN_API_KEY`

- **Description**: API key for Polygonscan contract verification
- **Example**: `YOUR_POLYGONSCAN_API_KEY`
- **Required for**: Contract verification on Polygonscan
- **Default**: None

## Optional Variables

### Hardhat Configuration

#### `SOLIDITY_VERSION`

- **Description**: Solidity compiler version to use
- **Example**: `0.8.26`
- **Required for**: Custom compiler version
- **Default**: `0.8.26` (from hardhat.config.ts)

#### `OPTIMIZER_RUNS`

- **Description**: Number of optimization runs for Solidity compiler
- **Example**: `200`
- **Required for**: Custom optimization settings
- **Default**: `200`

### Gas Reporter

#### `COINMARKETCAP_API_KEY`

- **Description**: API key for CoinMarketCap (gas cost reporting)
- **Example**: `YOUR_CMC_API_KEY`
- **Required for**: Gas cost USD calculations
- **Default**: None

#### `REPORT_GAS`

- **Description**: Enable gas reporting in tests
- **Example**: `true` or `false`
- **Required for**: Gas usage analysis
- **Default**: `false`

### Testing

#### `FORK_BLOCK_NUMBER`

- **Description**: Block number to fork from (for fork testing)
- **Example**: `18500000`
- **Required for**: Deterministic fork testing
- **Default**: Latest block

### Logging & Debugging

#### `DEBUG`

- **Description**: Enable debug logging
- **Example**: `asiaflex:*` or `asiaflex:oracle`
- **Required for**: Debugging
- **Default**: None

#### `LOG_LEVEL`

- **Description**: Logging level
- **Example**: `debug`, `info`, `warn`, `error`
- **Required for**: Custom logging verbosity
- **Default**: `info`

## Environment File Setup

### Development (.env.development)

```bash
# Network RPC URLs (use free tier or local node)
MAINNET_RPC_URL=http://localhost:8545
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Development private key (TEST KEY ONLY - DO NOT USE IN PRODUCTION)
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Oracle API key (free tier)
ALPHA_VANTAGE_API_KEY=YOUR_FREE_API_KEY

# Development settings
NAV_CACHE_MAX_AGE=3600
LOG_LEVEL=debug
REPORT_GAS=true
```

### Testing (.env.test)

```bash
# Use local Hardhat node
MAINNET_RPC_URL=http://localhost:8545

# Test private key
PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Skip real API calls in tests
NAV_SKIP_FETCH=true

# Disable prompts for CI
TRANSFER_PROMPT=false
MINT_DRY_RUN=false
BURN_DRY_RUN=false

# Test logging
LOG_LEVEL=warn
```

### Production (.env.production)

```bash
# Production RPC URLs (use reliable providers)
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Production private key (USE HARDWARE WALLET OR SECURE KEY MANAGEMENT)
# NEVER COMMIT THIS FILE
PRIVATE_KEY=YOUR_PRODUCTION_KEY_HERE

# Production API key (paid tier with higher rate limits)
ALPHA_VANTAGE_API_KEY=YOUR_PRODUCTION_API_KEY

# Verification keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_KEY

# Production settings
NAV_CACHE_MAX_AGE=1800
LOG_LEVEL=info
REPORT_GAS=false

# Always prompt in production
TRANSFER_PROMPT=true
```

## Security Best Practices

### Private Key Management

1. **NEVER** commit `.env` files to version control
2. Use `.env.example` as a template (without sensitive values)
3. For production, use:
   - Hardware wallets (Ledger, Trezor)
   - Key management services (AWS KMS, Google Cloud KMS)
   - Multisig wallets (Gnosis Safe)
4. Rotate keys regularly (every 90 days minimum)
5. Use separate keys for different environments

### API Key Management

1. Use different API keys for dev/test/prod
2. Monitor API usage and rate limits
3. Set up alerts for API key approaching limits
4. Rotate API keys periodically
5. Use paid tiers for production (higher rate limits, SLA)

### Environment Separation

```
Development → .env.development → Test keys → Free tier APIs → Local node
↓
Testing → .env.test → Test keys → Mocked APIs → Hardhat node
↓
Staging → .env.staging → Staging keys → Paid APIs → Testnet
↓
Production → .env.production → Production keys → Paid APIs → Mainnet
```

## Loading Environment Variables

### Automatic Loading

Most scripts automatically load environment variables using dotenv:

```typescript
import * as dotenv from "dotenv";
dotenv.config();
```

### Manual Loading

For manual testing or debugging:

```bash
# Load from specific file
set -a
source .env.development
set +a

# Verify variables
echo $ALPHA_VANTAGE_API_KEY
echo $MAINNET_RPC_URL
```

### Using Different Environment Files

```bash
# Load development environment
cp .env.development .env

# Load production environment
cp .env.production .env

# Or specify directly
NODE_ENV=production npm run deploy
```

## Troubleshooting

### Missing Environment Variable

**Error**: `Error: Missing ALPHA_VANTAGE_API_KEY`

**Solution**:

1. Check if `.env` file exists
2. Verify variable is defined in `.env`
3. Check variable name (case-sensitive)
4. Ensure dotenv.config() is called before usage

### Invalid Private Key

**Error**: `Error: invalid private key`

**Solution**:

1. Check key format (64 characters, no 0x prefix)
2. Verify key is not encrypted
3. Check for extra whitespace or newlines

### RPC Connection Failed

**Error**: `Error: could not detect network`

**Solution**:

1. Verify RPC URL is correct
2. Check network is accessible
3. Verify API key is valid (if required)
4. Try alternative RPC provider

### API Rate Limit

**Error**: `AlphaVantage API rate limit reached`

**Solution**:

1. Wait for rate limit reset
2. Use NAV cache: `NAV_SKIP_FETCH=true`
3. Upgrade to paid API tier
4. Implement exponential backoff

## Validation Checklist

Before deploying to production, verify:

- [ ] All required environment variables are set
- [ ] Private keys are from hardware wallet or secure KMS
- [ ] API keys are from paid tiers with SLA
- [ ] RPC URLs are from reliable providers
- [ ] .env files are in .gitignore
- [ ] Separate keys for each environment
- [ ] Key rotation schedule is documented
- [ ] Backup keys are securely stored
- [ ] Access to keys is logged and monitored
- [ ] Emergency key recovery plan exists
