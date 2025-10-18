# Operations Guide

## Overview

This guide provides operational procedures for AsiaFlex token management, including mint/redeem operations, oracle updates, emergency procedures, and routine maintenance.

> **Status & roadmap**
>
> - **Shipped operations:** Basket-first demos and local runbooks (`npm run dev:demo`, `scripts/ops/*`), signed mint/redeem flows via `TreasuryController`, and NAV seeding helpers.
> - **Planned operations:** Full BasketManager mainnet rollout, multi-asset pricing automation, and expanded incident-response tooling.

## Test & Validation Checklist

Before rolling changes across environments, run the following commands and confirm they complete without errors:

- `npx hardhat compile`
- `npm run typecheck`
- `npm run build`
- `npx hardhat test --grep "basket|feeder|transfer|mint"`
- `node scripts/ops/mint-basket.ts --help`

## Daily Operations

### Morning Checklist

1. **Reserve Reconciliation**
   - Verify custodial account balances
   - Check overnight transaction logs
   - Confirm reserve ratio ≥ 100%

2. **Oracle Status Check**
   - Validate AAXJ price freshness
   - Check for any deviation alerts
   - Verify oracle updater connectivity

3. **Circuit Breaker Status**
   - Review daily limits utilization
   - Check for any triggered limits
   - Reset daily counters if needed

4. **Security Monitoring**
   - Review security alerts from overnight
   - Check multisig pending transactions
   - Validate access control integrity

### Evening Checklist

1. **Daily Reports**
   - Generate daily trading volume report
   - Update reserve attestation logs
   - Review transaction gas costs

2. **System Health**
   - Check all monitoring systems
   - Verify backup procedures
   - Update operational logs

## Mint Operations

### Standard Mint Process

#### Prerequisites

- Valid custodial deposit confirmation
- Current AAXJ NAV price available
- Daily mint limit not exceeded
- Treasury signer available

#### Step-by-Step Procedure

1. **Verify Collateral Deposit**

   ```bash
   # Check custodial account for new deposits
   ./scripts/check-reserves.js --network mainnet
   ```

2. **Generate Mint Attestation**

   ```typescript
   // Off-chain attestation generation
   const attestation = await generateMintAttestation({
     to: userAddress,
     amount: mintAmount,
     timestamp: Date.now(),
     reserveHash: calculateReserveHash(currentReserves),
   });
   ```

3. **Execute Mint Transaction**

   ```bash
   # Submit mint transaction
   npx hardhat run scripts/mint-tokens.ts --network mainnet \
     --to 0x... \
     --amount 1000000000000000000000 \
     --attestation 0x...
   ```

4. **Verify Mint Completion**
   ```bash
   # Check transaction status and token balance
   npx hardhat run scripts/verify-mint.ts --network mainnet --txhash 0x...
   ```

#### Error Handling

- **Daily Limit Exceeded**: Wait for daily reset or increase limits via governance
- **Invalid Attestation**: Regenerate with correct parameters
- **Oracle Stale**: Update oracle price before retry
- **Insufficient Gas**: Increase gas price and retry

### Large Mint Operations (>$100K)

#### Additional Requirements

- Secondary verification of collateral
- Multi-signature approval required
- Enhanced monitoring during execution
- Post-transaction audit

#### Enhanced Procedure

1. **Pre-approval Process**
   - Risk assessment for large mint
   - Multi-signature pre-approval
   - Market impact analysis

2. **Execution Monitoring**
   - Real-time transaction monitoring
   - Circuit breaker status tracking
   - Immediate post-execution verification

## Redeem Operations

### Standard Redeem Process

#### Prerequisites

- Valid redeem request from authorized entity
- Current AAXJ NAV price available
- Sufficient token balance for burn
- Custodial account ready for withdrawal

#### Step-by-Step Procedure

1. **Validate Redeem Request**

   ```bash
   # Verify user token balance and request validity
   npx hardhat run scripts/validate-redeem.ts --network mainnet \
     --user 0x... \
     --amount 1000000000000000000000
   ```

2. **Generate Redeem Attestation**

   ```typescript
   const redeemAttestation = await generateRedeemAttestation({
     from: userAddress,
     amount: redeemAmount,
     timestamp: Date.now(),
     reserveHash: calculateReserveHash(currentReserves),
   });
   ```

