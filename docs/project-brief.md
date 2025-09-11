# Project Brief

## What AsiaFlex Does

AsiaFlex (AFX) is a blockchain-based stable token that provides users in emerging markets with exposure to a diversified basket of Asian economies through the iShares MSCI All Country Asia ex Japan ETF (AAXJ).

### Core Value Proposition
- **Inflation Protection**: Hedge against local currency devaluation
- **Growth Exposure**: Indirect participation in Asia's economic growth
- **Accessibility**: Low-cost, cross-border digital liquidity
- **Stability**: Fully collateralized with transparent reserves

### Key Features
1. **AAXJ-Pegged Value**: Token value tracks the NAV of AAXJ ETF
2. **Full Collateralization**: 1:1 backing with USDC/USDT reserves
3. **Enterprise Controls**: Circuit breakers, access controls, emergency pause
4. **Transparency**: Regular reserve attestations and on-chain visibility

### Target Users
- **Emerging Market Users**: Protection from currency volatility
- **Cross-border Remittances**: Low-cost international transfers
- **Digital Savings**: Stable store of value with growth potential
- **Institutional Partners**: Exchanges, fintechs, and financial services

## How AsiaFlex Works

### Technical Architecture
AsiaFlex operates on a three-contract system:

1. **AsiaFlexToken**: ERC20 token with enterprise-grade controls
   - Supply caps and daily limits
   - Role-based access control
   - Pausable for emergencies
   - Reentrancy protection

2. **TreasuryController**: Centralized mint/redeem operations
   - EIP712 signed attestations for reserve validation
   - Time-bound requests with replay protection
   - Reserve hash verification

3. **NAVOracleAdapter**: Price feed management
   - AAXJ NAV price updates
   - Staleness and deviation protection
   - Multiple validator support

### Operational Model
```
User Flow: Deposit USDC → Attestation → Mint AFX → Trade/Hold → Redeem → Receive USDC
```

**Minting Process**:
1. User deposits USDC/USDT to authorized exchange
2. Exchange transfers collateral to custodial reserves
3. Treasury generates signed attestation linking reserves to mint request
4. Smart contract validates attestation and mints AFX tokens
5. Daily limits and supply caps enforced automatically

**Redemption Process**:
1. User requests redemption through authorized channel
2. Treasury validates request and burns AFX tokens
3. Equivalent collateral released from reserves
4. User receives USDC/USDT at current AAXJ NAV rate

### Security Model
- **Circuit Breakers**: Daily mint/redeem limits prevent rapid supply changes
- **Oracle Protection**: Price staleness and deviation checks prevent manipulation
- **Access Controls**: Multi-signature wallets and role-based permissions
- **Reserve Attestations**: Regular audits ensure full collateralization

### Regulatory Compliance
- **Centralized Operations**: Mint/redeem controlled by licensed entity
- **KYC/AML**: Through authorized exchange partners
- **Transparency**: Public reserve reports and on-chain verification
- **Jurisdictional Compliance**: Structured for multi-jurisdiction operation

## What's Missing / Decisions Required

### Network Deployment Decisions
- **Primary Network**: Ethereum mainnet vs Polygon vs other L1/L2
- **Multi-chain Strategy**: Single chain vs cross-chain deployment
- **Gas Optimization**: Layer 2 integration for lower transaction costs

### Operational Parameters (Need Final Values)
- **CAP_DAILY_MINT**: Currently 1M AFX (may need adjustment based on demand)
- **CAP_DAILY_NET_INFLOWS**: Currently 1M AFX (may need balancing)
- **ORACLE_MAX_AGE**: Currently 1 hour (consider market hours vs 24/7 crypto)
- **ORACLE_MAX_DEVIATION**: Currently 1% (may be too restrictive for volatile periods)

### Oracle Integration
- **Primary Data Source**: Need production AAXJ price feed integration
- **Backup Oracle**: Chainlink or custom oracle for redundancy
- **Update Frequency**: Real-time vs periodic updates (cost vs accuracy trade-off)
- **Holiday Handling**: AAXJ doesn't trade on weekends/holidays

### KYC/Compliance Framework
- **Blacklist Implementation**: Currently optional, may be required for compliance
- **Whitelist Requirements**: Permissioned access vs open protocol
- **Geographic Restrictions**: Jurisdictional limitations on token access
- **Regulatory Reporting**: Automated compliance reporting requirements

### Reserve Management
- **Custodial Partner**: Selection of institutional custodian
- **Reserve Asset Mix**: USDC vs USDT vs other stablecoins vs fiat
- **Interest Bearing**: Should reserves earn yield vs remain static
- **Emergency Reserves**: Additional backing ratio above 100%

### Bug Bounty & Security
- **Audit Completion**: Final security audit before mainnet deployment
- **Bug Bounty Program**: Incentive structure for security researchers
- **Insurance Coverage**: Smart contract insurance for additional protection
- **Incident Response**: Detailed procedures for security events

### Business Operations
- **Exchange Partnerships**: Integration with major CEX/DEX platforms
- **Market Making**: Liquidity provision strategy
- **Fee Structure**: Transaction fees, mint/redeem fees, and revenue model
- **Treasury Management**: Fee collection and operational funding

### Technical Improvements
- **Gas Optimization**: Further optimization for high-frequency operations
- **Cross-chain Bridge**: Multi-chain token representation
- **Mobile SDK**: Easy integration for mobile wallets and dApps
- **API Integration**: RESTful APIs for partner integration

### Governance Model
- **Decentralization Roadmap**: Future transition to DAO governance
- **Parameter Updates**: Process for updating operational parameters
- **Emergency Procedures**: Governance for emergency situations
- **Token Holder Rights**: Future utility for AFX token holders

### Immediate Priorities
1. **Finalize Oracle Integration**: Production AAXJ price feed
2. **Complete Security Audit**: Third-party security review
3. **Select Custodial Partner**: Institutional reserve management
4. **Regulatory Approval**: Compliance framework completion
5. **Exchange Partnerships**: Distribution channel agreements

### Success Metrics
- **Total Value Locked (TVL)**: Target $10M+ in first year
- **Daily Active Users**: 1000+ regular users
- **Geographic Reach**: Presence in 5+ emerging markets
- **Reserve Ratio**: Maintain >100% collateralization
- **Price Stability**: <2% deviation from AAXJ NAV