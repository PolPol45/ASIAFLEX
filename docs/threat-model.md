# Threat Model

## Overview

This document provides a comprehensive threat model for the AsiaFlex system, identifying potential attack vectors, vulnerabilities, and mitigation strategies.

## System Architecture Review

### Components

1. **AsiaFlexToken**: ERC20 token with mint/burn capabilities
2. **TreasuryController**: Attestation-based mint/redeem controller
3. **NAVOracleAdapter**: Price oracle with staleness and deviation protection
4. **ProofOfReserve**: Reserve attestation tracking
5. **AsiaFlexTimelock**: Governance timelock (24h delay)

### Trust Boundaries

```
┌──────────────────────────────────────────────────┐
│                 External World                    │
│  (Users, Attackers, Market, APIs)                │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│              Trust Boundary 1                     │
│         (On-chain vs Off-chain)                   │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           Smart Contracts Layer                   │
│  AsiaFlexToken | TreasuryController | Oracle      │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│              Trust Boundary 2                     │
│         (Role-based Access Control)               │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│            Privileged Operations                  │
│  (Admin, Treasury, Oracle Manager)                │
└───────────────────────────────────────────────────┘
```

## Threat Categories

### 1. Smart Contract Vulnerabilities

#### 1.1 Reentrancy Attacks

**Threat**: Attacker exploits reentrancy vulnerability in mint/burn functions

**Affected Components**: AsiaFlexToken, TreasuryController

**Likelihood**: Low (protected by ReentrancyGuard)

**Impact**: High (loss of funds, supply manipulation)

**Mitigations**:

- ✅ OpenZeppelin ReentrancyGuard on all state-changing functions
- ✅ Checks-Effects-Interactions pattern followed
- ✅ No external calls before state updates

**Residual Risk**: Minimal

---

#### 1.2 Integer Overflow/Underflow

**Threat**: Arithmetic operations overflow or underflow causing unexpected behavior

**Affected Components**: All contracts

**Likelihood**: Very Low (Solidity 0.8+ has built-in checks)

**Impact**: High (incorrect balances, bypass limits)

**Mitigations**:

- ✅ Solidity 0.8.26 with built-in overflow checks
- ✅ SafeMath not needed but calculations are safe
- ✅ Explicit checks for critical calculations

**Residual Risk**: Minimal

---

#### 1.3 Access Control Bypass

**Threat**: Attacker gains unauthorized access to privileged functions

**Affected Components**: All contracts

**Likelihood**: Low (OpenZeppelin AccessControl used)

**Impact**: Critical (full system compromise)

**Mitigations**:

- ✅ OpenZeppelin AccessControl with role-based permissions
- ✅ No default admin transfer (requires explicit action)
- ✅ Enhanced logging for role changes
- ⚠️ Deployer initially has all roles (must migrate to multisig)

**Residual Risk**: Medium (until multisig migration complete)

**Recommendations**:

- [ ] Migrate all admin roles to multisig immediately after deployment
- [ ] Implement AccessControlDefaultAdminRules for safer admin transitions
- [ ] Regular audit of role assignments

---

#### 1.4 Supply Cap Bypass

**Threat**: Attacker mints tokens exceeding supply cap

**Affected Components**: AsiaFlexToken

**Likelihood**: Low

**Impact**: High (inflation, token value dilution)

**Mitigations**:

- ✅ Supply cap enforced in mint function
- ✅ Check performed before state changes
- ✅ Legacy mint functions also respect caps

**Residual Risk**: Low

**Additional Checks**:

- Verify cap is checked in all mint paths including legacy functions
- Monitor supply cap utilization

---

### 2. Oracle Manipulation

#### 2.1 Price Oracle Attack

**Threat**: Attacker manipulates NAV price feed

**Affected Components**: NAVOracleAdapter

**Likelihood**: Medium (single oracle source)

**Impact**: High (incorrect mint/redeem pricing)