3. **Execute Redeem Transaction**

   ```bash
   # Submit redeem and burn transaction
   npx hardhat run scripts/redeem-tokens.ts --network mainnet \
     --from 0x... \
     --amount 1000000000000000000000 \
     --attestation 0x...
   ```

4. **Process Collateral Withdrawal**
   ```bash
   # Initiate custodial account withdrawal
   ./scripts/withdraw-collateral.js \
     --amount 1000.00 \
     --destination 0x...
   ```

#### Post-Redeem Verification

- Confirm token burn completed
- Verify collateral withdrawal initiated
- Update daily limit counters
- Log transaction for audit trail

## Transfer Operations

### Basket & Legacy Token Transfers with Live Tracking

Use the unified transfer runner to orchestrate on-chain transfers while capturing confirmations via WebSocket (fallback to polling when WSS is unavailable).

```bash
# Basket token transfer with WebSocket tracking and persisted addresses
node scripts/ops/transfer.ts \
  --network sepolia \
  --basket EUFX \
  --from 0xSender \
  --to 0xBeneficiary \
  --amount 1.5 \
  --addresses scripts/deployments/sepolia.json \
  --wss wss://sepolia.infura.io/ws/v3/YOUR_KEY

# Legacy AsiaFlexToken transfer (no basket selection needed)
node scripts/ops/transfer.ts --network sepolia --legacy --from 0xSender --to 0xBeneficiary --amount 500
```

Key behaviors:

- Automatically discovers BasketManager, NAV Oracle, and token addresses from the shared deployments file, persisting any newly supplied overrides.
- Streams `Transfer` events via WebSocket when available; falls back to ABI filter polling with exponential backoff.
- Appends an immutable JSONL audit trail per network under `scripts/ops/ledger/transfers-<network>.jsonl`, recording the tx hash, event source (`wss` or `poll`), block number, and human-readable amounts.
- Supports `--dry-run` to preview balances without submitting the transaction.

### Localhost Basket Snapshot — 13 Oct 2025

The latest end-to-end rehearsal (deploy → mint → transfer → redeem) on the Hardhat network produced the following balances for the primary operator wallet (`0xf39F…266`):

| Basket | Shares After Redeem   | Base Notional Burned | Redeem Tx Hash                                                       |
| ------ | --------------------- | -------------------- | -------------------------------------------------------------------- |
| EUFX   | 1.497261438439470044  | 10                   | `0xef64256ef1a7e0e4933cadc9420e3340656f6b3602ff83a8d36bb46a36ac6862` |
| EUBND  | 1.533631991814096034  | 10                   | `0xaae585046b5352b80ba5f98084e0ecd0b46bbca53922d838cc98621b950781e8` |
| ASFX   | 6.330717152838373175  | 4                    | `0xb8bfcd86f42ed4ba84f9b27fa8d21765fc1e4399cc62db2487468c1bd84b62d3` |
| ASBND  | 1.099854092446022546  | 5                    | `0xcd2a4a2900230d9806e15a262e8f781610ab7190e940919c1163a17a4dc74b43` |
| EAMIX  | 27.854220871807942824 | 10                   | `0xb5d05e185a274468629fe90cf11fd50edf3647fbb49ccfb2de5b4ba1748bf3d9` |

Each basket transfer was recorded in `scripts/ledger/transfers-localhost.jsonl`; the most recent entries include the EUFX (5 shares), EUBND (0.5 shares), ASFX (50 shares), ASBND (1 share), and EAMIX (10 shares) dispatches to the sink account (`0x0000…001`).

> **Controller quirk:** the current `BasketTreasuryController` implementation interprets `request.notional` as share-scaled units rather than raw base-asset amounts. The new `scripts/ops/redeem-basket.ts` helper compensates by converting the requested base notional into a share-aligned payload and records both the operator’s desired amount and the adjusted controller notional. Consider patching `BasketTreasuryController` (or `BasketManager.quoteRedeem` usage) before promoting this workflow beyond localhost.

## Oracle Management

### Price Update Process

#### Automated Updates

```typescript
// Automated oracle update service
class OracleUpdater {
  async updatePrice() {
    const currentPrice = await fetchAAXJPrice();
    const lastPrice = await oracle.getCurrentNAV();

    // Validate deviation threshold
    const deviation = calculateDeviation(lastPrice, currentPrice);
    if (deviation > DEVIATION_THRESHOLD) {
      await this.escalateDeviation(deviation);
      return;
    }

    // Submit price update
    await oracle.updateNAV(currentPrice);
  }
}
```

