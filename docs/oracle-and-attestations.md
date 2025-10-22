# Oracle & Reserve Attestations

## Overview

AsiaFlex relies on two off-chain inputs to secure the basket ecosystem:

1. **Median Oracle** – Converts multiple price feeds into a single NAV per registered asset ID.
2. **Reserve Proofs** – Cryptographic commitments supplied by custodians that confirm base-asset backing for all baskets.

Both inputs are orchestrated via the on-chain `BasketManager` contract.

## Median Oracle

### Interface

```solidity
interface IMedianOracle {
    function getPrice(bytes32 assetId) external view returns (uint256 price, uint256 updatedAt);
    function isPriceDegraded(bytes32 assetId) external view returns (bool);
}
```

`BasketManager` expects NAV prices in 18 decimals. `assetId` values correspond to basket constituents (e.g., `ETH_USD`, `JP_BOND`).

### Update Cycle

1. Off-chain service fetches market data from diverse providers.
2. Median logic filters outliers, applies sanity checks, and writes the result into the oracle store contract.
3. Operators trigger `BasketManager.refreshNAV` to ingest fresh prices. The manager rejects updates when:
   - No allocation data is present.
   - A feed is marked as degraded.
   - The oldest constituent timestamp exceeds `stalenessThreshold`.

### Operational Tips

- Align `rebalanceInterval` with oracle cadence (e.g., hourly NAV refresh and daily rebalance hooks).
- Monitor `NAVRefreshed` events to confirm updates.
- Raise alerts when `OracleStale` or `OraclePriceMissing` errors surface in automation logs.

## Reserve Proofs

### Publishing Proofs

Custodians submit reserve statements (PDF, audit report, etc.), hash the artifact, and expose it via an immutable URI.

1. Generate hash off-chain:
   ```bash
   sha256sum proof.pdf
   ```
2. Upload document to secure storage (S3, IPFS w/ access policies, etc.).
3. Register the proof on-chain:

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

`BasketManager.registerProof` stores both the hash and URI. The manager resets `consumedProofs[hash] = false` on registration.

### Consumption Rules

- Proof hashes are single-use per basket. `mint` marks `consumedProofs[hash] = true`.
- Attempting to reuse a proof triggers `ProofAlreadyConsumed`.
- `ProofMismatch` is raised when a mint references a hash different from the one currently registered.

### Audit Trail

Every successful mint emits:

```
event MintExecuted(
    uint8 indexed basketId,
    address indexed payer,
    address indexed beneficiary,
    uint256 baseAmount,
    uint256 tokensMinted,
    uint256 nav,
    bytes32 proofHash
);
```

Link this event back to the registered `proofUri` for compliance reporting.

## Incident Response

- **Stale NAV** – Pause minting, resolve oracle data gaps, refresh NAV, then unpause.
- **Proof Missing** – Block new mint requests until the custodian posts a replacement proof.
- **Degraded Price Feed** – Update or disable the feed in the oracle service, then re-run `refreshNAV`.

Document all incidents with timestamps, error messages, and remediation steps to maintain an auditable trail.
