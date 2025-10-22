# Operations Guide

## Overview

This guide describes day-to-day operations for the basket-focused AsiaFlex platform. All procedures reference the tooling under `scripts/ops/` and assume a deployed `BasketManager` contract with connected `BasketToken`s.

## Daily Checklist

1. **Reserve Proofs** – Confirm `BasketManager.latestProofHash` reflects the most recent attestation for each basket.
2. **NAV Freshness** – Ensure every basket's `navTimestamp` is within `stalenessThreshold`.
3. **Oracle Health** – Inspect oracle metrics (data source connectivity, degraded feeds) and resolve anomalies.
4. **Pause State** – Verify the manager is not paused unexpectedly; if paused, follow incident response.

Document findings in the operations log at market open.

## Registering Baskets

Run once per deployment to seed allocations and configs.

```bash
HARDHAT_NETWORK=sepolia BASKET_MANAGER=0x... TOK_EUFX=0x... TOK_ASFX=0x... \
TOK_EUBOND=0x... TOK_ASBOND=0x... TOK_EUAS=0x... \
  npm run ops:register
```

The script:

- Confirms the `BasketToken` manager role is assigned correctly.
- Writes weighted asset allocations (weights must total 10,000 bps).
- Sets staleness thresholds and rebalance intervals per basket.

Edit the `ALLOCATIONS` map inside `scripts/ops/register-baskets.ts` before re-running to adjust basket weights or symbols.

## Refreshing NAV

Invoke after publishing fresh oracle prices or on a scheduled cadence.

```bash
HARDHAT_NETWORK=sepolia BASKET_MANAGER=0x... npm run ops:refresh
```

The script iterates through registered baskets, calling `BasketManager.refreshNAV`. Reverts such as `OracleStale` or `OraclePriceMissing` signal data pipeline issues that must be resolved before proceeding.

## Minting Basket Tokens

```bash
HARDHAT_NETWORK=sepolia \
  BASKET_MANAGER=0x... \
  TOK_EUFX=0x... \
  MINT_BASKET_KEY=EUFX \
  MINT_BASE_AMOUNT=1000 \
  MINT_MIN_TOKENS=950 \
  MINT_BENEFICIARY=0xUser \
  MINT_PROOF_HASH=0x... \
  npm run ops:mint
```

Operational steps:

1. Custodian publishes a reserve proof and shares the hash + URI.
2. Operator records the proof on-chain (see "Reserve Proof Lifecycle").
3. Treasury transfers base asset to the manager and executes the mint script.
4. Script validates slippage (`min-shares`) and proof freshness before minting.

Transaction logs include NAV, proof hash, base asset consumed, and tokens issued—capture them for audit trails.

## Redeeming Basket Tokens

```bash
HARDHAT_NETWORK=sepolia \
  BASKET_MANAGER=0x... \
  TOK_EUFX=0x... \
  REDEEM_BASKET_KEY=EUFX \
  REDEEM_TOKEN_AMOUNT=100 \
  REDEEM_MIN_BASE=95 \
  REDEEM_RECIPIENT=0xTreasury \
  npm run ops:redeem
```

Flow overview:

- User (or operator) approves `BasketManager` to burn the specified shares.
- Script calculates the redemption amount using cached NAV and checks the `min-base` guard.
- On success, base asset is released to the chosen recipient.

## Reserve Proof Lifecycle

1. **Generate Proof** – Custodian compiles reserve evidence and hashes the document.
2. **On-chain Registration** – Use Hardhat console or a helper script to submit the proof:

   ```bash
   BASKET_MANAGER=0x...
   BASKET_ID=0
   PROOF_HASH=0x...
   PROOF_URI=https://...

   npx hardhat --network sepolia console <<'INNER'
   const manager = await ethers.getContractAt("BasketManager", process.env.BASKET_MANAGER);
   await manager.registerProof(Number(process.env.BASKET_ID), process.env.PROOF_HASH, process.env.PROOF_URI);
   INNER
   ```

3. **Mint Execution** – Mint scripts reference the active hash; `BasketManager` marks it consumed to prevent replay.
4. **Archival** – Store proof documents alongside emitted `ProofRegistered` events for compliance.

## Emergency Procedures

- **Pause** – `BasketManager.pause()` (admin only). Trigger when reserves, oracle data, or allocations are in doubt.
- **Unpause** – Resume with `BasketManager.unpause()` after remediation.
- **Oracle Replacement** – Deploy a new oracle adapter and call `setPriceOracle`.
- **Allocation Hotfix** – Use `updateAllocation` to temporarily shift weights toward cash-equivalent assets during incidents.

Always document root cause, actions taken, and follow-up tasks.

## Reporting & Monitoring

- **NAV Updates** – Track via `NAVRefreshed` events or analytic dashboards.
- **Proof History** – Query `ProofRegistered` events filtered by basket ID.
- **Mint/Redeem Activity** – Monitor `MintExecuted` and `RedeemExecuted` events to reconcile treasury balances.

Automated alerts should notify operators when NAV data is stale, proofs are missing, or the manager remains paused beyond expected windows.
