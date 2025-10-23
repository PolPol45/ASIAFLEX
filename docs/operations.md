# Operations Guide

## Overview

This guide describes day-to-day operations for the basket-focused AsiaFlex platform. All procedures reference the tooling under `scripts/ops/` and assume a deployed `BasketManager` contract with connected `BasketToken`s.

## Daily Checklist

1. **Reserve Proofs** – Confirm `BasketManager.latestProofHash` reflects the most recent attestation for each basket.
2. **NAV Freshness** – Ensure every basket's `navTimestamp` is within `stalenessThreshold`.
3. **Oracle Health** – Inspect oracle metrics (data source connectivity, degraded feeds) and resolve anomalies.
4. **Pause State** – Verify the manager is not paused unexpectedly; if paused, follow incident response.
5. **USD Symbol Verification** – After any price/source redeploy, spot-check service logs for `*USD` asset IDs to confirm new feeds are flowing.

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

## Restart & Flush Playbook

Use this runbook whenever you need to bounce off-chain services (price fetchers, NAV refresh workers, proof ingestors) or flush stale cache data after outages, deployments, or oracle configuration updates.

**Prerequisites**

- Access to the runtime environment (Kubernetes context, PM2 host, or equivalent process manager).
- Updated `.env` with the latest contract addresses (`BASKET_MANAGER`, `TOK_*`, oracle endpoints).
- Communications channel ready for operator notifications.

**Pre-Restart Checklist**

- Announce the maintenance window and confirm no critical mint/redeem is in-flight.
- Capture the current on-chain snapshot:
  - `npm run ops:resolve -- --network <net>` to log manager/token bindings.
  - `npm run ops:refresh -- --dry-run` if you only need NAV preview before pausing.
- Decide whether to pause `BasketManager` for the duration (recommended if oracle downtime exceeds `stalenessThreshold`).
- Export the latest automation logs and, when possible, take a database/config backup of the off-chain service.

**Restart Sequence**

- Drain workers so they finish any in-flight jobs (e.g., disable queue consumers or scale replicas to zero).
- Restart the services in dependency order:
  1. Data collectors (market feeds, custodial polling).
  2. Oracle writers / NAV calculators.
  3. Any downstream webhooks or alerting adapters.
- Example commands (replace with the real service names):
  - `kubectl rollout restart deployment/oracle-publisher`
  - `kubectl rollout restart deployment/nav-updater`
  - `pm2 restart price-watcher`
- Wait for readiness probes/health checks to pass, then re-enable queue consumers or scale replicas back up.

**Flush & Validation Steps**

- When services are back, push fresh data end-to-end:
  - For seeded prices: `HARDHAT_NETWORK=<net> npm run ops:refresh` to repopulate NAV on-chain.
  - If you redeployed oracle storage, reseed sample quotes with `hardhat run scripts/ops/set-oracle-prices.ts --network <net>` (dry-run supported via `--dry-run`).
- Confirm `NAVRefreshed` and `ProofRegistered` events resume in the logs or dashboards.
- Re-run `npm run ops:resolve` to ensure env bindings still match on-chain addresses.

**Post-Restart Checks**

- Tail automation logs for 5-10 minutes looking for stale feed warnings or `OraclePriceMissing` errors.
- Inspect `BasketManager` state via `hardhat console` or `scripts/ops/check-manager.ts` to confirm NAV timestamps advance.
- Lift any pauses, announce completion, and append an entry to the Sepolia (or mainnet) operations log.

**Rollback Guidance**

- If health checks fail or NAV remains stale, revert to the previous service version (`kubectl rollout undo ...` or `pm2 restart <previous>`), then restore backups and notify stakeholders of extended downtime.
- Document the failure mode and next steps in the incident tracker.

## Reporting & Monitoring

- **NAV Updates** – Track via `NAVRefreshed` events or analytic dashboards.
- **Proof History** – Query `ProofRegistered` events filtered by basket ID.
- **Mint/Redeem Activity** – Monitor `MintExecuted` and `RedeemExecuted` events to reconcile treasury balances.
- **Post-Deployment Log Scan** – Immediately after restarting price/NAV fetchers, tail logs (e.g., `kubectl logs`, `pm2 logs`) and ensure entries reference the USD-quoted symbols (`JPYUSD`, `CNYUSD`, `KRWUSD`, `SGDUSD`, `CHFUSD`, `GBPUSD`).

Automated alerts should notify operators when NAV data is stale, proofs are missing, or the manager remains paused beyond expected windows.

