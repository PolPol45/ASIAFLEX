# ASIAFLEX — NAV Oracle & Basket Token System

[![Build Status](https://github.com/PolPol45/ASIAFLEX/workflows/CI/badge.svg)](https://github.com/PolPol45/ASIAFLEX/actions)
[![Coverage Status](https://codecov.io/gh/PolPol45/ASIAFLEX/branch/main/graph/badge.svg)](https://codecov.io/gh/PolPol45/ASIAFLEX)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Contracts](#contracts)
- [Price Pipeline](#price-pipeline)
- [Ops & Monitoring](#ops--monitoring)
- [E2E Quick Flow](#e2e-quick-flow)
- [Configuration (.env)](#configuration-env)
- [Local Dev](#local-dev)
- [CI/CD](#cicd)
- [Security & Roles](#security--roles)
- [Roadmap / Gaps (To-Improve)](#roadmap--gaps-to-improve)
- [Troubleshooting](#troubleshooting)

---

## Overview

**ASIAFLEX** provides a decentralized NAV (Net Asset Value) oracle system feeding basket-backed ERC20 tokens (AsiaFlex Token). The system sources prices from multiple providers (Yahoo Finance, Polygon.io), validates them through Google Finance cross-checks, and updates on-chain oracles with median pricing and staleness protection.

**Purpose**: Enable treasury-backed tokens with real-time price discovery, circuit breakers, and proof-of-reserves mechanics.

**Current Branch State**:

- **Date**: 2025-10-21
- **Commit**: `9e9561a` (copilot/docsreadme-refresh)
- **Network**: Sepolia testnet (primary deployment target)

---

## Architecture

### System Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         Price Providers                              │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │ Yahoo Finance│────>│ Polygon.io   │────>│ Cache (60s TTL) │    │
│  │  (Primary)   │     │  (Fallback)  │     │   (Emergency)   │    │
│  └─────────────┘     └──────────────┘     └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    GoogleFinanceChecker                              │
│        (Cross-validation: dashed/inverse/XAU override)               │
│              Alert threshold: 1.0% FX, 1.5% XAU                     │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Watcher                                    │
│  - Normalizes prices to 18 decimals                                 │
│  - Implements fallback chain: Yahoo → Polygon → Cache               │
│  - Logs: [PROVIDER:*], [FALLBACK→*]                                │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NAVOracleAdapter (on-chain)                       │
│  - Timestamp clamp (staleness protection)                           │
│  - Deviation threshold checks (basis points)                        │
│  - Role: ORACLE_UPDATER_ROLE required                               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AsiaFlexToken & TreasuryController                      │
│  - ERC20 with EIP-2612 permit                                       │
│  - Circuit breakers (daily mint/burn caps)                          │
│  - Treasury-signed attestations for mint/redeem                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component           | Purpose                                  | Location                     |
| ------------------- | ---------------------------------------- | ---------------------------- |
| **Smart Contracts** | Token, Oracle, Treasury controller       | `contracts/**/*.sol`         |
| **Price Pipeline**  | Yahoo/Polygon providers + Google checker | `scripts/ops/providers/*.ts` |
| **Asset Mapping**   | Symbol → ticker resolution               | `scripts/ops/assets.map.ts`  |
| **NAV Watcher**     | Price feed loop with fallback logic      | `tasks/nav/update.ts`        |
| **Monitor**         | Health checks, alerting, reports         | `scripts/ops/status.ts`      |
| **E2E Ops**         | Full lifecycle: mint → transfer → redeem | `playground/demo-e2e.ts`     |

---

## Contracts

### Deployed Contracts (Sepolia)

| Contract Name          | Path                               | Network | Address                        | Key Roles                                           |
| ---------------------- | ---------------------------------- | ------- | ------------------------------ | --------------------------------------------------- |
| **AsiaFlexToken**      | `contracts/AsiaFlexToken.sol`      | Sepolia | _See deployments/sepolia.json_ | `TREASURY_ROLE`, `PAUSER_ROLE`, `CAPS_MANAGER_ROLE` |
| **NAVOracleAdapter**   | `contracts/NAVOracleAdapter.sol`   | Sepolia | _See deployments/sepolia.json_ | `ORACLE_UPDATER_ROLE`, `ORACLE_MANAGER_ROLE`        |
| **TreasuryController** | `contracts/TreasuryController.sol` | Sepolia | _See deployments/sepolia.json_ | `TREASURY_MANAGER_ROLE`                             |
| **ProofOfReserve**     | `contracts/ProofOfReserve.sol`     | Sepolia | _See deployments/sepolia.json_ | Reserve attestation tracking                        |

> **Note**: Deployment addresses are stored in `deployments/sepolia.json` after running deploy scripts. If missing, re-run `npm run deploy:sepolia`.

### Oracle Updater Role & MedianOracle

- **ORACLE_UPDATER_ROLE**: Required to call `NAVOracleAdapter.updateNAV(uint256)`.
- **Timestamp Clamp**: Oracle rejects updates if `block.timestamp` exceeds `lastUpdateTimestamp + stalenessThreshold`.
- **Deviation Checks**: Price updates must stay within `deviationThreshold` (basis points, default 10%) unless using `--force` flag (emergency only).

---

## Price Pipeline

### Symbol Mapping (`scripts/ops/assets.map.ts`)

```typescript
YAHOO_TICKERS = {
  XAUUSD: "GC=F", // Gold futures
  BTCUSD: "BTC-USD",
  ETHUSD: "ETH-USD",
  EURUSD: "EURUSD=X",
  USDJPY: "JPY=X",
};
```

**Aliases**: `GOLD → XAUUSD`, `BITCOIN → BTCUSD`, etc.

### Provider Priority

1. **Yahoo Finance** (primary): `fetchYahooPrice(ticker)`
   - Fetches `regularMarketPrice` or falls back to last `close` price.
   - Cache TTL: 60 seconds.
2. **Polygon.io** (fallback): `fetchPolygonPrice(symbol)`
   - Requires `POLYGON_API_KEY` env var.
   - Supports 6-char FX pairs (e.g., `EURUSD`).
3. **Cache** (emergency): Last known good price stored in memory.

**Logs**:

- `[PROVIDER:Yahoo]` — Success from Yahoo.
- `[FALLBACK→Polygon]` — Yahoo failed, trying Polygon.
- `[FALLBACK→Cache]` — All providers failed, using stale cache.

### Normalization

All prices normalized to **18 decimals** before submitting to on-chain oracle:

```typescript
const navWei = ethers.parseEther(price.toString());
```

### Google Finance Checker

**Purpose**: Cross-validate provider prices to detect anomalies.

**Logic**:

1. **Straight**: Query `<BASE><QUOTE>` (e.g., `EURUSD`).
2. **Dashed**: Fallback to `<BASE>-<QUOTE>` (e.g., `EUR-USD`).
3. **Inverse**: If direct fails, compute `1 / <QUOTE><BASE>` (e.g., `1 / USDEUR`).
4. **XAU Override**: For `XAUUSD`, parses Gold futures (GCW00/COMEX) from markup.

**Alert Thresholds**:

- FX pairs: **1.0%** deviation.
- XAU (Gold): **1.5%** deviation.

**Outputs**: `GoogleCheckResult` with `ok`, `diffPct`, `alert`, `resolutionPath`.

---

## Ops & Monitoring

### NAV Feeder (Once)

Update oracle once with latest price:

```bash
npx hardhat nav:update --nav 105.50 --network sepolia
```

**Dry-run mode** (no transaction):

```bash
npx hardhat nav:update --nav 105.50 --network sepolia --dry-run
```

**Force mode** (bypass deviation checks):

```bash
npx hardhat nav:update --nav 105.50 --network sepolia --force
```

### Operational Scripts

#### Mint Tokens

```bash
npx hardhat run scripts/ops/mint.ts -- \
  0xRECIPIENT_ADDRESS 1000 0xATTESTATION_HASH \
  --network sepolia
```

**Dry-run**:

```bash
npx hardhat run scripts/ops/mint.ts -- \
  0xRECIPIENT_ADDRESS 1000 0xATTESTATION_HASH \
  --dry-run --network sepolia
```

#### Burn Tokens

```bash
npx hardhat run scripts/ops/burn.ts -- \
  0xFROM_ADDRESS 500 0xATTESTATION_HASH \
  --network sepolia
```

#### Status Check

```bash
npm run ops:status -- --network sepolia
```

Output includes:

- Token supply, caps, paused state
- Oracle NAV, staleness, deviation threshold
- Role assignments

### Monitor (Health + Webhook)

Run status checks and send alerts:

```bash
npm run ops:status -- --network sepolia
```

**Webhook payload** (if `OPS_ALERT_WEBHOOK` set):

- Token status: supply, caps, paused state.
- Oracle status: NAV, staleness, deviation.
- Timestamp and network info.

### Reports

Generated in `reports/` (if directory exists):

| Report File                 | Content                                 | Validator                         |
| --------------------------- | --------------------------------------- | --------------------------------- |
| `reports/last_run.json`     | Latest NAV update results               | `npm run validate:reports` (TODO) |
| `reports/last_inverse.json` | Inverse price resolution fallbacks      | Manual review                     |
| `reports/e2e_quick.json`    | E2E test results (mint/transfer/redeem) | Schema validation (TODO)          |

**Archival**: Reports timestamped on each run; old reports moved to `reports/archive/` (manual).

---

## E2E Quick Flow

### Sequence

1. **Mint**: Treasury role mints tokens with signed attestation.
2. **Transfer**: User transfers tokens to another address.
3. **Redeem**: User requests redeem (EIP-712 signature required).
4. **Burn**: Treasury burns tokens after off-chain settlement.

### Run E2E (Dry-Run)

```bash
npm run dev:demo -- --network localhost
```

### Run E2E (Live on Testnet)

```bash
# Start local node first (Terminal 1)
npm run dev:node

# Deploy and run demo (Terminal 2)
npm run dev:demo
```

**Report Output**: `playground/out/demo-report.json`

```json
{
  "timestamp": "2025-10-21T07:30:00Z",
  "network": "localhost",
  "operations": [
    { "type": "mint", "amount": "1000", "txHash": "0xabc..." },
    { "type": "transfer", "amount": "300", "txHash": "0xdef..." }
  ],
  "finalState": { "totalSupply": "1000", "account1Balance": "700" }
}
```

**Interpretation**:

- `operations`: Array of executed steps.
- `finalState`: Token balances and supply after test.

### Gas Overrides

For high-priority transactions (e.g., during network congestion):

```typescript
const tx = await token.mint(to, amount, attestation, {
  gasPrice: ethers.parseUnits("50", "gwei"),
  gasLimit: 500_000,
});
```

---

## Configuration (.env)

### Required Variables

| Variable              | Purpose                       | Example                                 |
| --------------------- | ----------------------------- | --------------------------------------- |
| `SEPOLIA_RPC_URL`     | Sepolia RPC endpoint          | `https://sepolia.infura.io/v3/YOUR_KEY` |
| `PRIVATE_KEY`         | Deployer/feeder private key   | `0xabc...`                              |
| `POLYGON_API_KEY`     | Polygon.io API key (optional) | `YOUR_POLYGON_KEY`                      |
| `ETHERSCAN_API_KEY`   | Etherscan verification        | `YOUR_ETHERSCAN_KEY`                    |
| `POLYGONSCAN_API_KEY` | Polygonscan verification      | `YOUR_POLYGONSCAN_KEY`                  |

### Optional Variables

| Variable                | Default                   | Purpose                          |
| ----------------------- | ------------------------- | -------------------------------- |
| `OPS_ALERT_WEBHOOK`     | (none)                    | Slack/Discord webhook for alerts |
| `MAINNET_RPC_URL`       | (none)                    | Mainnet RPC for forking          |
| `POLYGON_RPC_URL`       | `https://polygon-rpc.com` | Polygon network RPC              |
| `REPORT_GAS`            | `false`                   | Enable gas reporting in tests    |
| `COINMARKETCAP_API_KEY` | (none)                    | CMC API for gas pricing          |

### Security Notes

- **Never commit** `.env` files to Git. Use `.env.example` as template.
- Store secrets in secure vaults (AWS Secrets Manager, GitHub Secrets).
- Rotate keys quarterly.

---

## Local Dev

### Setup

```bash
# Install dependencies
npm ci

# Compile contracts
npx hardhat compile

# Build TypeScript
npm run build

# Typecheck
npm run typecheck

# Lint (TypeScript + Solidity)
npm run lint
```

### Run Local Node

```bash
# Terminal 1: Start Hardhat node
npm run dev:node

# Terminal 2: Deploy contracts locally
npm run deploy -- --network localhost

# Terminal 3: Run demo
npm run dev:demo
```

### Run Tests

```bash
# Unit tests
npm test

# Coverage
npm run coverage

# Gas snapshot
npm run gas-snapshot
```

---

## CI/CD

### Workflow: CI (`ci.yml`)

**Stages**:

1. **Lint**: TypeScript (`eslint`) + Solidity (`solhint`).
2. **Build**: Compile contracts + TypeScript.
3. **Test**: Run Hardhat tests with gas reporting.
4. **Coverage**: Generate coverage report (upload to Codecov).
5. **Slither**: Static analysis for security vulnerabilities.

**Trigger**: Push to `main`/`develop`, or PRs targeting these branches.

**Badges**: See top of README.

### Force Run on PR

To trigger CI on your PR:

```bash
git commit --allow-empty -m "ci: trigger checks"
git push
```

### Additional Workflows

| Workflow             | Purpose                                    | File                                   |
| -------------------- | ------------------------------------------ | -------------------------------------- |
| `release.yml`        | Semantic release (CHANGELOG, version bump) | `.github/workflows/release.yml`        |
| `slither.yml`        | Weekly security scans                      | `.github/workflows/slither.yml`        |
| `branch-cleanup.yml` | Auto-delete merged branches                | `.github/workflows/branch-cleanup.yml` |
| `codeql.yml`         | GitHub CodeQL security scanning            | `.github/workflows/codeql.yml`         |

---

## Security & Roles

### Role-Based Access Control

| Role                     | Contract           | Powers                         |
| ------------------------ | ------------------ | ------------------------------ |
| `DEFAULT_ADMIN_ROLE`     | All                | Grant/revoke other roles       |
| `ORACLE_UPDATER_ROLE`    | NAVOracleAdapter   | Update NAV prices              |
| `ORACLE_MANAGER_ROLE`    | NAVOracleAdapter   | Set thresholds, pause oracle   |
| `TREASURY_ROLE`          | AsiaFlexToken      | Mint/burn tokens               |
| `PAUSER_ROLE`            | AsiaFlexToken      | Pause/unpause token operations |
| `CAPS_MANAGER_ROLE`      | AsiaFlexToken      | Adjust supply/daily caps       |
| `BLACKLIST_MANAGER_ROLE` | AsiaFlexToken      | Blacklist addresses            |
| `TREASURY_MANAGER_ROLE`  | TreasuryController | Manage signer, expiration      |

### Least-Privilege Principle

- Separate keys for feeder (oracle updates) vs. deployer (admin).
- Use multi-sig wallets (Gnosis Safe) for `DEFAULT_ADMIN_ROLE`.
- Monitor role grants via `roles:check` task:

```bash
npx hardhat roles:check --network sepolia
```

### Pre-Checks (Oracle)

Before accepting NAV update:

1. **Non-zero price**: Revert if `newNav == 0` with `InvalidTimestamp(newNav)`.
2. **Deviation check**: If `abs(newNav - currentNav) / currentNav > deviationThreshold`, revert with `DeviationTooHigh`.
3. **Timestamp validation**: Ensure `block.timestamp <= lastUpdateTimestamp + stalenessThreshold`.

### Common Reverts

| Error                                                | Cause                        | Fix                                                |
| ---------------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| `InvalidTimestamp(uint256)`                          | Price is zero or stale       | Check price source; use `--force` if emergency     |
| `DeviationTooHigh(uint256, uint256, uint256)`        | Price jump exceeds threshold | Verify market conditions; use `--force` cautiously |
| `AccessControlUnauthorizedAccount(address, bytes32)` | Missing role                 | Grant role via `npx hardhat roles:grant`           |
| `Pausable: paused`                                   | Contract paused              | Unpause with `PAUSER_ROLE`                         |
| `execution reverted` (generic)                       | Multiple causes              | Enable debug with `hardhat run --verbose`          |

---

## Roadmap / Gaps (To-Improve)

### 1. Auto-sign Redeem (EIP-712)

**Current State**: Manual signature generation required for redeem operations.

**TODO**:

- [ ] Add `--permit-json` flag to `scripts/ops/burn.ts` to read EIP-712 payload.
- [ ] Add `--e2e-autosign` flag in `playground/demo-e2e.ts` to auto-generate signatures.
- [ ] Implement helper: `utils/eip712Signer.ts` for TypedData signing.
- [ ] Add retry logic for signature RPC failures.

**Next Step**: Create `utils/eip712Signer.ts` with `signRedeemRequest()` function.

### 2. Provider Resilience

**Current State**: Basic fallback (Yahoo → Polygon → Cache) but no rate-limit handling or exponential backoff.

**TODO**:

- [ ] Add exponential backoff in `Provider.ts` for HTTP 429/503 errors.
- [ ] Implement batching for multi-asset updates (single API call).
- [ ] Add circuit breaker: disable provider after 5 consecutive failures.
- [ ] Persist rate-limit state to Redis (multi-instance coordination).

**Next Step**: Modify `fetchYahooPrice()` in `scripts/ops/providers/Provider.ts` to retry with backoff.

### 3. Test Coverage: Monitor/Checker

**Current State**: No unit tests for `GoogleFinanceChecker.ts` or monitor scripts.

**TODO**:

- [ ] Add tests in `test/ops/GoogleFinanceChecker.spec.ts`.
- [ ] Mock HTML responses for inverse/dashed/XAU override scenarios.
- [ ] Test alert threshold calculations (1.0% vs 1.5%).
- [ ] Add tests for webhook payload formatting.

**Next Step**: Create `test/ops/` directory and add test file.

### 4. Report Schema Validation

**Current State**: Reports generated but no schema validation.

**TODO**:

- [ ] Define JSON schemas for `last_run.json`, `e2e_quick.json` in `schemas/`.
- [ ] Implement `npm run validate:reports` script using `ajv` validator.
- [ ] Add GitHub Action to validate reports on PR.
- [ ] Harden webhook payload with schema (Slack Block Kit).

**Next Step**: Install `ajv` and create `scripts/validate-reports.ts`.

### 5. NAV Watcher Loop

**Current State**: Single-shot NAV update only (`nav:update` task).

**TODO**:

- [ ] Create `scripts/ops/nav-watcher.ts` with loop logic.
- [ ] Add `--interval <seconds>` flag (default: 300).
- [ ] Implement graceful shutdown (SIGINT/SIGTERM handling).
- [ ] Add health endpoint (HTTP server on port 3000).
- [ ] Dockerize watcher for production deployment.

**Next Step**: Create `scripts/ops/nav-watcher.ts` skeleton with loop structure.

### 6. Deployment Tracking

**Current State**: No `deployments/` directory in repository.

**TODO**:

- [ ] Create `deployments/` directory structure.
- [ ] Add `deployments/sepolia.json` after deployment.
- [ ] Implement `scripts/deploy/save-deployment.ts` helper.
- [ ] Add deployment verification script.

**Next Step**: Create `deployments/` directory and add `.gitkeep` file.

---

## Troubleshooting

### Error: `InvalidTimestamp`

**Symptom**: Transaction reverts with `InvalidTimestamp(0)` or `InvalidTimestamp(<low-value>)`.

**Cause**: Price provider returned 0 or oracle detected stale timestamp.

**Fix**:

1. Check provider status: `curl https://query1.finance.yahoo.com/v8/finance/chart/GC=F`
2. Use `--force` flag (emergency only): `npx hardhat nav:update --nav 105.50 --force`
3. Investigate with verbose logging: `DEBUG=* npx hardhat nav:update ...`

### Error: `execution reverted`

**Symptom**: Generic revert without specific error.

**Cause**: Often due to missing role or contract paused.

**Fix**:

1. Check roles: `npx hardhat roles:check --network sepolia`
2. Check paused state: `npx hardhat status:check --network sepolia` or `npm run ops:status`
3. Enable verbose Hardhat output: `npx hardhat run <script> --verbose`

### Error: Google Parse Fail

**Symptom**: `GoogleCheckResult.error = "parse failed"` in logs.

**Cause**: Google Finance HTML structure changed.

**Fix**:

1. Inspect HTML manually: `curl -A "Mozilla/5.0" "https://www.google.com/finance/quote/EUR-USD:CURRENCY"`
2. Update regex in `GoogleFinanceChecker.ts` (functions: `extractForexPrice`, `extractOverridePrice`).
3. Add test case in `test/ops/GoogleFinanceChecker.spec.ts` with new HTML fixture.

### Error: Missing Roles

**Symptom**: `AccessControlUnauthorizedAccount(0x123..., 0xabc...)`

**Cause**: Signer lacks required role.

**Fix**:

```bash
# Grant ORACLE_UPDATER_ROLE to feeder address
npx hardhat roles:grant \
  --contract NAVOracleAdapter \
  --role ORACLE_UPDATER_ROLE \
  --account 0xYOUR_FEEDER_ADDRESS \
  --network sepolia
```

### Error: Daily Caps Exceeded

**Symptom**: `DailyCapsExceeded(amount, remaining)`

**Cause**: Attempted mint exceeds `maxDailyMint` or `maxDailyNetInflows`.

**Fix**:

1. Check remaining caps: `npm run ops:status -- --network sepolia`
2. Wait for daily reset (midnight UTC).
3. Increase caps (if authorized):

```bash
npx hardhat run scripts/ops/setCaps.ts -- \
  --max-daily-mint 20000 \
  --network sepolia
```

### Error: Missing Deployment File

**Symptom**: `Deployment file not found for network: sepolia`

**Cause**: Contracts not yet deployed on target network.

**Fix**:

```bash
# Deploy contracts to Sepolia
npm run deploy:sepolia

# Verify deployment
npm run verify:sepolia
```

---

## Contributing

See [GUIDA_GIT.md](GUIDA_GIT.md) for Git workflow and branching strategy.

## License

MIT License. See LICENSE file for details.

---

**Maintainers**: AsiaFlex Team  
**Support**: [GitHub Issues](https://github.com/PolPol45/ASIAFLEX/issues)  
**Docs Version**: 1.0.0 (2025-10-21)
