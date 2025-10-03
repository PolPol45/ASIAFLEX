// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title INAVOracleAdapter
 * @notice Interface for NAV oracle adapter with staleness and deviation checks
 */
interface INAVOracleAdapter {
    // Events
    event NAVUpdated(uint256 indexed timestamp, uint256 oldNav, uint256 newNav);
    event NAVForceUpdated(
        uint256 indexed timestamp,
        uint256 oldNav,
        uint256 newNav,
        uint256 deviation,
        address indexed updater,
        string reason
    );
    event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event DeviationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // Errors
    error StaleData(uint256 timestamp, uint256 threshold);
    error DeviationTooHigh(uint256 currentNav, uint256 newNav, uint256 deviation);
    error InvalidTimestamp(uint256 timestamp);

    // Core functions
    function getNAV() external view returns (uint256 nav, uint256 timestamp);
    function updateNAV(uint256 newNav) external;
    
    // Configuration
    function setStalenessThreshold(uint256 threshold) external;
    function setDeviationThreshold(uint256 threshold) external;
    function getStalenessThreshold() external view returns (uint256);
    function getDeviationThreshold() external view returns (uint256);
    
    // Status checks
    function isStale() external view returns (bool);
    function isValidUpdate(uint256 newNav) external view returns (bool);
}