#### Manual Price Updates

```bash
# Dry-run median oracle updates using the feeder preset
npm run ops:nav:dry -- --network sepolia --addresses scripts/deployments/sepolia.json --symbols EURUSD,USDJPY,XAUUSD

# Commit median oracle updates (omit --commit for preview mode)
npm run ops:nav:update -- --network sepolia --addresses scripts/deployments/sepolia.json --symbols EURUSD --commit

# Direct script invocation (supports --dry-run and --addresses overrides)
node scripts/ops/update-median-oracle.ts --network sepolia --assets EURUSD,XAUUSD --dry-run
```

#### Continuous NAV Watcher

```bash
# Esegue il feeder ogni 5 minuti (default) e invia gli update
NETWORK=localhost npm run ops:nav:watch -- --addresses scripts/deployments/localhost.json --symbols EUFX,EUBND,ASFX,ASBND,EAMIX

# Parametri utili:
#   --interval 600000   intervallo personalizzato (ms)
#   --jitter 60000      jitter random per evitare sincronizzazioni
#   --dry               modalità preview senza commit
```

Lo script `scripts/ops/nav-watch.ts` gestisce loop, backoff esponenziale e log dei cicli. On-chain viene scritto solo quando si passa `--commit` (default nel comando npm); in caso di errore termina con exit code ≠ 0 dopo il tentativo in modalità `--once`, oppure continua a riprovare rispettando il backoff configurato.

**Variabili d'ambiente principali**

- `EXCHANGERATE_API_KEY`: chiave server-side per https://www.exchangerate-api.com/ (tier Pro consigliato per <5 min TTL).
- `GOLD_API_KEY`: token GoldAPI (aggiungi il prefisso `Bearer` una sola volta).
- `FEEDER_ADDRESSES`: file JSON con gli indirizzi del deployment (es. `scripts/deployments/sepolia.json`).
- `FEEDER_SYMBOLS`: lista asset da aggiornare (se vuota usa `scripts/ops/assets.map.ts`).
- `FEEDER_COMMIT_FLAG`: imposta `1` per abilitare i commit, lascia non impostata per dry-run permanente.
- `NAV_WATCH_INTERVAL_MS` / `NAV_WATCH_JITTER_MS`: controllano frequenza e jitter delle esecuzioni.

Puoi partire da `scripts/ops/.env.nav-watch.example`, personalizzarlo, e poi puntare il watcher al file con `DOTENV_CONFIG_PATH=scripts/ops/.env.nav-watch`. Esempio:

```bash
cp scripts/ops/.env.nav-watch.example scripts/ops/.env.nav-watch
$EDITOR scripts/ops/.env.nav-watch
DOTENV_CONFIG_PATH=scripts/ops/.env.nav-watch npm run ops:nav:watch -- --network sepolia --addresses scripts/deployments/sepolia.json --symbols EURUSD,USDJPY,XAUUSD,AAXJ.US
```

> **Heads up:** When invoking the feeder through Hardhat (`npx hardhat run ...`), always insert `--` before any script-specific flags so that Hardhat forwards them instead of trying to parse them itself.

**Esecuzione continuativa (production)**

- Systemd: crea `/etc/systemd/system/asiaflex-nav-watch.service` con `WorkingDirectory=/opt/asiaflex`, `Environment="DOTENV_CONFIG_PATH=/opt/asiaflex/scripts/ops/.env.nav-watch"`, `ExecStart=/usr/bin/npm run ops:nav:watch`, `Restart=always`, poi attiva con `systemctl enable --now asiaflex-nav-watch`.
- PM2: `pm2 start npm --name asiaflex-nav-watch -- run ops:nav:watch -- --network sepolia` e aggiungi `--env DOTENV_CONFIG_PATH=...` oppure usa `pm2 start ecosystem.config.js` per più istanze.
- Logging: in systemd usa `journalctl -u asiaflex-nav-watch -f`; con PM2 puoi usare `pm2 logs asiaflex-nav-watch`.
- Replica safe: abilita jitter (`NAV_WATCH_JITTER_MS`) e fissa `NODE_ENV=production` per evitare rebuild non necessari.

#### Emergency Price Updates

```bash
# Emergency price update (bypasses some checks)
npx hardhat run scripts/emergency-oracle-update.ts --network mainnet \
  --price 95.50 \
  --justification "Market disruption event"
```

### Oracle Monitoring

#### Health Checks

