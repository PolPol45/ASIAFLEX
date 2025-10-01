# Operational Runbook

## Overview

This document provides step-by-step procedures for operating and maintaining the AsiaFlex system in production.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Incident Response](#incident-response)
3. [Key Rotation](#key-rotation)
4. [System Monitoring](#system-monitoring)
5. [Emergency Procedures](#emergency-procedures)
6. [Maintenance Tasks](#maintenance-tasks)

## Daily Operations

### Morning Checklist

```bash
# 1. Check system status
npx hardhat run scripts/ops/status.ts --network <network>

# 2. Review operations history
npx ts-node scripts/ops/history.ts list --limit=20

# 3. Check NAV cache status
npx ts-node scripts/ops/check-nav-cache.ts

# 4. Review circuit breaker status
# Check remaining daily limits in status output
```

### NAV Update Procedure

The NAV should be updated when AAXJ ETF price changes significantly.

```bash
# Automated update (recommended)
ALPHA_VANTAGE_API_KEY=<key> npx hardhat run tasks/nav/update.ts --network <network>

# Manual update with verification
# 1. Check current NAV
npx hardhat run scripts/ops/status.ts --network <network>

# 2. Fetch latest AAXJ price from multiple sources
# 3. Verify deviation is within limits
# 4. Update via oracle updater role
```

### Mint Operation

```bash
# Standard mint with dry-run first
MINT_SIGNER=<treasury-address> \
MINT_TO=<recipient> \
MINT_AMOUNT=<amount> \
MINT_DRY_RUN=true \
npx hardhat run scripts/ops/mint.ts --network <network>

# Execute if dry-run looks good
MINT_SIGNER=<treasury-address> \
MINT_TO=<recipient> \
MINT_AMOUNT=<amount> \
MINT_DRY_RUN=false \
npx hardhat run scripts/ops/mint.ts --network <network>
```

### Burn Operation

```bash
# Standard burn with dry-run first
BURN_SIGNER=<treasury-address> \
BURN_FROM=<holder-address> \
BURN_AMOUNT=<amount> \
BURN_DRY_RUN=true \
npx hardhat run scripts/ops/burn.ts --network <network>

# Execute if dry-run looks good
BURN_SIGNER=<treasury-address> \
BURN_FROM=<holder-address> \
BURN_AMOUNT=<amount> \
BURN_DRY_RUN=false \
npx hardhat run scripts/ops/burn.ts --network <network>
```

## Incident Response

### Severity Levels

#### P0 - Critical (Immediate Response Required)

- Funds at risk
- Smart contract exploit detected
- Major security breach

**Response Time**: Immediate (< 5 minutes)

#### P1 - High (Urgent Response)

- Oracle malfunction affecting operations
- Significant NAV deviation
- Circuit breaker triggered unexpectedly

**Response Time**: < 30 minutes

#### P2 - Medium (Standard Response)

- Minor oracle issues
- API rate limiting
- Non-critical monitoring alerts

**Response Time**: < 2 hours

#### P3 - Low (Planned Response)

- Routine maintenance
- Documentation updates
- Non-urgent improvements

**Response Time**: Next business day

### P0: Critical Incident Response

```bash
# STEP 1: IMMEDIATE PAUSE
# If you have PAUSER_ROLE access:
npx hardhat run scripts/ops/pause.ts --network <network>

# STEP 2: NOTIFY TEAM
# Use emergency contact list
# Subject: "[P0 CRITICAL] AsiaFlex Security Incident"

# STEP 3: ASSESS SITUATION
# - Check contract state
# - Review recent transactions
# - Identify attack vector

# STEP 4: COORDINATE RESPONSE
# - Involve all key stakeholders
# - Legal counsel if needed
# - Prepare public communication

# STEP 5: EXECUTE FIX
# - Deploy fixes if needed
# - Use timelock override if necessary
# - Document all actions

# STEP 6: POST-MORTEM
# - Document timeline
# - Identify root cause
# - Implement preventive measures
```

### P1: Oracle Failure Response

```bash
# STEP 1: CHECK ORACLE STATUS
npx hardhat run scripts/ops/status.ts --network <network>

# STEP 2: VERIFY NAV CACHE
# If API is down, system should use cache
npx ts-node scripts/ops/check-nav-cache.ts

# STEP 3: MANUAL NAV UPDATE (if needed)
# Use ORACLE_MANAGER_ROLE to force update with reason
# This requires manual verification of NAV from multiple sources

# STEP 4: MONITOR SITUATION
# Set up increased monitoring
# Prepare for extended outage if needed

# STEP 5: RESTORE NORMAL OPERATION
# Once API is back, verify NAV synchronization
# Update runbook if new failure mode discovered
```

### P2: Rate Limiting Response

```bash
# STEP 1: VERIFY RATE LIMIT
# Check API response for rate limit headers

# STEP 2: USE CACHED NAV
# System should automatically use cache

# STEP 3: REDUCE UPDATE FREQUENCY
# Temporarily decrease oracle update frequency

# STEP 4: CONSIDER ADDITIONAL API KEYS
# If persistent, obtain additional API keys or
# implement multi-provider fallback
```

## Key Rotation

### Treasury Signer Rotation

**When to Rotate**:

- Every 90 days (routine)
- After any suspected compromise
- After personnel changes
- After security audit recommendation

**Procedure**:

```bash
# 1. Generate new signer
# Use hardware wallet or secure key generation

# 2. Prepare rotation transaction
# Must be executed by TREASURY_MANAGER_ROLE

# 3. Schedule via timelock (if applicable)
npx hardhat run scripts/admin/rotate-treasury-signer.ts --network <network>

# 4. Wait for timelock delay
# 24 hours minimum

# 5. Execute rotation
# Follow timelock execution procedure

# 6. Verify new signer
npx hardhat run scripts/ops/status.ts --network <network>

# 7. Update documentation
# Update this runbook and team documentation

# 8. Securely destroy old key
# Follow key destruction policy
```

### Multisig Signer Rotation

```bash
# 1. Access Gnosis Safe UI
# https://app.safe.global

# 2. Navigate to Settings -> Owners

# 3. Propose new owner
# Requires existing owner signatures

# 4. Collect signatures
# Get required threshold of signatures

# 5. Execute transaction

# 6. Verify changes
# Check Safe configuration

# 7. Test with small transaction
# Ensure multisig functions correctly
```

### Oracle Updater Key Rotation

```bash
# Similar to treasury signer rotation
# Execute through governance process
```

## System Monitoring

### Key Metrics to Monitor

#### Token Metrics

- Total supply
- Daily mint amount / limit
- Daily net inflow / limit
- Supply cap utilization
- Number of blacklisted addresses

#### Oracle Metrics

- Current NAV
- Time since last update
- NAV staleness status
- Recent deviation values
- Force update frequency

#### Reserve Metrics

- Reserve USD value
- Last attestation timestamp
- Attestation hash
- Reserve update frequency

#### Operations Metrics

- Mint operations per day
- Burn operations per day
- Transfer volume
- Failed transaction rate

### Monitoring Setup

```bash
# Set up automated monitoring (example using cron)
# Edit crontab
crontab -e

# Add monitoring jobs
*/5 * * * * /path/to/check-status.sh >> /var/log/asiaflex-monitor.log 2>&1
0 * * * * /path/to/check-nav-staleness.sh >> /var/log/asiaflex-nav.log 2>&1
0 0 * * * /path/to/generate-daily-report.sh >> /var/log/asiaflex-daily.log 2>&1
```

### Alert Thresholds

Set up alerts for:

| Metric              | Warning   | Critical  |
| ------------------- | --------- | --------- |
| NAV staleness       | > 2 hours | > 4 hours |
| Daily mint usage    | > 80%     | > 95%     |
| Daily inflow usage  | > 80%     | > 95%     |
| Supply cap usage    | > 90%     | > 98%     |
| NAV deviation       | > 5%      | > 10%     |
| Failed transactions | > 5%      | > 10%     |
| Reserve deviation   | > 3%      | > 5%      |

## Emergency Procedures

### Emergency Pause

**When to Use**:

- Smart contract vulnerability discovered
- Oracle compromise suspected
- Unusual activity detected
- Coordinated attack in progress

**Procedure**:

```bash
# 1. Execute immediate pause
# Requires PAUSER_ROLE
npx hardhat run scripts/ops/pause.ts --network <network>

# 2. Verify pause status
npx hardhat run scripts/ops/status.ts --network <network>

# 3. Communicate to stakeholders
# Use emergency communication channels

# 4. Assess situation
# Investigate cause and extent

# 5. Plan resolution
# Coordinate with team and advisors

# 6. Execute fix
# Deploy patches, rotate keys, etc.

# 7. Unpause when safe
npx hardhat run scripts/ops/unpause.ts --network <network>

# 8. Post-incident review
# Document and improve procedures
```

### Force NAV Update

**When to Use**:

- API completely unavailable
- Extreme market conditions exceeding deviation limits
- Emergency situation requiring immediate NAV correction

**Procedure**:

```bash
# 1. Verify NAV from multiple independent sources
# - Check multiple financial data providers
# - Verify with team consensus
# - Document sources used

# 2. Prepare justification
# Reason will be logged on-chain

# 3. Execute force update
# Requires ORACLE_MANAGER_ROLE
# forceUpdateNAV(newNav, "Emergency update: [reason]")

# 4. Monitor system
# Ensure operations continue normally

# 5. Document incident
# Add to operations log
```

### Supply Cap Emergency Adjustment

**When to Use**:

- Unexpected demand surge
- Market conditions requiring immediate capacity increase
- Emergency liquidity provision needed

**Procedure**:

```bash
# Note: Should normally go through timelock
# Emergency adjustments may require governance override

# 1. Assess situation and required capacity

# 2. Calculate new cap
# Ensure sufficient buffer for operations

# 3. Execute through timelock (if possible)
# Or through governance emergency procedures

# 4. Monitor impact
# Watch for circuit breaker triggers

# 5. Plan return to normal limits
# Schedule cap reduction once emergency passes
```

## Maintenance Tasks

### Weekly Maintenance

- [ ] Review operations history for anomalies
- [ ] Check circuit breaker statistics
- [ ] Verify oracle cache health
- [ ] Review and clear old logs if needed
- [ ] Test backup procedures
- [ ] Verify monitoring alerts are functioning

### Monthly Maintenance

- [ ] Full security audit of role assignments
- [ ] Review and update documentation
- [ ] Test all emergency procedures
- [ ] Verify backup key access
- [ ] Update dependencies (if any)
- [ ] Generate and review monthly report

### Quarterly Maintenance

- [ ] Rotate treasury signer keys
- [ ] Full system security review
- [ ] Disaster recovery drill
- [ ] Update incident response procedures
- [ ] Review and update monitoring thresholds
- [ ] Stakeholder governance review

### Annual Maintenance

- [ ] Comprehensive security audit
- [ ] Architecture review
- [ ] Disaster recovery full test
- [ ] Update all documentation
- [ ] Legal and compliance review
- [ ] Insurance policy review

## Contact Information

### Emergency Contacts

```
PRIMARY ON-CALL:
- Name: [TBD]
- Phone: [TBD]
- Signal: [TBD]

SECONDARY ON-CALL:
- Name: [TBD]
- Phone: [TBD]
- Signal: [TBD]

TECHNICAL LEAD:
- Name: [TBD]
- Email: [TBD]
- Phone: [TBD]

SECURITY CONTACT:
- Email: security@asiaflex.io (example)
- PGP Key: [TBD]
```

### External Resources

- **Block Explorer**: [Network-specific]
- **Multisig Interface**: https://app.safe.global
- **Status Page**: [TBD]
- **Documentation**: https://github.com/PolPol45/ASIAFLEX
- **Security Advisories**: [TBD]

## Appendix

### Useful Commands Reference

```bash
# Check system status
npx hardhat run scripts/ops/status.ts --network <network>

# View operations history
npx ts-node scripts/ops/history.ts list

# Check NAV cache
npx ts-node scripts/ops/check-nav-cache.ts

# Pause system
npx hardhat run scripts/ops/pause.ts --network <network>

# Update supply cap
npx hardhat run scripts/ops/setCaps.ts --network <network>

# Mint tokens (dry-run)
MINT_DRY_RUN=true npx hardhat run scripts/ops/mint.ts --network <network>

# Burn tokens (dry-run)
BURN_DRY_RUN=true npx hardhat run scripts/ops/burn.ts --network <network>
```

### Log Locations

- Operations logs: `scripts/deployments/operations/`
- NAV cache: `.cache/nav/`
- System logs: As configured in monitoring setup
- Error logs: Check provider and monitoring system

### Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0     | 2025-10-01 | Initial runbook |
