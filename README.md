# AsiaFlex Token (AFX)

[![Build Status](https://github.com/PolPol45/ASIAFLEX/workflows/CI/badge.svg)](https://github.com/PolPol45/ASIAFLEX/actions)
[![Coverage Status](https://codecov.io/gh/PolPol45/ASIAFLEX/branch/main/graph/badge.svg)](https://codecov.io/gh/PolPol45/ASIAFLEX)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Enterprise-grade ERC20 token with proof of reserves and treasury controls, backed by iShares MSCI All Country Asia ex Japan ETF (AAXJ).

## Overview

AsiaFlex is a stable digital token backed by the iShares MSCI All Country Asia ex Japan ETF (AAXJ), offering users in high-inflation, low-income regions:

- **Stable store of value** protected from local currency volatility
- **Indirect access** to growth potential of Asia's leading economies
- **Low-cost, cross-border digital liquidity** that is simple to use and widely accessible

### Mission Statement

Our mission is to democratize access to an inflation-resistant, globally relevant financial asset—anchored in the strength, diversity, and dynamism of Asia's economies as represented by AAXJ—for underserved populations in emerging markets.

## Quick Demo

Get started with AsiaFlex Token in just a few commands:

```bash
# Install dependencies
npm ci

# Start local blockchain (in one terminal)
npm run dev:node

# Run complete demo scenario (in another terminal)
npm run dev:demo

# Optional: Monitor NAV price in real-time (in third terminal)
npm run dev:watch-price
```

The demo will:

- Deploy all contracts (AsiaFlexToken, NAVOracleAdapter, TreasuryController)
- Set up roles and initial NAV ($100.50)
- Mint 1,000 AFX to demo account
- Transfer 300 AFX between accounts
- Burn 100 AFX tokens
- Test pause/unpause and cap adjustments
- Generate detailed JSON report in `playground/out/`

For step-by-step instructions, see [playground/README_DEMO.md](playground/README_DEMO.md).

## Architecture

```mermaid
graph TB
    User[Users] --> Exchange[Exchanges/Partners]
    Exchange --> Treasury[TreasuryController]
    Treasury --> Token[AsiaFlexToken]
    Treasury --> Oracle[NAVOracleAdapter]
    Oracle --> AAXJ[AAXJ ETF Price Feed]

    subgraph "Smart Contracts"
        Token
        Oracle
        Treasury
    end

    subgraph "External Systems"
        AAXJ
        Reserves[Custodial Reserves]
    end

    Treasury --> Reserves
```

### Components

- **AsiaFlexToken**: ERC20 token with supply caps, circuit breakers, and role-based access
- **TreasuryController**: Controls mint/redeem flows with signed attestations
- **NAVOracleAdapter**: Oracle adapter for AAXJ NAV data with staleness protection
- **Proof of Reserve**: Regular attestations of backing reserves

## Contracts

### AsiaFlexToken

Enterprise-grade ERC20 with:

- **Supply Management**: Configurable supply caps and daily limits
- **Circuit Breakers**: Daily mint and net inflow limits
- **Access Control**: Role-based permissions (Treasury, Pauser, Caps Manager)
- **Security**: Pausable, ReentrancyGuard, optional blacklist functionality
- **Standards**: ERC20, ERC20Permit, EIP712 signatures

### TreasuryController

Centralized mint/redeem controller with:

- **Signed Attestations**: EIP712 signed requests for reserve validation
- **Time-bound Requests**: Configurable expiration for replay protection
- **Reserve Hash Validation**: Links operations to specific reserve states

### NAVOracleAdapter

Oracle for AAXJ price data with:

- **Staleness Protection**: Configurable age limits for price data
- **Deviation Limits**: Maximum allowed price movement between updates
- **Role-based Updates**: Controlled by Oracle Updater and Manager roles

## Roles & Permissions

| Role                     | Contract           | Permissions                         |
| ------------------------ | ------------------ | ----------------------------------- |
| `DEFAULT_ADMIN_ROLE`     | All                | Grant/revoke roles, admin functions |
| `TREASURY_ROLE`          | AsiaFlexToken      | Mint, burn, set reserves/price      |
| `PAUSER_ROLE`            | AsiaFlexToken      | Pause/unpause contract              |
| `CAPS_MANAGER_ROLE`      | AsiaFlexToken      | Modify supply caps and daily limits |
| `BLACKLIST_MANAGER_ROLE` | AsiaFlexToken      | Manage blacklist (if enabled)       |
| `ORACLE_UPDATER_ROLE`    | NAVOracleAdapter   | Update NAV price data               |
| `ORACLE_MANAGER_ROLE`    | NAVOracleAdapter   | Configure oracle parameters         |
| `TREASURY_MANAGER_ROLE`  | TreasuryController | Configure treasury parameters       |

## Security Model

### Circuit Breakers

- **Daily Mint Cap**: Maximum tokens that can be minted per day
- **Daily Net Inflow Cap**: Maximum net token inflow per day
- **Supply Cap**: Maximum total token supply

### Oracle Protection

- **Staleness Check**: Reject prices older than `ORACLE_MAX_AGE` (default: 1 hour)
- **Deviation Limits**: Reject price changes exceeding `ORACLE_MAX_DEVIATION` (default: 1%)

### Access Controls

- Multi-signature treasury management
- Time-locked administrative operations
- Emergency pause functionality

### Attestation Security

- EIP712 signed attestations for mint/redeem operations
- Nonce-based replay protection
- Time-bound request validity

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

```bash
git clone https://github.com/PolPol45/ASIAFLEX.git
cd ASIAFLEX
npm install
cp .env.example .env
# Edit .env with your configuration
```

### Build

```bash
npm run build          # Compile contracts + TypeScript
npm run typecheck      # Type checking only
npm run clean          # Clean artifacts
```

### Testing

```bash
npm test               # Run all tests
npm run test:fork      # Run with mainnet fork
npm run coverage       # Generate coverage report
npm run gas-snapshot   # Gas usage analysis
```

### Linting

```bash
npm run lint           # Lint all files
npm run lint:sol       # Solidity only
npm run lint:ts        # TypeScript only
npm run lint:fix       # Auto-fix issues
```

## Static Analysis

### Solhint

```bash
npm run lint:sol
```

Configured to check for:

- Visibility modifiers
- Event emissions
- Reentrancy patterns
- Naming conventions

### Slither

```bash
slither . --config-file slither.config.json
```

Static analysis for:

- Security vulnerabilities
- Code quality issues
- Gas optimization opportunities

## Deployment & Verification

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Network RPCs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY

# Verification APIs
ETHERSCAN_API_KEY=your_etherscan_key
DEPLOYER_PK=your_private_key
```

### Deploy Contracts

```bash
npm run deploy:sepolia    # Deploy to Sepolia testnet
npm run deploy:mainnet    # Deploy to Ethereum mainnet
npm run deploy:polygon    # Deploy to Polygon
```

### Verify Contracts

```bash
npm run verify:sepolia    # Verify on Sepolia
npm run verify:mainnet    # Verify on Mainnet
npm run verify:polygon    # Verify on Polygon
```

Deployment artifacts are saved to `scripts/deployments/<network>.json`.

## Operations Runbook

### Mint Tokens

```bash
# 1. Generate signed attestation (off-chain)
# 2. Call treasury.mint() with attestation
# 3. Verify daily limits not exceeded
```

### Redeem Tokens

```bash
# 1. Generate signed redeem attestation
# 2. Call treasury.redeem() with attestation
# 3. Burn tokens, transfer reserves
```

### Update NAV Price

```bash
# 1. Fetch latest AAXJ NAV
# 2. Validate within deviation limits
# 3. Call oracle.updateNAV() with new price
```

### Emergency Procedures

```bash
# Pause all operations
npx hardhat run scripts/emergency-pause.ts --network <network>

# Update circuit breaker limits
npx hardhat run scripts/update-caps.ts --network <network>
```

## Incident Response

### Security Incident

1. **Immediate**: Pause all contracts via `PAUSER_ROLE`
2. **Assess**: Determine scope and impact
3. **Coordinate**: Notify stakeholders and exchanges
4. **Remediate**: Deploy fixes or implement workarounds
5. **Resume**: Unpause after validation

### Oracle Malfunction

1. **Detect**: Monitor for stale/invalid price data
2. **Pause**: Stop oracle updates via `ORACLE_MANAGER_ROLE`
3. **Switch**: Activate backup oracle or manual updates
4. **Restore**: Resume automated updates after fix

## Versioning & Releases

This project uses [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/).

### Release Process

Releases are automated via GitHub Actions:

1. Merge changes to `main` branch
2. Semantic Release generates version based on commit messages
3. CHANGELOG.md is updated automatically
4. GitHub Release created with artifacts

### Commit Message Format

```
type(scope): description

feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: test additions/updates
chore: build/dependency updates
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes using conventional commits
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Pre-commit Hooks

Husky enforces code quality:

- ESLint + Prettier for TypeScript
- Solhint for Solidity
- Commit message linting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Additional Documentation

- [Architecture Details](./docs/architecture.md)
- [Contract APIs](./docs/contracts.md)
- [Security Model](./docs/security.md)
- [Operations Guide](./docs/operations.md)
- [Oracle & Attestations](./docs/oracle-and-attestations.md)
- [Testing Strategy](./docs/testing.md)
- [CI/CD Pipeline](./docs/ci-cd.md)
- [Project Brief](./docs/project-brief.md)
