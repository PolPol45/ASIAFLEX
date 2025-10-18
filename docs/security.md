# Security Model

## Overview

AsiaFlex implements a multi-layered security model designed to protect user funds, ensure system stability, and maintain operational integrity through various protection mechanisms.

## Threat Model

### Identified Threats

1. **Smart Contract Vulnerabilities**: Reentrancy, overflow, access control bypass
2. **Oracle Manipulation**: Price feed manipulation, staleness attacks
3. **Governance Attacks**: Admin key compromise, unauthorized operations
4. **Economic Attacks**: Flash loan attacks, large redemption runs
5. **Operational Risks**: Key management, multisig compromise

### Risk Assessment Matrix

| Threat               | Likelihood | Impact   | Mitigation                         |
| -------------------- | ---------- | -------- | ---------------------------------- |
| Reentrancy Attack    | Low        | High     | ReentrancyGuard, CEI pattern       |
| Oracle Manipulation  | Medium     | High     | Deviation limits, staleness checks |
| Admin Key Compromise | Low        | Critical | Multisig, time locks               |
| Flash Loan Attack    | Medium     | Medium   | Circuit breakers, attestations     |
| Large Redemption Run | High       | Medium   | Daily limits, reserve management   |

## Security Controls

### Smart Contract Security

#### Access Control

```solidity
// Role-based access control (RBAC)
bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant CAPS_MANAGER_ROLE = keccak256("CAPS_MANAGER_ROLE");

// Multi-signature administrative functions
modifier onlyMultisig() {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Admin required");
    _;
}
```

#### Reentrancy Protection

```solidity
// OpenZeppelin ReentrancyGuard
contract AsiaFlexToken is ReentrancyGuard {
    function mint(address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
    {
        // Checks-Effects-Interactions pattern
        _checkDailyLimits(amount);
        _updateDailyMintAmount(amount);
        _mint(to, amount);
    }
}
```

#### Circuit Breakers

```solidity
// Daily operational limits
uint256 public maxDailyMint;
uint256 public maxDailyNetInflows;
uint256 public dailyMintAmount;
uint256 public dailyNetInflowAmount;

// Supply caps
uint256 public supplyCap;

function _checkDailyLimits(uint256 amount) internal view {
    require(dailyMintAmount + amount <= maxDailyMint, "Daily mint exceeded");
    require(totalSupply() + amount <= supplyCap, "Supply cap exceeded");
}
```

### Oracle Security

#### Staleness Protection

```solidity
uint256 public stalenessThreshold; // seconds

function updateNAV(uint256 newNAV) external onlyRole(ORACLE_UPDATER_ROLE) {
    require(block.timestamp <= _lastUpdateTimestamp + stalenessThreshold,
           "Price too stale");
    // ... update logic
}

function isStale() public view returns (bool) {
    return block.timestamp > _lastUpdateTimestamp + stalenessThreshold;
}
```

#### Deviation Protection

```solidity
uint256 public deviationThreshold; // basis points

function updateNAV(uint256 newNAV) external onlyRole(ORACLE_UPDATER_ROLE) {
    uint256 deviation = _calculateDeviation(_currentNAV, newNAV);
    require(deviation <= deviationThreshold, "Deviation too high");
    // ... update logic
}
```

### Attestation Security

#### EIP712 Signatures

```solidity
bytes32 private constant MINT_REQUEST_TYPEHASH = keccak256(
    "MintRequest(address to,uint256 amount,uint256 timestamp,bytes32 reserveHash)"
);

function mint(
    address to,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash,
    bytes calldata signature
) external {
    bytes32 structHash = keccak256(abi.encode(
        MINT_REQUEST_TYPEHASH,
        to,
        amount,
        timestamp,
        reserveHash
    ));

    bytes32 digest = _hashTypedDataV4(structHash);
    address signer = ECDSA.recover(digest, signature);
    require(signer == treasurySigner, "Invalid signature");

    // ... mint logic
}
```

#### Replay Protection

```solidity
mapping(bytes32 => bool) public usedRequests;

function _validateRequest(bytes32 requestHash, uint256 timestamp) internal {
    require(!usedRequests[requestHash], "Request already used");
    require(block.timestamp <= timestamp + requestExpiration, "Request expired");
    usedRequests[requestHash] = true;
}
```

