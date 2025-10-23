// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IMedianOracle} from "../baskets/interfaces/IMedianOracle.sol";

contract MockMedianOracle is IMedianOracle, AccessControl {
    bytes32 public constant FEED_ROLE = keccak256("FEED_ROLE");

    mapping(bytes32 => PriceData) private _priceData;

    event PriceUpdated(bytes32 indexed assetId, uint256 price, uint256 updatedAt, uint8 decimals, bool degraded);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEED_ROLE, admin);
    }

    function setPrice(bytes32 assetId, uint256 price, uint256 updatedAt, uint8 decimals, bool degraded)
        external
        onlyRole(FEED_ROLE)
    {
        _priceData[assetId] = PriceData({price: price, updatedAt: updatedAt, decimals: decimals, degraded: degraded});
        emit PriceUpdated(assetId, price, updatedAt, decimals, degraded);
    }

    function getPrice(bytes32 assetId)
        external
        view
        override
        returns (uint256 price, uint256 updatedAt, uint8 decimals, bool degraded)
    {
        PriceData memory data = _priceData[assetId];
        return (data.price, data.updatedAt, data.decimals, data.degraded);
    }

    function getPriceData(bytes32 assetId) external view override returns (PriceData memory) {
        return _priceData[assetId];
    }

    function hasPrice(bytes32 assetId) external view override returns (bool) {
        return _priceData[assetId].price != 0;
    }
}
