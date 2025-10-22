# Project Brief

## Vision

AsiaFlex delivers basket-based digital assets that track curated exposures across European and Asian markets. Rather than a single monolithic token, the platform issues multiple ERC20 baskets that mirror FX, bond, and blended strategies. Every basket is fully collateralized by a base reserve asset (USDC) and governed by transparent on-chain rules.

## Value Proposition

- **Flexible Exposure** – Users select among EU/ASIA FX, bond, or mixed allocations.
- **Transparent Backing** – Reserve proofs and NAV data are published on-chain.
- **Operational Control** – Role-separated access for treasury, oracle management, and reserve auditors.
- **Composable Architecture** – Minimal ERC20 baskets integrate easily with DeFi and custodial partners.

## Core Components

1. **BasketManager**
   - Registers baskets with allocation weights and operational parameters.
   - Consumes NAV prices from a median oracle service.
   - Executes mint/redeem flows while enforcing proof-of-reserve checks.

2. **BasketToken**
   - ERC20 token dedicated to a single strategy (e.g., `EUFX`, `ASBOND`).
   - Controlled exclusively by `BasketManager` via `MANAGER_ROLE`.

3. **Median Oracle**
   - Aggregates external feeds into NAV values for constituent asset IDs.
   - Exposes a simple `getPrice` interface with timestamp metadata.

4. **Operational Scripts**
   - Deploy basket tokens, register allocations, refresh NAV, and process mint/redeem ops.
   - Managed from the `scripts/ops/` directory with TypeScript/Hardhat.

## User Journey

```
Deposit Base Asset → Reserve Proof Logged → Mint Basket Token → Hold/Trade → Redeem for Base Asset
```

- Treasury operators collect base asset deposits.
- Custodian publishes an attestation; on-chain proof is registered.
- Mint script mints basket tokens to end users.
- Users may redeem back to base asset by returning tokens to the manager.

## Stakeholders

- **End Users / Integrators** – Acquire basket exposure via partners or directly on-chain.
- **Treasury Operators** – Manage reserves, proofs, and mint/redeem execution.
- **Oracle Managers** – Maintain price feed infrastructure and basket allocations.
- **Auditors / Compliance** – Review proofs, monitor NAV freshness, and ensure operational transparency.

## Roadmap Priorities

1. **Finalize Basket Definitions** – Confirm asset IDs, weights, and accrual parameters per basket.
2. **Automate Oracle Pipeline** – Productionize price feed ingestion and degradation alerts.
3. **Custody Integration** – Formalize reserve attestation workflow with custodial partners.
4. **Documentation Refresh** – Keep README, operational, and security docs aligned with basket model.
5. **QA Expansion** – Extend Hardhat tests to cover edge cases for new basket types.

## Success Metrics

- 100% reserve backing with publicly verifiable proofs.
- Timely NAV updates (≤ configured `stalenessThreshold`).
- Stable operational uptime with minimal emergency pauses.
- Adoption across multiple partner channels leveraging distinct baskets.

The single-token AsiaFlex model has been retired; all new development targets the basket architecture described above.