## Security Procedures

### Emergency Response

#### Pause Mechanism

```solidity
contract AsiaFlexToken is Pausable {
    function emergencyPause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function emergencyUnpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }
}
```

#### Incident Response Plan

1. **Detection**: Automated monitoring triggers alert
2. **Assessment**: Determine scope and severity
3. **Containment**: Emergency pause if necessary
4. **Investigation**: Analyze root cause
5. **Remediation**: Deploy fixes or workarounds
6. **Recovery**: Resume operations after validation
7. **Post-mortem**: Document lessons learned

### Key Management

#### Multi-signature Requirements

- **Admin Operations**: 3-of-5 multisig for role management
- **Treasury Operations**: 2-of-3 multisig for mint/redeem
- **Oracle Updates**: Hardware security modules (HSM)
- **Emergency Actions**: Fast-track 2-of-3 for critical situations

#### Key Rotation

- Regular rotation of administrative keys
- Hardware wallet storage for cold keys
- Secure key generation and backup procedures
- Time-locked key updates for transparency

### Audit & Monitoring

#### Security Audits

- **Pre-deployment**: Comprehensive security audit by reputable firm
- **Post-deployment**: Regular security reviews
- **Code Changes**: Audit any contract upgrades
- **Third-party**: Bug bounty program for ongoing security

#### Continuous Monitoring

````typescript
// Monitoring alerts
interface SecurityAlert {
  type: 'LARGE_MINT' | 'ORACLE_DEVIATION' | 'CIRCUIT_BREAKER' | 'PAUSE_EVENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
}

// Key metrics to monitor
const SECURITY_METRICS = {
  dailyMintVolume: 'Daily mint volume vs limits',
  oracleDeviation: 'Price deviation from expected range',
  reserveRatio: 'Collateral ratio vs outstanding tokens',
  largeTransactions: 'Transactions above threshold',
  failedTransactions: 'Failed transaction patterns'
};

## Slither quick start

To reproduce the repository's Slither checks locally:

1. **Install tooling**
     ```bash
     pip install slither-analyzer solc-select
     solc-select install 0.8.26
     solc-select use 0.8.26
     ```
2. **Run the configured analysis**
     ```bash
     slither . --config-file slither.config.json
     ```

### Docker alternative

When Python tooling is unavailable, use the Crytic container:

```bash
docker run --rm -v "$PWD:/project" -w /project trailofbits/eth-security-toolbox \
    slither . --config-file slither.config.json --solc-remaps @openzeppelin=node_modules/@openzeppelin
````

Run `npm run lint:sol` (Solhint) and `npm run lint` (TypeScript lint) to align with CI expectations before Slither.

```

## Security Checklist

### Pre-deployment
- [ ] Comprehensive security audit completed
- [ ] All critical and high severity issues resolved
- [ ] Multisig wallets configured and tested
- [ ] Emergency procedures documented and tested
- [ ] Oracle price feeds validated
- [ ] Circuit breaker limits configured
- [ ] Access control roles properly assigned

### Operational Security
- [ ] Daily reserve reconciliation
- [ ] Oracle price monitoring
- [ ] Circuit breaker status checks
- [ ] Multisig transaction validation
- [ ] Security alert monitoring
- [ ] Incident response readiness

### Ongoing Maintenance
- [ ] Regular security reviews
- [ ] Bug bounty program active
- [ ] Key rotation schedule followed
- [ ] Monitoring system health checks
- [ ] Incident response plan updates
- [ ] Staff security training

## Best Practices

### Development
- Follow OpenZeppelin security patterns
- Implement Checks-Effects-Interactions pattern
- Use battle-tested libraries and components
- Minimize external dependencies
- Comprehensive unit and integration testing

### Operations
- Principle of least privilege for access control
- Time-locked administrative operations
- Multi-signature requirements for sensitive functions
- Regular security assessments and penetration testing
- Incident response plan and team training

### Infrastructure
- Secure key management with HSMs
- Network segmentation and monitoring
- DDoS protection and rate limiting
- Secure communication channels
- Regular backup and disaster recovery testing
```
