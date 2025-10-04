# Basket-First Migration Plan

## Goals

- Promote `BasketToken` products to first-class citizens of the protocol, matching and extending all operational features previously centered on `AsiaFlexToken` (AFX).
- Preserve or improve security posture and test coverage while enabling per-basket lifecycle management.
- Provide operators with a clear migration path and tooling updates that prefer basket flows by default, marking AFX as legacy.

## Scope Overview

1. **Contract Layer**
   - Extend `BasketManager` with per-basket caps, circuit breakers, proof registry, limit tracking, and governance hooks.
   - Introduce `BasketTreasuryController` (or refactor existing controller) to handle EIP-712 attestations scoped by `basketId`.
   - Enhance `BasketToken` (permit, metadata) and ensure compatibility with basket-first orchestration.
   - Keep `AsiaFlexToken` deployed but locked down (caps zeroed, paused, marked legacy) for backward compatibility.
2. **Oracle / NAV**
   - Ensure `MedianOracle` + `NAVOracleAdapter` support per-basket queries, staleness/variance checks, and timestamp clamping.
   - Maintain real-data ingestion via `scripts/ops/update-median-oracle.ts` with basket-aware logging and telemetry.
3. **Tooling & Ops**
   - Replace `00_deploy_asiaflex.ts` with `00_deploy_baskets_stack.ts`; provide optional `99_deploy_legacy_afx.ts`.
   - Update ops scripts (`mint`, `redeem`, `status`, `nav`, `pause`, etc.) to require `--basket` flags.
   - Refresh `.env` schema, Hardhat tasks, and playground utilities for basket-first usage.
4. **Documentation & Reporting**
   - Update README, architecture docs, operations/security/testing guides, QA diary.
   - Add "Legacy vs Basket-first" comparison and migration checklist.
5. **Testing & Compliance**
   - Achieve >= existing coverage with new basket-focused suites (unit/integration/invariant).
   - Re-run Slither, storage layout checks, and Etherscan verification scripts.

## Functional Parity Matrix

| Feature              | Legacy AFX                              | Basket-First Target                                                     | Owner     |
| -------------------- | --------------------------------------- | ----------------------------------------------------------------------- | --------- |
| Attested mint/redeem | `TreasuryController.executeMint/Redeem` | `BasketTreasuryController.mintWithProof/redeemWithProof(basketId, ...)` | Contracts |
| Circuit breakers     | `AsiaFlexToken` caps/net inflow         | Per-basket caps tracked in `BasketManager`                              | Contracts |
| Pause                | `AsiaFlexToken.pause`                   | Basket-level pause + global pause                                       | Contracts |
| Proof-of-reserve     | AFX attestation hash                    | Basket-specific proof registry                                          | Contracts |
| NAV Refresh          | NAV Oracle Adapter                      | `BasketManager.refreshNAV` / adapter                                    | Oracle    |
| CLI ops              | AFX-centric scripts                     | Basket-aware commands (`--basket`)                                      | Tooling   |
| Docs                 | AFX described as main token             | Basket-first architecture spotlight                                     | Docs      |

## Phased Execution

1. **Analysis & Baseline**
   - Inventory current contracts, storage layouts, and tests.
   - Capture security-critical invariants that must persist.
2. **Contract Refactor**
   - Introduce per-basket limit structures and attestation paths.
   - Implement new treasury controller & update manager/token.
   - Add legacy wrapper for AFX lockdown.
3. **Tooling Migration**
   - Rewrite deploy scripts and ops tasks.
   - Update configuration files, Hardhat tasks, and env templates.
4. **Testing & Validation**
   - Port unit/integration tests to basket-first scenario.
   - Add edge case coverage (staleness, caps, replay, pause).
   - Run Slither, storage layout diff, Hardhat coverage.
5. **Documentation & Rollout**
   - Refresh docs, migration guide, CLI references.
   - Provide runbooks and release changelog (v2.0.0-basket-first).

## Testing Requirements

- Unit tests per basket for mint, redeem, caps, pause, proofs, oracle checks.
- Integration tests covering end-to-end mint/redeem with signed attestations.
- Negative tests for stale/deviated prices, replayed signatures, exceeded caps, paused states.
- Storage layout validation for upgraded contracts.
- Slither static analysis report stored under `slither-report.json`.

## Risk & Mitigation

- **Security Regression**: adopt defense-in-depth (role isolation, reentrancy guards, pausable), align with existing threat model.
- **Operational Drift**: ensure CLI changes are backward-compatible via migration flags and comprehensive docs.
- **Legacy Support**: maintain AFX but enforce zero caps + pause, document manual override only for emergency fallback.
- **Oracle Reliability**: keep timestamp clamp and multi-source feeds; add monitoring hooks.

## Open Questions / TBD

- Final decision on EIP-2612 support for BasketToken (default yes for UX parity).
- Governance granularity: per-basket roles vs global roles (leaning toward global roles with basketId scoping inside contracts).
- Migration sequencing for existing deployments (scripted disablement of AFX + seeding BasketManager state).

## Next Steps

1. Extract current AFX circuit breaker logic into reusable library for per-basket application.
2. Design `BasketTreasuryController` request structs and type hashes (include `basketId`).
3. Extend `BasketManager` storage layout with limit tracking and pause flags.
4. Draft updated `.env` template and deployment script skeletons.
5. Begin porting unit tests to the new architecture.
