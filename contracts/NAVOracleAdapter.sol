// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import { INAVOracleAdapter } from "./interfaces/INAVOracleAdapter.sol";

/**
 * @title NAVOracleAdapter
 * @notice Stores per-basket NAV observations with configurable staleness and deviation thresholds.
 */
contract NAVOracleAdapter is AccessControlDefaultAdminRules, INAVOracleAdapter {
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");

    uint256 private constant BASIS_POINTS_DENOMINATOR = 10_000;

    mapping(bytes32 => NAVObservation) private _observations;

    constructor(address admin) AccessControlDefaultAdminRules(uint48(1 days), admin) {
        _grantRole(ORACLE_UPDATER_ROLE, admin);
        _grantRole(ORACLE_MANAGER_ROLE, admin);
    }

    /// @inheritdoc INAVOracleAdapter
    function getNAV(bytes32 basketId) external view returns (uint256 nav, uint256 timestamp) {
        NAVObservation memory observation = _observations[basketId];
        return (observation.nav, observation.timestamp);
    }

    /// @inheritdoc INAVOracleAdapter
    function getObservation(bytes32 basketId) external view returns (NAVObservation memory observation) {
        return _observations[basketId];
    }

    /// @inheritdoc INAVOracleAdapter
    function updateNAV(bytes32 basketId, uint256 newNav) external onlyRole(ORACLE_UPDATER_ROLE) {
        if (newNav == 0) revert InvalidNav(basketId);

        NAVObservation storage observation = _observations[basketId];
        if (observation.nav != 0 && observation.deviationThreshold != 0) {
            uint256 deviation = _calculateDeviation(observation.nav, newNav);
            if (deviation > observation.deviationThreshold) {
                revert DeviationTooHigh(basketId, observation.nav, newNav, deviation);
            }
        }

        uint256 oldNav = observation.nav;
        observation.nav = newNav;
        observation.timestamp = block.timestamp;

        emit NAVUpdated(basketId, oldNav, newNav, block.timestamp);
    }

    /// @inheritdoc INAVOracleAdapter
    function setStalenessThreshold(bytes32 basketId, uint256 newThreshold) external onlyRole(ORACLE_MANAGER_ROLE) {
        NAVObservation storage observation = _observations[basketId];
        uint256 oldThreshold = observation.stalenessThreshold;
        observation.stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(basketId, oldThreshold, newThreshold);
    }

    /// @inheritdoc INAVOracleAdapter
    function setDeviationThreshold(bytes32 basketId, uint256 newThreshold) external onlyRole(ORACLE_MANAGER_ROLE) {
        if (newThreshold > BASIS_POINTS_DENOMINATOR) revert InvalidThreshold(basketId);
        NAVObservation storage observation = _observations[basketId];
        uint256 oldThreshold = observation.deviationThreshold;
        observation.deviationThreshold = newThreshold;
        emit DeviationThresholdUpdated(basketId, oldThreshold, newThreshold);
    }

    function _calculateDeviation(uint256 currentNav, uint256 newNav) private pure returns (uint256) {
        if (currentNav == 0) return 0;
        uint256 difference = currentNav > newNav ? currentNav - newNav : newNav - currentNav;
        return (difference * BASIS_POINTS_DENOMINATOR) / currentNav;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlDefaultAdminRules)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}