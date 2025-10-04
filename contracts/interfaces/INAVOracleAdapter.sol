// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title INAVOracleAdapter
 * @notice Interface for retrieving per-basket NAV data with staleness and deviation controls.
 */
interface INAVOracleAdapter {
    struct NAVObservation {
        uint256 nav; // NAV per share scaled to 1e18
        uint256 timestamp; // last update timestamp
        uint256 stalenessThreshold; // seconds
        uint256 deviationThreshold; // basis points (1e4 = 100%)
    }

    event NAVUpdated(bytes32 indexed basketId, uint256 oldNav, uint256 newNav, uint256 timestamp);
    event StalenessThresholdUpdated(bytes32 indexed basketId, uint256 oldThreshold, uint256 newThreshold);
    event DeviationThresholdUpdated(bytes32 indexed basketId, uint256 oldThreshold, uint256 newThreshold);

    error StalePrice(bytes32 basketId, uint256 age, uint256 threshold);
    error DeviationTooHigh(bytes32 basketId, uint256 currentNav, uint256 newNav, uint256 deviationBps);
    error InvalidNav(bytes32 basketId);
    error InvalidThreshold(bytes32 basketId);

    function getNAV(bytes32 basketId) external view returns (uint256 nav, uint256 timestamp);

    function getObservation(bytes32 basketId) external view returns (NAVObservation memory observation);

    function updateNAV(bytes32 basketId, uint256 newNav) external;

    function setStalenessThreshold(bytes32 basketId, uint256 newThreshold) external;

    function setDeviationThreshold(bytes32 basketId, uint256 newThreshold) external;
}