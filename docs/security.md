# Security Model

## Threat Model

| Threat                    | Description                                 | Mitigations                                                                           |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Oracle manipulation       | Malicious or stale price updates impact NAV | Median aggregator, staleness checks, degraded feed flagging, operational alerts       |
| Reserve misrepresentation | Proof of reserves forged or replayed        | Single-use proofs, off-chain audits, `ProofAlreadyConsumed` guard                     |
| Role compromise           | Admin/treasury key leak                     | Multi-signature controls, `AccessControlDefaultAdminRules` scheduling, granular roles |
| Smart contract bugs       | Reentrancy, incorrect math                  | OZ libraries, unit tests, coverage, external reviews                                  |
| Operational errors        | Incorrect allocations or NAV resets         | Scripts with dry-run checks, event logging, pause capability                          |

## Defense in Depth

### Access Control

`BasketManager` inherits `AccessControlDefaultAdminRules`, enforcing a delay window for admin role changes. Core roles:

- `DEFAULT_ADMIN_ROLE` – manages basket registration, pause state, and oracle assignment.
- `TREASURY_ROLE` – allowed to execute mint and redeem flows.
- `ORACLE_MANAGER_ROLE` – updates allocations, refreshes NAV, triggers rebalances.
- `RESERVE_AUDITOR_ROLE` – posts reserve proofs.

Basket tokens grant `MANAGER_ROLE` solely to the manager contract, preventing direct minting by operators.

### Proof Lifecycle Controls

- `registerProof` writes the active hash + URI and resets consumption flag.
- `mint` checks `consumedProofs[hash] == false` before minting and flips it to `true` afterwards.
- Proof hash mismatch triggers `ProofMismatch`, halting execution.

Maintain custody policies ensuring proofs are signed off by independent auditors before submission.

### NAV Validation

- Each constituent price is fetched via `IMedianOracle`.
- Staleness enforced through `BasketConfig.stalenessThreshold` (per basket).
- Feeds flagged via `isPriceDegraded` revert mint and refresh actions until resolved.
- `refreshNAV` emits events with timestamp for monitoring.

### Pausable Execution

`BasketManager` exposes `pause()` / `unpause()` to suspend mint and redeem operations while still permitting read-only queries. Use during reserve discrepancies, oracle downtime, or security incidents requiring containment.

### Reentrancy & Overflow Protections

- `ReentrancyGuard` applied to mint/redeem flows.
- Safe math via Solidity 0.8 checked arithmetic.
- `SafeERC20` handles base asset transfers.

## Monitoring & Alerting

| Signal                                             | Source                      | Action                              |
| -------------------------------------------------- | --------------------------- | ----------------------------------- |
| `NAVRefreshed` age > threshold                     | On-chain event + dashboards | Trigger oracle investigation        |
| `ProofRegistered` without subsequent mint          | Ops logs                    | Verify custodian process            |
| `MintExecuted` / `RedeemExecuted` frequency spikes | Treasury monitoring         | Review reserve balances             |
| Contract paused                                    | On-chain event              | Initiate incident response protocol |

Automate checks via subgraph or log indexer to surface deviations quickly.

## Incident Response

1. **Detect** – Alert triggered (stale NAV, proof replay attempt, etc.).
2. **Contain** – Call `pause()`; notify stakeholders.
3. **Diagnose** – Review transaction logs, proofs, oracle feed health.
4. **Remediate** – Correct data feed, rotate keys, adjust allocations.
5. **Recover** – Run `refreshNAV`, validate proofs, then `unpause()`.
6. **Post-Mortem** – Document timeline, root cause, and mitigations to prevent recurrence.

## Key Management

- Store admin keys in multisig with delay rules (supports timelocked changes).
- Segregate oracle management keys from treasury execution keys.
- Rotate credentials after significant personnel changes or incident response.

## Auditing & Testing

- Unit tests cover mint/redeem, proof replay resistance, and oracle failure modes (`test/unit/BasketManager.test.ts`).
- Run `npm run coverage` before releases to confirm branch coverage on critical paths.
- Commission external audits after material contract changes and before mainnet deployments.
