# Governance Framework

## Overview

AsiaFlex implements a multi-layered governance system designed to balance operational efficiency with security and decentralization. This document outlines the governance structure, processes, and best practices.

## Governance Architecture

### TimeLockController

The AsiaFlexTimelock contract enforces a **24-hour delay** on all critical parameter changes, providing:

- **Transparency**: All proposed changes are visible on-chain before execution
- **Community Review**: Token holders and stakeholders have time to review changes
- **Emergency Response**: Time to react to potentially harmful proposals
- **Audit Trail**: Complete history of governance actions

#### Protected Operations

The following operations require timelock approval:

1. **Supply Cap Changes** (`setSupplyCap`)
2. **Daily Limit Adjustments** (`setMaxDailyMint`, `setMaxDailyNetInflows`)
3. **Oracle Parameters** (`setStalenessThreshold`, `setDeviationThreshold`)
4. **Reserve Parameters** (`setMaxDeviation` in ProofOfReserve)
5. **Role Grants/Revokes** for critical roles

#### Timelock Workflow

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Propose   │─────>│  24h Delay   │─────>│   Execute    │─────>│   Complete   │
└─────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
     ^                                           │
     │                                           │
     └───────────────── Cancel ─────────────────┘
                    (if needed)
```

## Role Hierarchy

### Core Roles

#### DEFAULT_ADMIN_ROLE

- **Purpose**: Highest level governance role
- **Permissions**: Grant/revoke all other roles
- **Recommendation**: Should be held by timelock or multisig
- **Current**: Initially deployer, should migrate to multisig

#### TREASURY_ROLE (AsiaFlexToken)

- **Purpose**: Execute mint and burn operations
- **Permissions**:
  - Mint tokens with attestation
  - Burn tokens with attestation
  - Legacy mint/burn functions
- **Recommendation**: Held by TreasuryController contract
- **Security**: Protected by attestation requirements

#### CAPS_MANAGER_ROLE (AsiaFlexToken)

- **Purpose**: Manage supply and operational limits
- **Permissions**:
  - Set supply cap
  - Set daily mint limits
  - Set daily net inflow limits
- **Recommendation**: Should require timelock
- **Security**: Changes logged with enhanced events

#### PAUSER_ROLE (AsiaFlexToken)

- **Purpose**: Emergency circuit breaker
- **Permissions**: Pause/unpause token operations
- **Recommendation**: Multisig or automated monitoring system
- **Security**: Should be separate from operational roles

#### BLACKLIST_MANAGER_ROLE (AsiaFlexToken)

- **Purpose**: Manage blacklist for compliance
- **Permissions**: Add/remove addresses from blacklist
- **Recommendation**: Compliance team with timelock
- **Security**: All changes logged with events

#### ORACLE_UPDATER_ROLE (NAVOracleAdapter)

- **Purpose**: Update NAV prices within deviation limits
- **Permissions**: Call `updateNAV` with deviation checks
- **Recommendation**: Automated oracle service
- **Security**: Bounded by deviation threshold

#### ORACLE_MANAGER_ROLE (NAVOracleAdapter)

- **Purpose**: Manage oracle configuration
- **Permissions**:
  - Set staleness threshold
  - Set deviation threshold
  - Force update NAV (emergency)
  - Pause oracle
- **Recommendation**: Multisig with timelock
- **Security**: Force updates logged separately

#### TREASURY_MANAGER_ROLE (TreasuryController)

- **Purpose**: Configure treasury parameters
- **Permissions**:
  - Set treasury signer
  - Set request expiration
  - Pause controller
- **Recommendation**: Multisig with timelock
- **Security**: All changes emit events

#### RESERVE_UPDATER_ROLE (ProofOfReserve)

- **Purpose**: Update reserve attestations
- **Permissions**: Update reserve with attestation hash
- **Recommendation**: Authorized auditor or automated system
- **Security**: Bounded by deviation limits

#### RESERVE_MANAGER_ROLE (ProofOfReserve)

- **Purpose**: Manage reserve parameters
- **Permissions**:
  - Force update reserves (emergency)
  - Set deviation threshold
  - Pause reserves
- **Recommendation**: Multisig
- **Security**: All operations logged

## Governance Processes

### 1. Normal Parameter Change

For non-emergency parameter changes:

```solidity
// 1. Propose via timelock
timelock.schedule(
    target,
    value,
    data,
    predecessor,
    salt,
    delay
);