### Automated Watchdog

Run the monitoring check on a schedule (cron, GitHub Actions, or Kubernetes `CronJob`) to produce alerts:

```bash
HARDHAT_NETWORK=sepolia \
BASKET_MANAGER=0x... \
MONITORING_WEBHOOK_URL=https://hooks.slack.com/services/... \
  npm run ops:monitor
```

The script evaluates:

- `BasketManager.paused()` status (critical when true).
- NAV age for each basket against its configured `stalenessThreshold` (critical when exceeded; warning when never refreshed).
- Presence and consumption state of the latest reserve proof hash (warning when missing or consumed).

**Exit codes**

- `0` when no alerts are detected.
- `2` when critical findings are present (suitable for failing CI jobs).
- `1` when the script itself errors (network or RPC failures).

Provide `DRY_RUN=true` or pass `--dry-run` to emit findings without posting to Slack/webhooks. Omit `MONITORING_WEBHOOK_URL` to log alerts locally (useful during dry runs).

**Scheduling tips**

- GitHub Actions: configure a workflow on `schedule` that exports the required env vars from encrypted secrets and runs `npm run ops:monitor`.
- Kubernetes: deploy as a `CronJob` with a lightweight Node image, injecting env vars via a secret and mounting kube-managed credentials for RPC URLs.
- On-prem or VM: add to `cron` or `systemd` timers, ensuring `.env` exports RPC URLs and contract addresses before invocation.

Log alert deliveries in the operations diary along with remediation details when thresholds are breached.

## Sepolia Operations Log

| Date (UTC) | Action               | Basket                       | Base Amount    | Tokens Minted               | Beneficiary                                | Approval Tx                                                                                                           | Mint Tx                                                                                                               | Block/Gas                  | Notes                                                                                                            |
| ---------- | -------------------- | ---------------------------- | -------------- | --------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 2025-10-22 | Mint                 | EUFX                         | 100 BASE (18d) | 100.502512562814070351 EUFX | 0xF4569BC729C62a2eD036F0A3fA66EDf842F14574 | [0x0c1c4c...2908](https://sepolia.etherscan.io/tx/0x0c1c4cb107cc377645a1a117348a5bdcea7468846fefc6fe61a6a0e0cfae2908) | [0x7e8c88...60db](https://sepolia.etherscan.io/tx/0x7e8c882a48a9709b9ff733574d44f16ac995363d01bb9a477e920884a86860db) | Block 9466965 / Gas 228526 | BasketManager 0x42f53DE77D7DE767259b62001CCD2Ca52c04a03d                                                         |
| 2025-10-22 | Oracle price refresh | All baskets                  | —              | —                           | —                                          | —                                                                                                                     | [multiple](https://sepolia.etherscan.io/tx/0xdec2fc6d7d6673d6360b2949fa2b94fa062fbd17af32137cc3c3497795c130e2)        | Blocks 9467060-9467067     | USD-quoted feeds seeded via `set-oracle-prices.ts` (legacy oracle `0xbccDcD...`)                                 |
| 2025-10-22 | Allocation update    | EUFX/ASFX/EUBOND/ASBOND/EUAS | —              | —                           | —                                          | —                                                                                                                     | [multiple](https://sepolia.etherscan.io/tx/0xe3f5c6b068c392dda42d76a65d97f5cf2f13fd6fd3228a66361b0b0d231e3d56)        | Blocks 9467071-9467075     | FX baskets now reference USD-quoted asset IDs; `register-baskets.ts` invoked in update mode                      |
| 2025-10-22 | Oracle redeploy      | —                            | —              | —                           | —                                          | —                                                                                                                     | [0x1b5Ae2...75E4](https://sepolia.etherscan.io/address/0x1b5Ae2D8144723619a38435946F62114EB5d75E4)                    | Block 9469372              | `MockMedianOracle` re-deployed with access control; admin/FEED_ROLE = 0xF4569BC729C62a2eD036F0A3fA66EDf842F14574 |
| 2025-10-22 | Oracle price refresh | All baskets                  | —              | —                           | —                                          | —                                                                                                                     | [multiple](https://sepolia.etherscan.io/tx/0x78246e47c7869b5f105e823f587b0f3007fd16fb4e02629e61e50e5d4a3558ba)        | Blocks 9469373-9469386     | Prices reseeded post-oracle redeploy via `set-oracle-prices.ts`; signer verified FEED_ROLE                       |
