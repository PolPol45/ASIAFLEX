// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IMedianOracle {
    struct PriceData {
        uint256 price;
        uint256 updatedAt;
        uint8 decimals;
        bool degraded;
    }

    function getPrice(bytes32 assetId)
        external
        view
        returns (uint256 price, uint256 updatedAt, uint8 decimals, bool degraded);

    function getPriceData(bytes32 assetId) external view returns (PriceData memory);

    function hasPrice(bytes32 assetId) external view returns (bool);
}
