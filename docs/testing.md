# Testing Strategy

## Test Pyramid

```
    /
   /  \    Integration (Hardhat scripts)
  /____\   Contract Unit Tests
 /      \  Static Analysis & Coverage
/________\ TypeScript Build/Lint
```

## Contract Unit Tests

Located under `test/unit/` with Hardhat + TypeChain tooling.

- `BasketManager.test.ts`
  - Registers baskets and confirms allocation validation (weights sum, staleness thresholds).
  - Exercises mint/redeem flows with mocked NAVs and proofs.
  - Verifies proof replay protection and error surfaces (`ProofAlreadyConsumed`, `OracleStale`).
  - Tests role-gated operations (`ORACLE_MANAGER_ROLE`, `RESERVE_AUDITOR_ROLE`).

- `BasketToken` coverage is embedded in the manager suite through delegated mint/burn checks.
- Mocks (`MockERC20`, `MockMedianOracle`) emulate reserves and oracle outputs for deterministic assertions.

Run locally:

```bash
npm run test
```

Generate coverage:

```bash
npm run coverage
```

Coverage artifacts appear in `coverage/` and `coverage/lcov-report/`.

## Script Integration Checks

Use Hardhat scripts under `scripts/ops/` to validate end-to-end workflows against testnets or a local node.

1. Deploy tokens and register baskets.
2. Publish reserve proof via the Hardhat console (`registerProof`).
3. Execute `mint-eufx.ts` followed by `redeem-eufx.ts` to ensure balances reconcile.
4. Confirm NAV refresh succeeds post oracle update.

Record observations in QA diary when running manual dry-runs.

## Static Analysis & Linting

- `npm run lint` – TypeScript linting for scripts and helpers.
- `npx hardhat check` – Solidity linting via `solhint` (configured in `.solhint.json`).
- `npx slither .` (optional) – Additional static analysis when available; adjust `slither.config.json` for custom checks.

## CI Expectations

The GitHub Actions pipeline runs:

- `npm ci`
- `npm run lint`
- `npm run test`
- Coverage upload to Codecov

Ensure all new pull requests keep coverage flat or improving, and include new test cases for contract path changes.

## Testing Guidelines

- Prefer deterministic mocks; avoid reliance on external APIs during tests.
- When modifying basket allocations, add regression tests covering edge conditions (empty weights, oversized weights).
- Document newly discovered edge cases in `QA_DIARY.md` to inform future improvements.
- Use Hardhat's `time.increase` helpers for staleness boundary checks.
