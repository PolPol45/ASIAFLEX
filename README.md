# AsiaFlex Token - Enterprise DeFi Infrastructure

[![CI/CD Pipeline](https://github.com/PolPol45/ASIAFLEX/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/PolPol45/ASIAFLEX/actions/workflows/ci-cd.yml)
[![Coverage Status](https://codecov.io/gh/PolPol45/ASIAFLEX/branch/main/graph/badge.svg)](https://codecov.io/gh/PolPol45/ASIAFLEX)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AsiaFlex Token (AFX) is an enterprise-grade ERC20 token with comprehensive treasury controls, oracle integration, and institutional-level security features. Built following IndexCoop standards with enhanced proof-of-reserves functionality.

## 🏗️ Architecture

### Core Contracts

#### AsiaFlexToken.sol
Enterprise-grade ERC20 token with:
- **AccessControl**: Role-based permissions (TREASURY_ROLE, PAUSER_ROLE, etc.)
- **Pausable**: Emergency pause functionality
- **EIP712 Permits**: Gasless approvals with signed messages
- **Circuit Breakers**: Daily mint caps and net inflow limits
- **Blacklist**: Optional KYC/compliance features
- **Legacy Compatibility**: Maintains existing API surface

#### NAVOracleAdapter.sol
Robust oracle system with:
- **Staleness Protection**: Configurable data freshness thresholds
- **Deviation Guards**: Maximum price movement protections
- **Emergency Override**: Force updates for exceptional circumstances
- **Access Control**: Separate updater and manager roles

#### TreasuryController.sol
Attestation-based treasury operations:
- **EIP712 Signatures**: Cryptographically signed mint/redeem requests
- **Replay Protection**: Prevents duplicate transaction execution
- **Reserve Attestations**: Links operations to off-chain reserve proofs
- **Expiration Controls**: Time-bounded request validity

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
git clone https://github.com/PolPol45/ASIAFLEX.git
cd ASIAFLEX
npm install
```

### Build & Test

```bash
# Compile contracts
npm run build

# Run tests
npm test

# Generate coverage report
npm run coverage

# Run linting
npm run lint
```

## 📋 Commands Reference

### Development Commands

```bash
# Compilation
npm run build                    # Compile contracts + TypeScript
npm run typecheck               # TypeScript type checking

# Testing
npm test                        # Run all tests
npm run test:fork              # Run with mainnet fork
npm run coverage               # Generate coverage report
npm run gas-snapshot           # Generate gas usage report

# Code Quality
npm run lint                   # Lint Solidity + TypeScript
npm run lint:fix              # Auto-fix linting issues
npm run clean                  # Clean build artifacts
```

### Deployment

```bash
# Deploy to network
npm run deploy                 # Deploy using hardhat.config.ts network
npx hardhat run scripts/deploy/00_deploy_asiaflex.ts --network sepolia

# Verify contracts
npm run verify
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Operational Scripts

```bash
# Mint tokens
npx hardhat run scripts/ops/mint.ts -- <to> <amount> [attestationHash] [--dry-run]

# Burn tokens  
npx hardhat run scripts/ops/burn.ts -- <from> <amount> [attestationHash] [--dry-run]

# Pause/unpause
npx hardhat run scripts/ops/pause.ts -- <pause|unpause> [--dry-run]

# Update caps
npx hardhat run scripts/ops/setCaps.ts -- --supply-cap <amount> [--dry-run]
```

### Hardhat Tasks

```bash
# System status
npx hardhat status                    # Full system overview
npx hardhat status --contract token  # Specific contract status

# Role management
npx hardhat roles                     # Show all roles
npx hardhat roles --account 0x123... # Check specific account

# Oracle management
npx hardhat nav:update --nav 105.50  # Update NAV
npx hardhat nav:update --nav 95.00 --force  # Emergency update
```

## 🔧 Configuration

### Environment Variables

Create `.env` file:

```bash
# RPC URLs
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com

# Private Keys (for deployment)
PRIVATE_KEY=0x...

# API Keys
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_KEY
COINMARKETCAP_API_KEY=YOUR_CMC_KEY

# Contract Addresses (after deployment)
ASIAFLEX_TOKEN_ADDRESS=0x...
NAV_ORACLE_ADDRESS=0x...
TREASURY_CONTROLLER_ADDRESS=0x...
```

## 🛡️ Security Features

### Circuit Breakers

- **Daily Mint Cap**: Limits token creation per 24-hour period
- **Daily Net Inflow Cap**: Controls overall token supply expansion
- **Supply Cap**: Hard ceiling on total token supply
- **Automatic Reset**: Daily limits reset every 24 hours

### Access Control

- **TREASURY_ROLE**: Can mint/burn tokens through attestations
- **PAUSER_ROLE**: Can pause/unpause token operations
- **CAPS_MANAGER_ROLE**: Can modify supply and daily caps
- **BLACKLIST_MANAGER_ROLE**: Can blacklist addresses for compliance
- **ORACLE_UPDATER_ROLE**: Can update NAV within deviation limits
- **ORACLE_MANAGER_ROLE**: Can force NAV updates and change thresholds

### Oracle Protection

- **Staleness Checks**: Prevents use of outdated price data
- **Deviation Limits**: Protects against extreme price movements
- **Force Update**: Emergency override with elevated privileges
- **Signature Verification**: All updates cryptographically signed

### Treasury Security

- **EIP712 Signatures**: Industry-standard signed message format
- **Replay Protection**: Prevents transaction duplication
- **Request Expiration**: Time-bounded operation validity
- **Reserve Attestation**: Links operations to off-chain proof

## 📊 Testing & Coverage

### Test Structure

```
test/
├── unit/                      # Contract unit tests
│   ├── AsiaFlexToken.test.ts
│   ├── NAVOracleAdapter.test.ts
│   └── TreasuryController.test.ts
├── integration/               # System integration tests
│   └── SystemIntegration.test.ts
└── fixtures/                  # Reusable test helpers
    └── AsiaFlexFixture.ts
```

### Coverage Target

Maintaining ≥95% coverage across:
- Statement coverage
- Branch coverage  
- Function coverage
- Line coverage

### Fork Testing

Run integration tests against mainnet fork:

```bash
FORK_TESTING=true MAINNET_RPC_URL=<url> npm run test:fork
```

## 🚀 Deployment Guide

### 1. Testnet Deployment

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy/00_deploy_asiaflex.ts --network sepolia

# Verify contracts
npx hardhat verify --network sepolia <TOKEN_ADDRESS> "AsiaFlexToken" "AFX" <SUPPLY_CAP> <MAX_DAILY_MINT> <MAX_DAILY_NET_INFLOWS>
npx hardhat verify --network sepolia <ORACLE_ADDRESS> <INITIAL_NAV> <STALENESS_THRESHOLD> <DEVIATION_THRESHOLD>
npx hardhat verify --network sepolia <TREASURY_ADDRESS> <TOKEN_ADDRESS> <TREASURY_SIGNER> <REQUEST_EXPIRATION>
```

### 2. Mainnet Deployment

```bash
# Deploy to mainnet (requires MAINNET_PRIVATE_KEY)
npx hardhat run scripts/deploy/00_deploy_asiaflex.ts --network mainnet

# Verify on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESSES>
```

### 3. Post-Deployment Setup

1. **Configure Roles**: Grant appropriate roles to operational addresses
2. **Set Caps**: Configure initial daily mint and supply caps
3. **Oracle Setup**: Initialize NAV data and update permissions
4. **Treasury Configuration**: Set treasury signer and expiration times

## 🔒 Security Checklist

### Pre-Deployment
- [ ] All tests passing with ≥95% coverage
- [ ] Slither analysis completed with no critical issues
- [ ] Role assignments reviewed and documented
- [ ] Initial parameters validated (caps, thresholds, addresses)
- [ ] Emergency procedures documented
- [ ] Backup treasury signer configured

### Post-Deployment
- [ ] Contract verification completed on block explorer
- [ ] Role assignments verified on-chain
- [ ] Circuit breakers tested
- [ ] Oracle data initialized
- [ ] Emergency pause tested
- [ ] Operational runbooks updated
- [ ] Monitoring alerts configured

### Ongoing Operations
- [ ] Daily NAV updates verified
- [ ] Reserve attestations current
- [ ] Circuit breaker usage monitored
- [ ] Role assignments audited monthly
- [ ] Emergency procedures tested quarterly
- [ ] Security audit scheduled annually

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/modifications
- `chore:` - Maintenance tasks

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/PolPol45/ASIAFLEX/wiki)
- **Issues**: [GitHub Issues](https://github.com/PolPol45/ASIAFLEX/issues)
- **Discussions**: [GitHub Discussions](https://github.com/PolPol45/ASIAFLEX/discussions)

---

Built with ❤️ following IndexCoop standards and enterprise best practices.