**Mitigations**:

- ✅ Deviation threshold (max 10% change per update)
- ✅ Staleness checks (price must be recent)
- ✅ Role-based update (only ORACLE_UPDATER)
- ⚠️ Single API source (Alpha Vantage)
- ⚠️ No cryptographic verification of oracle data

**Residual Risk**: Medium

**Recommendations**:

- [ ] Implement multi-source oracle aggregation (median of 3+ sources)
- [ ] Add Chainlink price feed as secondary source
- [ ] Implement oracle dispute mechanism
- [ ] Add cryptographic signatures to oracle updates

---

#### 2.2 Oracle Downtime

**Threat**: Oracle API becomes unavailable

**Affected Components**: NAVOracleAdapter, all mint/burn operations

**Likelihood**: High (API rate limits, outages)

**Impact**: Medium (operations blocked)

**Mitigations**:

- ✅ NAV caching mechanism implemented
- ✅ Exponential backoff for retries
- ✅ Manual force update capability
- ⚠️ Cache may become stale during extended outage

**Residual Risk**: Low

**Recommendations**:

- [ ] Implement multiple API providers as fallback
- [ ] Extend cache validity during verified outages
- [ ] Monitor API health proactively

---

#### 2.3 Force Update Abuse

**Threat**: ORACLE_MANAGER role abuses force update to manipulate prices

**Affected Components**: NAVOracleAdapter

**Likelihood**: Low (requires compromised manager key)

**Impact**: High (price manipulation)

**Mitigations**:

- ✅ Force updates emit special event with deviation and reason
- ✅ Restricted to ORACLE_MANAGER role
- ⚠️ No on-chain verification of reason validity
- ⚠️ No rate limiting on force updates

**Residual Risk**: Medium

**Recommendations**:

- [ ] Require multisig for force updates
- [ ] Implement rate limiting (e.g., max 1 per week)
- [ ] Add off-chain monitoring and alerting
- [ ] Require timelock for repeated force updates

---

### 3. Governance Attacks

#### 3.1 Admin Key Compromise

**Threat**: Attacker gains control of admin private key

**Affected Components**: All contracts

**Likelihood**: Low (depends on key management)

**Impact**: Critical (full system control)

**Mitigations**:

- ✅ Enhanced logging for all admin actions
- ⚠️ Single key for admin role initially
- ⚠️ No timelock on admin actions initially

**Residual Risk**: High (until multisig implemented)

**Recommendations**:

- [ ] Implement Gnosis Safe multisig (3-of-5 or 4-of-7)
- [ ] Require timelock for all parameter changes
- [ ] Use hardware wallets for all multisig signers
- [ ] Regular key rotation procedures
- [ ] Separate hot/cold keys for different operations

---

#### 3.2 Multisig Collusion

**Threat**: Sufficient number of multisig signers collude

**Affected Components**: All contracts (once multisig implemented)

**Likelihood**: Low (requires multiple compromises)

**Impact**: Critical (full system control)

**Mitigations**:

- ✅ Timelock provides 24h notice of changes
- ⚠️ No on-chain governance vote (relies on multisig trust)

**Residual Risk**: Medium

**Recommendations**:

- [ ] Increase multisig threshold (4-of-7 or 5-of-9)
- [ ] Geographic distribution of signers
- [ ] Legal agreements between signers
- [ ] Progressive decentralization to DAO governance
- [ ] Emergency pause by separate entity

---

#### 3.3 Timelock Bypass

**Threat**: Attacker finds way to bypass 24h timelock delay

**Affected Components**: AsiaFlexTimelock

**Likelihood**: Very Low (OpenZeppelin implementation)

**Impact**: High (removes governance safeguard)

**Mitigations**:

- ✅ Using OpenZeppelin TimelockController (audited)
- ✅ Minimum delay enforced in constructor
- ✅ Only designated proposers and executors

**Residual Risk**: Minimal

---

