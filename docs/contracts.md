# Basket Contract APIs

The legacy `AsiaFlexToken`, `TreasuryController`, and `NAVOracleAdapter` contracts have been retired. AsiaFlex now centers on two on-chain components: `BasketManager` and a family of `BasketToken` contracts. Lightweight mocks support testing and integrations.

## BasketManager

```solidity
contract BasketManager is
    AccessControlDefaultAdminRules,
    Pausable,
    ReentrancyGuard
```

### Roles

| Role                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE`   | Manages basket registration, config updates, and oracle assignments.          |
| `TREASURY_ROLE`        | Authorized to initiate reserve transfers or manage treasury automation hooks. |
| `ORACLE_MANAGER_ROLE`  | Maintains basket allocations, triggers rebalances, and refreshes NAV.         |
| `RESERVE_AUDITOR_ROLE` | Publishes reserve proofs and metadata URIs.                                   |

### Key Structs

```solidity
struct WeightedAsset {
    bytes32 assetId;
    uint16 weightBps;
    bool isBond;
    uint32 accrualBps;
}

struct BasketConfig {
    uint256 stalenessThreshold;
    uint256 rebalanceInterval;
}

struct BasketState {
    BasketToken token;
    uint256 nav;
    uint256 navTimestamp;
    uint256 lastRebalance;
    bytes32 latestProofHash;
    string latestProofUri;
}
```

### Lifecycle Functions

- `registerBasket(region, strategy, token, assets, config)` – one-time registration for each `(Region, Strategy)` pair. Stores allocations and config in a `BasketState` entry.
- `updateAllocation(id, assets)` – replaces the weighted asset basket (weight sum must equal 10,000 bps).
- `updateConfig(id, config)` – adjusts stale thresholds or rebalance cadence.
- `setPriceOracle(newOracle)` – updates the shared median oracle adapter.

### Proof & NAV Management

- `registerProof(id, proofHash, uri)` – stores the current reserve attestation and resets consumption flag.
- `refreshNAV(id)` – pulls basket constituent prices from the median oracle, enforcing staleness thresholds, and caches the NAV.
- `triggerRebalance(id)` – guard-railed hook that emits a `Rebalanced` event when allocations require off-chain portfolio rebalancing.

### Mint/Redeem API

```solidity
function mint(
    uint8 id,
    uint256 baseAmount,
    uint256 minShares,
    address beneficiary
) external nonReentrant whenNotPaused onlyRole(TREASURY_ROLE)
```

- Accepts reserve asset from `msg.sender`.
- Checks NAV freshness, proof validity, and slippage tolerance (`minShares`).
- Mints basket shares to `beneficiary` and marks proof hash as consumed.

```solidity
function redeem(
    uint8 id,
    uint256 shares,
    uint256 minBaseAmount,
    address recipient
) external nonReentrant whenNotPaused onlyRole(TREASURY_ROLE)
```

- Burns basket shares from `msg.sender` (or requires prior allowance).
- Calculates redemption amount using cached NAV.
- Transfers reserve asset to `recipient`.

### Events

- `BasketRegistered(uint8 id, address token, uint256 stalenessThreshold, uint256 rebalanceInterval)`
- `BasketAllocationUpdated(uint8 id, bytes32[] assetIds, uint16[] weights)`
- `NAVRefreshed(uint8 id, uint256 nav, uint256 timestamp)`
- `ProofRegistered(uint8 id, bytes32 proofHash, string uri)`
- `MintExecuted` / `RedeemExecuted` with detailed accounting fields.

### Errors

- `BasketAlreadyRegistered`, `BasketNotConfigured` – gating lifecycle order.
- `InvalidWeightsSum` – weights must total 10,000 bps.
- `OracleStale`, `OraclePriceMissing`, `OraclePriceDegraded` – price validation failures.
- `ProofAlreadyConsumed`, `ProofMismatch` – attestation misuse.
- `InvalidAmount`, `InvalidSlippage`, `InvalidBaseAsset`.

## BasketToken

Minimal ERC20 controlled by the manager.

```solidity
contract BasketToken is ERC20, AccessControl
```

### Roles

| Role                 | Description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `DEFAULT_ADMIN_ROLE` | Assigned to the deployer (typically BasketManager admin) for role management. |
| `MANAGER_ROLE`       | Granted to `BasketManager`; authorizes mint/burn.                             |

### Public API

- `mint(address to, uint256 amount)` – only callable by `MANAGER_ROLE`.
- `burn(address from, uint256 amount)` – only callable by `MANAGER_ROLE`.
- `setManager(address newManager)` – reassigns the manager role (protected by admin).

Events emitted mirror standard ERC20 transfers plus `ManagerUpdated`.

## Testing Mocks

### MockERC20

Lightweight ERC20 with configurable decimals and unrestricted `mint`. Used to simulate underlying reserve asset or external tokens in tests.

### MockMedianOracle

In-memory price oracle implementing `IMedianOracle`:

- `setPrice(bytes32 assetId, uint256 price, uint256 timestamp)` – configure deterministic price feeds.
- `getPrice(bytes32 assetId)` – returns price and timestamp, revert if missing.
- `degradePrice(bytes32 assetId)` – optional helper to mark a feed as degraded for failure testing.

## Interfaces

- `IMedianOracle` – expected oracle interface consumed by `BasketManager`.

The basket contract suite is intentionally compact compared to the deprecated AsiaFlex stack. Use the TypeChain typings under `typechain-types/` for end-to-end integration with the operational scripts in `scripts/ops/`.