// 2. Wait 24 hours

// 3. Execute
timelock.execute(
    target,
    value,
    data,
    predecessor,
    salt
);
```

### 2. Emergency Actions

For urgent situations requiring immediate action:

- **PAUSER_ROLE** can pause contracts immediately
- **ORACLE_MANAGER_ROLE** can force update NAV with logging
- **RESERVE_MANAGER_ROLE** can force update reserves with reason

**Important**: All emergency actions must be:

1. Logged with detailed events including reason
2. Communicated to stakeholders immediately
3. Reviewed in post-mortem
4. Documented in operations log

### 3. Role Management

#### Granting Roles

```solidity
// Standard grant (emits OpenZeppelin RoleGranted event)
grantRole(ROLE, account);

// Enhanced grant with reason (emits additional RoleGrantedWithReason event)
grantRoleWithReason(ROLE, account, "Reason for granting");
```

#### Revoking Roles

```solidity
// Standard revoke
revokeRole(ROLE, account);

// Enhanced revoke with reason
revokeRoleWithReason(ROLE, account, "Reason for revoking");
```

## Migration to Decentralized Governance

### Phase 1: Multisig (Current Target)

1. Deploy Gnosis Safe multisig (recommend 3-of-5 or 4-of-7)
2. Grant DEFAULT_ADMIN_ROLE to multisig
3. Revoke deployer admin role
4. Update all critical roles to require multisig approval

### Phase 2: TimeLock Integration

1. Deploy AsiaFlexTimelock
2. Configure timelock as proposer and executor
3. Transfer admin role to timelock
4. Configure multisig as timelock proposer

### Phase 3: DAO Governance (Future)

1. Deploy governance token or use AFX with voting power
2. Deploy Governor contract (OpenZeppelin Governor)
3. Integrate with timelock
4. Transition control to on-chain voting

## Security Best Practices

### Two-Man Rule

For critical operations, implement a two-man rule:

```solidity
// Example: Require both CAPS_MANAGER and DEFAULT_ADMIN for supply cap changes
// This can be enforced through multisig or separate approval contract
```

### Rate Limiting

Implement rate limiting for sensitive operations:

- Maximum 1 supply cap change per 7 days
- Maximum 1 deviation threshold change per 7 days
- Track and monitor frequency of force updates

### Monitoring and Alerting

Set up alerts for:

- Any role grant or revoke
- Supply cap changes
- Daily limit changes
- Force NAV updates
- Reserve force updates
- Emergency pauses

### Audit Log

Maintain comprehensive audit logs:

- All role changes with reasons
- All parameter changes with justification
- All emergency actions with post-mortem
- Regular security reviews

## Operations Runbook

### Weekly Review

1. Review all operations from past week using history CLI
2. Check for any anomalies or suspicious patterns
3. Verify all critical role holders are still appropriate
4. Review circuit breaker statistics

### Monthly Review

1. Full security audit of all role assignments
2. Review and update governance policies
3. Test emergency procedures
4. Update documentation

### Incident Response

1. **Detection**: Automated monitoring triggers alert
2. **Assessment**: Evaluate severity and impact
3. **Action**:
   - Minor: Follow normal governance process
   - Major: Use emergency pause if needed
   - Critical: Coordinate with all stakeholders
4. **Communication**: Notify all stakeholders immediately
5. **Resolution**: Execute fix through appropriate channel
6. **Post-Mortem**: Document incident and improvements

## Key Rotation Procedures

### Treasury Signer Rotation

```bash
# 1. Generate new signer address
# 2. Prepare transaction
# 3. Execute through timelock or multisig
npx hardhat run scripts/admin/rotate-treasury-signer.ts
```

### Multisig Signer Rotation

1. Propose new signer via Gnosis Safe UI
2. Collect required signatures
3. Execute transaction
4. Update documentation

### Oracle Updater Rotation

Similar process through governance