### 4. Economic Attacks

#### 4.1 Flash Loan Attack

**Threat**: Attacker uses flash loan to manipulate system

**Affected Components**: AsiaFlexToken, DEX pools (if integrated)

**Likelihood**: Medium (common DeFi attack)

**Impact**: Medium (depends on available exploit)

**Mitigations**:

- ✅ Attestation requirement prevents instant mint
- ✅ Daily limits prevent large single operations
- ✅ Circuit breakers on mint/burn
- ⚠️ No explicit flash loan protection

**Residual Risk**: Low (due to attestation flow)

**Recommendations**:

- [ ] Monitor for suspicious transaction patterns
- [ ] Consider implementing per-block limits
- [ ] Add MEV protection if DEX integration occurs

---

#### 4.2 Bank Run / Redemption Attack

**Threat**: Large coordinated redemptions exceed reserves

**Affected Components**: TreasuryController, reserves

**Likelihood**: Medium (market stress scenario)

**Impact**: High (system instability, peg break)

**Mitigations**:

- ✅ Daily burn limits
- ✅ Attestation requirement slows redemptions
- ⚠️ No reserve ratio enforcement
- ⚠️ No redemption queue management

**Residual Risk**: Medium

**Recommendations**:

- [ ] Implement redemption queue with prioritization
- [ ] Add reserve ratio checks
- [ ] Create emergency reserve fund
- [ ] Implement gradual redemption fees during stress

---

#### 4.3 MEV (Maximal Extractable Value) Attacks

**Threat**: Miners/validators front-run NAV updates for profit

**Affected Components**: NAVOracleAdapter, TreasuryController

**Likelihood**: High (common on public blockchains)

**Impact**: Medium (unfair pricing, user loss)

**Mitigations**:

- ✅ Deviation limits reduce profitable front-run window
- ⚠️ No commit-reveal scheme
- ⚠️ No MEV-specific protections

**Residual Risk**: Medium

**Recommendations**:

- [ ] Implement commit-reveal for oracle updates
- [ ] Use private mempool (e.g., Flashbots)
- [ ] Add time-weighted average pricing (TWAP)
- [ ] Implement batch processing of mint/redeem

---

### 5. Operational Risks

#### 5.1 Reserve Attestation Fraud

**Threat**: False reserve attestations accepted on-chain

**Affected Components**: ProofOfReserve

**Likelihood**: Low (requires auditor compromise)

**Impact**: Critical (reserve mismatch, insolvency)

**Mitigations**:

- ✅ Attestation hash requirement
- ✅ Deviation limits on reserve updates
- ✅ Enhanced logging with reasons
- ⚠️ No on-chain proof of reserve actual verification
- ⚠️ Single attestation source

**Residual Risk**: Medium

**Recommendations**:

- [ ] Integrate Chainlink Proof of Reserve
- [ ] Require multiple independent auditors
- [ ] Implement cryptographic attestation signatures
- [ ] Regular third-party audits
- [ ] Real-time reserve monitoring

---

#### 5.2 Key Loss

**Threat**: Loss of critical private keys

**Affected Components**: All operations

**Likelihood**: Low (with proper procedures)

**Impact**: High (operations halted)

**Mitigations**:

- ⚠️ Key backup procedures not documented
- ⚠️ No key recovery mechanism

**Residual Risk**: Medium

**Recommendations**:

- [ ] Implement Shamir Secret Sharing for key backup
- [ ] Document key recovery procedures
- [ ] Regular disaster recovery drills
- [ ] Geographic distribution of backup keys
- [ ] Timelock-based key recovery mechanism

---

#### 5.3 Data Loss

**Threat**: Loss of off-chain operational data

**Affected Components**: Operations logs, cache, documentation

**Likelihood**: Low (with proper backups)

**Impact**: Medium (audit trail loss)

**Mitigations**:

- ✅ Operations logged on-chain via events
- ⚠️ Local cache and logs may be lost

