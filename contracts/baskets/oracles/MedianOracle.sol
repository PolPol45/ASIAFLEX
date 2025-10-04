// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { IMedianOracle } from "../interfaces/IMedianOracle.sol";

/**
 * @title MedianOracle
 * @dev Minimal on-chain price store fed by an off-chain adapter that already performed
 *      source selection, median calculation, and normalization to USD 1e18.
 */
contract MedianOracle is AccessControl, IMedianOracle {
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");

    struct StoredPrice {
        uint256 price;
        uint256 updatedAt;
        uint8 decimals;
        bool degraded;
    }

    mapping(bytes32 => StoredPrice) private _prices;

    /// @notice Emitted every time a price is pushed on-chain.
    event PricePushed(
        bytes32 indexed assetId,
        string sourceSet,
        uint256 price,
        uint256 updatedAt,
        bool degraded,
        uint8 decimals
    );

    error InvalidAssetId();
    error InvalidPrice();
    error InvalidTimestamp(uint256 provided, uint256 maxAllowed);
    error PriceNotAvailable(bytes32 assetId);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ADMIN_ROLE, admin);
    }

    /**
     * @notice Register or revoke an updater able to push prices.
     */
    function setUpdater(address updater, bool allowed) external onlyRole(ORACLE_ADMIN_ROLE) {
        if (allowed) {
            _grantRole(ORACLE_UPDATER_ROLE, updater);
        } else {
            _revokeRole(ORACLE_UPDATER_ROLE, updater);
        }
    }

    /**
     * @notice Push a new price for the given asset id.
     * @param assetId keccak256 hash of the asset symbol/key
     * @param price Price normalized to USD 1e18 (unless decimals specified otherwise)
     * @param updatedAt Unix timestamp of the last price observation
     * @param decimals Number of decimals used in `price`
     * @param sourceSet Human-readable list of sources used (e.g. "PYTH|CHAINLINK")
     * @param degraded True if the adapter had to fall back to degraded data
     */
    function updatePrice(
        bytes32 assetId,
        uint256 price,
        uint256 updatedAt,
        uint8 decimals,
        string calldata sourceSet,
        bool degraded
    ) external onlyRole(ORACLE_UPDATER_ROLE) {
        if (assetId == bytes32(0)) revert InvalidAssetId();
        if (price == 0) revert InvalidPrice();

        uint256 maxAllowed = block.timestamp + 5 minutes;
        if (updatedAt == 0 || updatedAt > maxAllowed) {
            revert InvalidTimestamp(updatedAt, maxAllowed);
        }

        StoredPrice storage slot = _prices[assetId];
        slot.price = price;
        slot.updatedAt = updatedAt;
        slot.decimals = decimals;
        slot.degraded = degraded;

        emit PricePushed(assetId, sourceSet, price, updatedAt, degraded, decimals);
    }

    function getPrice(bytes32 assetId)
        external
        view
        returns (uint256 price, uint256 updatedAt, uint8 decimals, bool degraded)
    {
        StoredPrice memory slot = _prices[assetId];
        if (slot.price == 0) revert PriceNotAvailable(assetId);
        return (slot.price, slot.updatedAt, slot.decimals, slot.degraded);
    }

    function getPriceData(bytes32 assetId) external view returns (PriceData memory) {
        StoredPrice memory slot = _prices[assetId];
        if (slot.price == 0) revert PriceNotAvailable(assetId);
        return PriceData({
            price: slot.price,
            updatedAt: slot.updatedAt,
            decimals: slot.decimals,
            degraded: slot.degraded
        });
    }

    function hasPrice(bytes32 assetId) external view returns (bool) {
        return _prices[assetId].price != 0;
    }
}
