# Changelog

All notable changes to the AsiaFlex project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Smart Contracts

#### AsiaFlexTimelock (New Contract)

- 24-hour governance timelock using OpenZeppelin TimelockController
- Enforces delay on all critical parameter changes
- Provides transparency for governance actions
- Enables community review before execution

#### Enhanced ProofOfReserve

- `RESERVE_UPDATER_ROLE` and `RESERVE_MANAGER_ROLE` for access control
- Deviation limits on reserve updates (configurable, default 5%)
- `forceSetReserve` function with reason parameter for emergencies
- Attestation hash requirement for all updates
- Pausable functionality
- Comprehensive events: `ReserveUpdated`, `MaxDeviationUpdated`, `ReserveUpdateFailed`
- Custom errors for better error handling

#### Enhanced NAVOracleAdapter

- `forceUpdateNAV` now requires `reason` parameter
- New `NAVForceUpdated` event with deviation, updater address, and reason
- Better audit trail for emergency NAV updates
- Improved logging for governance and compliance

#### Enhanced AsiaFlexToken

- `grantRoleWithReason` and `revokeRoleWithReason` functions
- Enhanced `SupplyCapUpdated` event with timestamp and updater address
- New events: `RoleGrantedWithReason`, `RoleRevokedWithReason`
- Improved audit trail for role management

### Added - Utilities & Tooling

#### NAV Cache Manager (`utils/oracle/caching.ts`)

- Automatic NAV caching for offline/fallback scenarios
- Configurable cache validity period (default 1 hour)
- `getNAVWithFallback` for resilient NAV fetching
- Cache statistics and management functions

#### Exponential Backoff Utility

- Retry failed API calls with increasing delays
- Configurable max retries and delay bounds
- Handles rate limiting gracefully

#### Operations History CLI (`scripts/ops/history.ts`)

- List all operations with filtering by network
- Show statistics by operation type and network
- View detailed operation information
- Query complete operations audit trail
- Formats: table view, detailed view, JSON export

### Added - Documentation

#### Governance Framework (`docs/governance.md`)

- Complete governance architecture documentation
- Role hierarchy and permission matrix
- Governance processes and procedures
- Migration path from deployer to multisig to DAO
- Security best practices and two-man rule recommendations
- Operations runbook for role management
- Key rotation procedures

#### Operational Runbook (`docs/runbook.md`)

- Daily operations checklist
- Incident response playbook (P0-P3 severity levels)
- Key rotation procedures (treasury signer, multisig, oracle)
- System monitoring guidelines and alert thresholds
- Emergency procedures (pause, force update, supply cap adjustment)
- Maintenance schedules (weekly, monthly, quarterly, annual)
- Contact information and escalation paths

#### Threat Model (`docs/threat-model.md`)

- Comprehensive threat analysis (20+ identified threats)
- Risk assessment for each threat (likelihood, impact, residual risk)
- Detailed mitigation strategies for each category:
  - Smart contract vulnerabilities
  - Oracle manipulation
  - Governance attacks
  - Economic attacks
  - Operational risks
  - Compliance and legal risks
- Attack surface summary with priority rankings
- Security roadmap with phased implementation plan

#### Environment Variables Guide (`docs/environment-variables.md`)

- Complete documentation of all environment variables
- Development, testing, and production configurations
- Security best practices for key management
- Troubleshooting guide for common issues
- Validation checklist for production deployments
- Examples for different environments

#### Compliance Framework (`docs/compliance.md`)

- Regulatory landscape overview (US, EU, APAC)
- Comprehensive AML/KYC procedures and requirements
- Data protection and GDPR compliance guidelines
- Sanctions screening requirements (OFAC, UN, EU)
- Audit and reporting procedures
- Implementation roadmap with phases
- Legal disclaimers and resource links

### Added - Testing Infrastructure

#### Fuzz Testing Suite (`test/fuzz/AsiaFlexToken.fuzz.test.ts`)

- Property-based testing for critical invariants:
  - Total supply never exceeds supply cap
  - Burns never create tokens
  - Balance sum equals total supply
  - Transfers preserve value
  - Daily limits reset properly
  - Blacklist enforcement
  - Pause functionality
- High-frequency stress tests (100+ rapid operations)
- Random operation generation for realistic scenarios
- Comprehensive invariant checking

#### Enhanced Unit Tests

- **ProofOfReserve Tests** (`test/unit/ProofOfReserve.test.ts`)
  - Full coverage of enhanced functionality
  - Deviation limit testing
  - Force update testing with reason logging
  - Role-based access control tests
  - Edge cases and error conditions
  - Pause functionality

- **NAV Force Update Tests** (`test/unit/NAVOracleAdapter.ForceUpdate.test.ts`)
  - Force update with reason parameter
  - Deviation calculation verification
  - Event emission tests
  - Integration with normal updates
  - Reason string handling (empty, long, special characters)

### Changed

#### Package.json

- Added npm scripts for all operations: `ops:mint`, `ops:burn`, `ops:transfer`, `ops:pause`, `ops:setCaps`, `ops:history`
- Updated script organization for better discoverability

#### README.md

- Added "Recent Security Enhancements" section highlighting new features
- Added "Operations & Monitoring" section with operational script documentation
- Added "Governance & Timelock" section explaining governance delays
- Added "Oracle Resilience" section with caching and backoff examples
- Updated "Additional Documentation" section with new docs
- Added "Recent Enhancements" summary section
- Added "Fuzz Testing" section in testing documentation

### Fixed

#### NAVOracleAdapter

- Improved force update logging to include deviation and reason
- Better audit trail for emergency operations

#### ProofOfReserve

- Fixed lack of events on errors
- Added custom errors instead of string reverts
- Improved access control with dedicated roles

## Security Considerations

### High Priority Mitigations Implemented

1. ✅ Timelock governance for critical parameters (24h delay)
2. ✅ Enhanced ProofOfReserve with deviation limits and attestation
3. ✅ Oracle resilience with caching and exponential backoff
4. ✅ Comprehensive event logging for audit trail

### Remaining High Priority Items

1. ⏳ Migrate admin roles to multisig (documented, awaiting deployment)
2. ⏳ Implement multi-source oracle aggregation (design complete)
3. ⏳ Add MEV protection mechanisms (research phase)
4. ⏳ Professional third-party security audit (planning phase)

## Breaking Changes

None. All enhancements are additive and backwards compatible with existing deployments.

## Migration Guide

### For Existing Deployments

If you have an existing AsiaFlex deployment, follow these steps to adopt the new enhancements:

1. **Deploy AsiaFlexTimelock**

   ```bash
   npx hardhat run scripts/deploy/timelock.ts --network <network>
   ```

2. **Deploy Enhanced ProofOfReserve**

   ```bash
   # Deploy new contract
   npx hardhat run scripts/deploy/proof-of-reserve.ts --network <network>

   # Migrate reserves data
   npx hardhat run scripts/admin/migrate-reserves.ts --network <network>
   ```

3. **Update Operational Scripts**
   - Existing scripts continue to work
   - New features available through enhanced scripts
   - No changes required for existing automation

4. **Migrate Governance**
   - Follow governance.md migration guide
   - Set up multisig
   - Transfer admin roles to timelock
   - Test with non-critical parameters first

## Acknowledgments

- OpenZeppelin for secure contract templates
- Hardhat team for excellent development tools
- Community feedback and security research

---

**Note**: This changelog is maintained manually. For detailed commit history, see the Git log.
