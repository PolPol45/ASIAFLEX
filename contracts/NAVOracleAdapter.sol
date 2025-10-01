// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { INAVOracleAdapter } from "./interfaces/INAVOracleAdapter.sol";

/**
 * @title NAVOracleAdapter
 * @dev Oracle adapter for NAV data with staleness and deviation protection
 */
contract NAVOracleAdapter is AccessControl, Pausable, INAVOracleAdapter {
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");

    // NAV data
    uint256 private _currentNAV;
    uint256 private _lastUpdateTimestamp;

    // Configuration
    uint256 public stalenessThreshold; // seconds
    uint256 public deviationThreshold; // basis points (10000 = 100%)

    constructor(
        uint256 _initialNAV,
        uint256 _stalenessThreshold,
        uint256 _deviationThreshold
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_UPDATER_ROLE, msg.sender);
        _grantRole(ORACLE_MANAGER_ROLE, msg.sender);

        _currentNAV = _initialNAV;
        _lastUpdateTimestamp = block.timestamp;
        stalenessThreshold = _stalenessThreshold;
        deviationThreshold = _deviationThreshold;

        emit NAVUpdated(block.timestamp, 0, _initialNAV);
    }

    function getNAV() external view returns (uint256 nav, uint256 timestamp) {
        return (_currentNAV, _lastUpdateTimestamp);
    }

    function updateNAV(uint256 newNav) external onlyRole(ORACLE_UPDATER_ROLE) whenNotPaused {
        if (newNav == 0) {
            revert InvalidTimestamp(newNav);
        }

        // Check deviation if we have a previous NAV
        if (_currentNAV > 0 && !isValidUpdate(newNav)) {
            uint256 deviation = _calculateDeviation(_currentNAV, newNav);
            revert DeviationTooHigh(_currentNAV, newNav, deviation);
        }

        uint256 oldNav = _currentNAV;
        _currentNAV = newNav;
        _lastUpdateTimestamp = block.timestamp;

        emit NAVUpdated(block.timestamp, oldNav, newNav);
    }

    function setStalenessThreshold(uint256 threshold) external onlyRole(ORACLE_MANAGER_ROLE) {
        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = threshold;
        emit StalenessThresholdUpdated(oldThreshold, threshold);
    }

    function setDeviationThreshold(uint256 threshold) external onlyRole(ORACLE_MANAGER_ROLE) {
        if (threshold > 10000) {
            revert DeviationThresholdTooHigh(threshold);
        }
        uint256 oldThreshold = deviationThreshold;
        deviationThreshold = threshold;
        emit DeviationThresholdUpdated(oldThreshold, threshold);
    }

    function getStalenessThreshold() external view returns (uint256) {
        return stalenessThreshold;
    }

    function getDeviationThreshold() external view returns (uint256) {
        return deviationThreshold;
    }

    function isStale() external view returns (bool) {
        return block.timestamp > _lastUpdateTimestamp + stalenessThreshold;
    }

    function isValidUpdate(uint256 newNav) public view returns (bool) {
        if (_currentNAV == 0) return true; // First update is always valid
        
        uint256 deviation = _calculateDeviation(_currentNAV, newNav);
        return deviation <= deviationThreshold;
    }

    function pause() external onlyRole(ORACLE_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ORACLE_MANAGER_ROLE) {
        _unpause();
    }

    function forceUpdateNAV(uint256 newNav) external onlyRole(ORACLE_MANAGER_ROLE) {
        // Emergency function to update NAV bypassing deviation checks
        uint256 oldNav = _currentNAV;
        _currentNAV = newNav;
        _lastUpdateTimestamp = block.timestamp;

        emit NAVUpdated(block.timestamp, oldNav, newNav);
    }

    function _calculateDeviation(uint256 currentValue, uint256 newValue) internal pure returns (uint256) {
        if (currentValue == 0) return 0;
        
        uint256 difference = currentValue > newValue ? 
                           currentValue - newValue : 
                           newValue - currentValue;
        
        return (difference * 10000) / currentValue; // Return in basis points
    }

    function getCurrentDeviation(uint256 newNav) external view returns (uint256) {
        return _calculateDeviation(_currentNAV, newNav);
    }

    function getTimeSinceLastUpdate() external view returns (uint256) {
        return block.timestamp - _lastUpdateTimestamp;
    }
}