**Residual Risk**: Low

**Recommendations**:

- [ ] Implement event indexing (The Graph)
- [ ] Regular backup of local data
- [ ] Store critical data in multiple locations
- [ ] Document data recovery procedures

---

### 6. Compliance and Legal Risks

#### 6.1 Regulatory Non-Compliance

**Threat**: System violates applicable regulations

**Affected Components**: All (systemic)

**Likelihood**: Medium (evolving regulations)

**Impact**: High (legal liability, forced shutdown)

**Mitigations**:

- ✅ Blacklist functionality for sanctions compliance
- ⚠️ No formal KYC/AML process
- ⚠️ No legal framework documented

**Residual Risk**: High

**Recommendations**:

- [ ] Implement formal KYC/AML procedures
- [ ] Engage legal counsel for compliance review
- [ ] Obtain necessary licenses/registrations
- [ ] Implement transaction monitoring
- [ ] Document compliance policies

---

#### 6.2 User Privacy Violations

**Threat**: System violates user privacy regulations (GDPR, etc.)

**Affected Components**: Data collection, logging

**Likelihood**: Low

**Impact**: Medium (legal liability, fines)

**Mitigations**:

- ✅ On-chain data is public (user chooses to participate)
- ⚠️ Off-chain data handling not documented

**Residual Risk**: Medium

**Recommendations**:

- [ ] Document data handling policies
- [ ] Implement privacy policy
- [ ] Provide user data controls where applicable
- [ ] Legal review of privacy practices

---

## Attack Surface Summary

### High Priority Risks

1. **Admin Key Compromise** (Critical Impact, High Residual Risk)
   - Immediate action: Implement multisig
2. **Oracle Manipulation** (High Impact, Medium Residual Risk)
   - Immediate action: Add secondary oracle source

3. **Reserve Attestation Fraud** (Critical Impact, Medium Residual Risk)
   - Immediate action: Implement multi-auditor verification

4. **Regulatory Non-Compliance** (High Impact, High Residual Risk)
   - Immediate action: Legal compliance review

### Medium Priority Risks

5. **Force Update Abuse** (High Impact, Medium Residual Risk)
   - Action: Add multisig requirement

6. **MEV Attacks** (Medium Impact, Medium Residual Risk)
   - Action: Implement MEV protections

7. **Bank Run Scenario** (High Impact, Medium Residual Risk)
   - Action: Implement redemption queue

### Monitoring Requirements

Set up alerts for:

- ✅ All admin role changes
- ✅ Supply cap changes
- ✅ Force NAV updates
- ✅ Emergency pauses
- ✅ Large mint/burn operations
- [ ] Suspicious transaction patterns
- [ ] Daily limit threshold approaching
- [ ] Reserve deviation alerts

## Security Roadmap

### Phase 1: Immediate (Week 1)

- [ ] Deploy multisig for admin roles
- [ ] Migrate all admin functions to multisig
- [ ] Implement basic monitoring and alerting
- [ ] Document emergency procedures

### Phase 2: Short-term (Month 1)

- [ ] Integrate secondary oracle source
- [ ] Implement timelock for parameter changes
- [ ] Set up comprehensive monitoring
- [ ] Conduct internal security review

### Phase 3: Medium-term (Quarter 1)

- [ ] Professional security audit
- [ ] Implement advanced MEV protections
- [ ] Deploy multi-auditor reserve verification
- [ ] Bug bounty program launch

### Phase 4: Long-term (Year 1)

- [ ] Transition to DAO governance
- [ ] Implement on-chain Proof of Reserve
- [ ] Full decentralization of operations
- [ ] Regulatory compliance framework complete

## Conclusion

The AsiaFlex system has a solid foundation with OpenZeppelin contracts and good architectural patterns. However, several high-priority risks require immediate attention, particularly around key management and oracle resilience. Following the recommended roadmap will significantly strengthen the system's security posture.
