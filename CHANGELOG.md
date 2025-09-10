# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enterprise-grade AsiaFlexToken with AccessControl, Pausable, EIP712 permits
- Circuit breaker mechanisms (daily mint caps, supply caps, net inflow limits)
- Blacklist functionality for compliance requirements
- NAVOracleAdapter with staleness and deviation protection
- TreasuryController with EIP712 signed attestations
- Comprehensive test suite with ≥95% coverage target
- TypeScript integration with TypeChain
- Operational scripts for mint, burn, pause, and cap management
- Hardhat tasks for roles, status, and NAV management
- CI/CD pipeline with automated testing, coverage, and security analysis
- Semantic release automation
- Complete documentation and deployment guides

### Changed
- Migrated from simple Ownable to enterprise AccessControl patterns
- Enhanced security with role-based permissions and circuit breakers
- Improved oracle system with deviation limits and emergency overrides
- Added comprehensive testing and coverage requirements

### Security
- All operations now require appropriate role permissions
- Circuit breakers prevent excessive minting and supply inflation
- Oracle protection against stale data and price manipulation
- EIP712 signatures prevent replay attacks in treasury operations
- Emergency pause functionality for critical situations

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of AsiaFlex Token enterprise infrastructure
- Core contracts: AsiaFlexToken, NAVOracleAdapter, TreasuryController
- Complete testing and deployment infrastructure
- Documentation and operational procedures