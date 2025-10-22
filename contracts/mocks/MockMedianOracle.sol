// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IMedianOracle} from "../baskets/interfaces/IMedianOracle.sol";

contract MockMedianOracle is IMedianOracle {
    mapping(bytes32 => PriceData) private _priceData;

    function setPrice(bytes32 assetId, uint256 price, uint256 updatedAt, uint8 decimals, bool degraded) external {
        _priceData[assetId] = PriceData({price: price, updatedAt: updatedAt, decimals: decimals, degraded: degraded});
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