- Price staleness monitoring (< 1 hour)
- Deviation alert system (> 1%)
- Data source availability
- Oracle updater connectivity

#### Alerting Configuration

```yaml
oracle_alerts:
  staleness:
    threshold: 3600 # 1 hour
    severity: HIGH
  deviation:
    threshold: 100 # 1% in basis points
    severity: MEDIUM
  update_failure:
    threshold: 2 # consecutive failures
    severity: HIGH
```

## Emergency Procedures

### Emergency Pause

#### When to Pause

- Security vulnerability detected
- Oracle manipulation suspected
- Significant market disruption
- Large unauthorized transaction

#### Pause Procedure

```bash
# Emergency pause all operations
npx hardhat run scripts/emergency-pause.ts --network mainnet \
  --reason "Security incident detected"
```

#### Communication Protocol

1. **Immediate**: Notify core team via emergency channels
2. **15 minutes**: Inform exchange partners
3. **30 minutes**: Public communication via social media
4. **1 hour**: Detailed incident report

### Emergency Unpause

#### Prerequisites

- Root cause identified and fixed
- Security team approval
- Multi-signature confirmation
- Stakeholder notification complete

#### Unpause Procedure

```bash
# Resume operations after emergency
npx hardhat run scripts/emergency-unpause.ts --network mainnet \
  --multisig-approval 0x...
```

### Circuit Breaker Management

#### Temporary Limit Increases

```bash
# Increase daily limits for high-demand periods
npx hardhat run scripts/update-limits.ts --network mainnet \
  --daily-mint 5000000000000000000000000 \
  --daily-inflows 5000000000000000000000000 \
  --duration 86400
```

#### Emergency Limit Decreases

```bash
# Reduce limits during market stress
npx hardhat run scripts/emergency-limit-reduction.ts --network mainnet \
  --daily-mint 100000000000000000000000 \
  --justification "Market volatility protection"
```

## Monitoring & Alerts

### Key Metrics Dashboard

#### Operational Metrics

- Total supply vs reserve ratio
- Daily mint/redeem volumes
- Circuit breaker utilization
- Oracle price deviation
- Transaction success rates

#### Security Metrics

- Failed transaction patterns
- Large transaction alerts
- Access control violations
- Multi-signature pending transactions

### Alert Escalation Matrix

| Severity | Response Time | Notification         |
| -------- | ------------- | -------------------- |
| LOW      | 4 hours       | Email                |
| MEDIUM   | 1 hour        | Email + Slack        |
| HIGH     | 15 minutes    | Email + Slack + SMS  |
| CRITICAL | 5 minutes     | All channels + Phone |

### Monitoring Scripts

#### Health Check Script

```bash
#!/bin/bash
# Daily health check
./scripts/check-reserves.js
./scripts/check-oracle.js
./scripts/check-limits.js
./scripts/check-security.js
```

#### Alert Script

```typescript
// Automated alert system
class AlertSystem {
  async checkMetrics() {
    const metrics = await this.gatherMetrics();

    if (metrics.reserveRatio < 1.0) {
      await this.sendAlert("CRITICAL", "Reserve ratio below 100%");
    }

    if (metrics.oracleStaleness > 3600) {
      await this.sendAlert("HIGH", "Oracle price stale");
    }

    // ... additional checks
  }
}
```

## Maintenance Procedures

### Weekly Maintenance

- Review and update operational parameters
- Security audit of recent transactions
- Performance optimization analysis
- Backup and disaster recovery testing

### Monthly Maintenance

- Comprehensive security review
- Oracle data source validation
- Multi-signature key rotation check
- Reserve attestation audit

### Quarterly Maintenance

- Full security audit
- Disaster recovery drill
- Parameter optimization review
- Third-party integration testing

## Runbook Commands

### Quick Reference

```bash
# Check system status
npm run status:check

# Emergency pause
npm run emergency:pause

# Update oracle price
npm run ops:nav:update -- --symbols EUR,GBP --commit

# Mint tokens
npm run mint --to 0x... --amount 1000

# Redeem tokens
npm run redeem --from 0x... --amount 1000

# Check reserves
npm run reserves:check

# Generate reports
npm run reports:daily
```

### Environment Variables

```bash
# Required for operations
export PRIVATE_KEY="0x..."
export ETHERSCAN_API_KEY="..."
export TREASURY_SIGNER="0x..."
export EXCHANGERATE_API_KEY="..."
export GOLD_API_KEY="..."
```
