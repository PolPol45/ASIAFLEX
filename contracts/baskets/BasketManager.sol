// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BasketToken} from "./BasketToken.sol";
import {IMedianOracle} from "./interfaces/IMedianOracle.sol";

/**
 * @title BasketManager
 * @dev Manages multi-asset baskets, orchestrating NAV aggregation, mint/burn flows, and reserve attestations.
 */
contract BasketManager is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Region {
        EU,
        ASIA,
        EURO_ASIA
    }

    enum Strategy {
        FX,
        BOND,
        MIX
    }

    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
    bytes32 public constant RESERVE_AUDITOR_ROLE = keccak256("RESERVE_AUDITOR_ROLE");

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

    mapping(uint8 => WeightedAsset[]) private _basketAllocations;
    mapping(uint8 => BasketConfig) private _basketConfigs;
    mapping(uint8 => BasketState) private _basketStates;
    mapping(bytes32 => bool) public consumedProofs;

    IERC20 public immutable baseAsset;
    IMedianOracle public priceOracle;

    event BasketRegistered(
        uint8 indexed basketId,
        address token,
        uint256 stalenessThreshold,
        uint256 rebalanceInterval
    );
    event BasketAllocationUpdated(uint8 indexed basketId, bytes32[] assetIds, uint16[] weights);
    event BasketConfigUpdated(uint8 indexed basketId, uint256 stalenessThreshold, uint256 rebalanceInterval);
    event NAVRefreshed(uint8 indexed basketId, uint256 nav, uint256 timestamp);
    event PriceOracleUpdated(address indexed oracle);
    event MintExecuted(
        uint8 indexed basketId,
        address indexed payer,
        address indexed beneficiary,
        uint256 baseAmount,
        uint256 tokensMinted,
        uint256 nav,
        bytes32 proofHash
    );
    event RedeemExecuted(
        uint8 indexed basketId,
        address indexed from,
        address indexed recipient,
        uint256 tokensBurned,
        uint256 baseAmount,
        uint256 nav
    );
    event ProofRegistered(uint8 indexed basketId, bytes32 proofHash, string uri);
    event Rebalanced(uint8 indexed basketId, uint256 timestamp);

    error BasketAlreadyRegistered(uint8 basketId);
    error BasketNotConfigured(uint8 basketId);
    error InvalidWeightsSum();
    error ProofAlreadyConsumed(bytes32 proofHash);
    error ProofMismatch();
    error OracleStale(uint256 observedAge, uint256 allowedAge);
    error OraclePriceMissing(bytes32 assetId);
    error OraclePriceDegraded(bytes32 assetId);
    error RebalanceTooSoon(uint256 nextAvailableTimestamp);
    error InvalidAmount();
    error InvalidSlippage();
    error InvalidBaseAsset();

    constructor(address admin, uint48 adminDelay, address baseAssetAddress, address priceOracleAddress)
        AccessControlDefaultAdminRules(adminDelay, admin)
    {
        if (baseAssetAddress == address(0)) revert InvalidBaseAsset();
        if (priceOracleAddress == address(0)) revert InvalidBaseAsset();
        baseAsset = IERC20(baseAssetAddress);
        priceOracle = IMedianOracle(priceOracleAddress);

        _grantRole(TREASURY_ROLE, admin);
        _grantRole(ORACLE_MANAGER_ROLE, admin);
        _grantRole(RESERVE_AUDITOR_ROLE, admin);
    }

    function registerBasket(
        Region region,
        Strategy strategy,
        BasketToken token,
        WeightedAsset[] calldata assets,
        BasketConfig calldata config
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint8 id = _basketId(region, strategy);
        if (address(_basketStates[id].token) != address(0)) revert BasketAlreadyRegistered(id);
        _basketStates[id].token = token;
        _basketStates[id].lastRebalance = block.timestamp;

        _setAllocation(id, assets);
        _setConfig(id, config);

        emit BasketRegistered(id, address(token), config.stalenessThreshold, config.rebalanceInterval);
    }

    function updateAllocation(uint8 id, WeightedAsset[] calldata assets) external onlyRole(ORACLE_MANAGER_ROLE) {
        if (address(_basketStates[id].token) == address(0)) revert BasketNotConfigured(id);
        _setAllocation(id, assets);
    }

    function updateConfig(uint8 id, BasketConfig calldata config) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(_basketStates[id].token) == address(0)) revert BasketNotConfigured(id);
        _setConfig(id, config);
    }

    function setPriceOracle(address newOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOracle != address(0), "oracle address");
        priceOracle = IMedianOracle(newOracle);
        emit PriceOracleUpdated(newOracle);
    }

    function registerProof(uint8 id, bytes32 proofHash, string calldata uri)
        external
        onlyRole(RESERVE_AUDITOR_ROLE)
    {
        BasketState storage state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);

        state.latestProofHash = proofHash;
        state.latestProofUri = uri;
        consumedProofs[proofHash] = false;
        emit ProofRegistered(id, proofHash, uri);
    }

    function refreshNAV(uint8 id) public returns (uint256 nav, uint256 timestamp) {
        BasketState storage state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);

        WeightedAsset[] storage assets = _basketAllocations[id];
        uint256 len = assets.length;
        require(len > 0, "allocation missing");

        uint256 aggregated = 0;
        uint256 minTimestamp = type(uint256).max;
        BasketConfig memory cfg = _basketConfigs[id];

        for (uint256 i = 0; i < len; i++) {
            (uint256 price, uint256 updatedAt) = _fetchPrice(assets[i]);
            aggregated += (price * assets[i].weightBps) / 10_000;
            if (updatedAt < minTimestamp) {
                minTimestamp = updatedAt;
            }
        }

        uint256 age = block.timestamp - minTimestamp;
        if (age > cfg.stalenessThreshold) revert OracleStale(age, cfg.stalenessThreshold);

        state.nav = aggregated;
        state.navTimestamp = minTimestamp;
        emit NAVRefreshed(id, aggregated, minTimestamp);
        return (aggregated, minTimestamp);
    }

    function triggerRebalance(uint8 id) external onlyRole(ORACLE_MANAGER_ROLE) {
        BasketState storage state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);

        BasketConfig memory cfg = _basketConfigs[id];
        uint256 next = state.lastRebalance + cfg.rebalanceInterval;
        if (block.timestamp < next) revert RebalanceTooSoon(next);

        state.lastRebalance = block.timestamp;
        emit Rebalanced(id, block.timestamp);
    }

    function mint(
        Region region,
        Strategy strategy,
        uint256 baseAmount,
        uint256 minTokensOut,
        address beneficiary,
        bytes32 proofHash
    ) external whenNotPaused nonReentrant returns (uint256 tokensMinted) {
        if (baseAmount == 0) revert InvalidAmount();
        if (beneficiary == address(0)) {
            beneficiary = msg.sender;
        }

        uint8 id = _basketId(region, strategy);
        BasketState storage state = _requireBasket(id);
        refreshNAV(id);

        if (proofHash != bytes32(0)) {
            if (consumedProofs[proofHash]) revert ProofAlreadyConsumed(proofHash);
            if (state.latestProofHash != proofHash) revert ProofMismatch();
            consumedProofs[proofHash] = true;
        }

        baseAsset.safeTransferFrom(msg.sender, address(this), baseAmount);

        tokensMinted = (baseAmount * 1e18) / state.nav;
        if (tokensMinted < minTokensOut) revert InvalidSlippage();

        state.token.mint(beneficiary, tokensMinted);

        emit MintExecuted(id, msg.sender, beneficiary, baseAmount, tokensMinted, state.nav, proofHash);
    }

    function redeem(
        Region region,
        Strategy strategy,
        uint256 tokenAmount,
        uint256 minBaseAmount,
        address recipient
    ) external whenNotPaused nonReentrant returns (uint256 baseAmountOut) {
        if (tokenAmount == 0) revert InvalidAmount();
        if (recipient == address(0)) {
            recipient = msg.sender;
        }

        uint8 id = _basketId(region, strategy);
        BasketState storage state = _requireBasket(id);
        refreshNAV(id);

        state.token.burn(msg.sender, tokenAmount);

        baseAmountOut = (tokenAmount * state.nav) / 1e18;
        if (baseAmountOut < minBaseAmount) revert InvalidSlippage();

        baseAsset.safeTransfer(recipient, baseAmountOut);

        emit RedeemExecuted(id, msg.sender, recipient, tokenAmount, baseAmountOut, state.nav);
    }

    function basketId(Region region, Strategy strategy) external pure returns (uint8) {
        return _basketId(region, strategy);
    }

    function basketState(uint8 id) external view returns (BasketState memory) {
        return _basketStates[id];
    }

    function basketConfig(uint8 id) external view returns (BasketConfig memory) {
        return _basketConfigs[id];
    }

    function basketAllocations(uint8 id) external view returns (WeightedAsset[] memory) {
        WeightedAsset[] storage stored = _basketAllocations[id];
        WeightedAsset[] memory copy = new WeightedAsset[](stored.length);
        for (uint256 i = 0; i < stored.length; i++) {
            copy[i] = stored[i];
        }
        return copy;
    }

    function getNAV(uint8 id) external view returns (uint256 nav, uint256 timestamp) {
        BasketState storage state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);
        return (state.nav, state.navTimestamp);
    }

    function proofOfReserves(uint8 id)
        external
        view
        returns (bool isHealthy, uint256 backing, uint256 requiredBacking, uint256 nav, uint256 timestamp)
    {
        BasketState storage state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);

        backing = baseAsset.balanceOf(address(this));
        uint256 supply = state.token.totalSupply();
        nav = state.nav;
        timestamp = state.navTimestamp;

        if (supply == 0 || nav == 0) {
            return (true, backing, 0, nav, timestamp);
        }

        requiredBacking = (supply * nav) / 1e18;
        isHealthy = backing >= requiredBacking;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _setAllocation(uint8 id, WeightedAsset[] calldata assets) internal {
        delete _basketAllocations[id];
        uint256 len = assets.length;
        bytes32[] memory assetIds = new bytes32[](len);
        uint16[] memory weights = new uint16[](len);
        uint256 total = 0;

        for (uint256 i = 0; i < len; i++) {
            WeightedAsset calldata a = assets[i];
            total += a.weightBps;
            _basketAllocations[id].push(a);
            assetIds[i] = a.assetId;
            weights[i] = a.weightBps;
        }

        if (total != 10_000) revert InvalidWeightsSum();
        emit BasketAllocationUpdated(id, assetIds, weights);
    }

    function _setConfig(uint8 id, BasketConfig calldata config) internal {
        require(config.stalenessThreshold > 0, "stale threshold");
        require(config.rebalanceInterval > 0, "rebalance interval");
        _basketConfigs[id] = config;
        emit BasketConfigUpdated(id, config.stalenessThreshold, config.rebalanceInterval);
    }

    function _fetchPrice(WeightedAsset storage asset) internal view returns (uint256 price, uint256 updatedAt) {
        (uint256 storedPrice, uint256 oracleTimestamp, uint8 decimals, bool degraded) =
            priceOracle.getPrice(asset.assetId);
        if (storedPrice == 0) revert OraclePriceMissing(asset.assetId);
        if (degraded) revert OraclePriceDegraded(asset.assetId);

        if (decimals == 18) {
            price = storedPrice;
        } else if (decimals > 18) {
            price = storedPrice / (10 ** (uint256(decimals) - 18));
        } else {
            price = storedPrice * (10 ** (18 - uint256(decimals)));
        }

        if (asset.isBond && asset.accrualBps > 0) {
            price += (price * asset.accrualBps) / 10_000;
        }

        updatedAt = oracleTimestamp;
    }

    function _requireBasket(uint8 id) internal view returns (BasketState storage state) {
        state = _basketStates[id];
        if (address(state.token) == address(0)) revert BasketNotConfigured(id);
    }

    function _basketId(Region region, Strategy strategy) internal pure returns (uint8) {
        return uint8(uint256(region) * 3 + uint256(strategy));
    }
}
