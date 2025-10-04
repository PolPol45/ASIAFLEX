// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { INAVOracleAdapter } from "../interfaces/INAVOracleAdapter.sol";

/**
 * @title MockNAVAdapter
 * @notice Lightweight oracle adapter used in tests to provide deterministic NAV data.
 * @dev NAV values are scaled to 1e18. Tests are expected to configure staleness thresholds as needed.
 */
contract MockNAVAdapter is INAVOracleAdapter {
    mapping(bytes32 => NAVObservation) private _observations;

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
    function updateNAV(bytes32 basketId, uint256 newNav) external {
        if (newNav == 0) revert InvalidNav(basketId);
    NAVObservation storage observation = _observations[basketId];
    uint256 oldNav = observation.nav;
    observation.nav = newNav;
    observation.timestamp = block.timestamp;
    emit NAVUpdated(basketId, oldNav, newNav, block.timestamp);
    }

    /// @inheritdoc INAVOracleAdapter
    function setStalenessThreshold(bytes32 basketId, uint256 newThreshold) external {
        NAVObservation storage observation = _observations[basketId];
        uint256 oldThreshold = observation.stalenessThreshold;
        observation.stalenessThreshold = newThreshold;
        emit StalenessThresholdUpdated(basketId, oldThreshold, newThreshold);
    }

    /// @inheritdoc INAVOracleAdapter
    function setDeviationThreshold(bytes32 basketId, uint256 newThreshold) external {
        if (newThreshold > 10_000) revert InvalidThreshold(basketId);
        NAVObservation storage observation = _observations[basketId];
        uint256 oldThreshold = observation.deviationThreshold;
        observation.deviationThreshold = newThreshold;
        emit DeviationThresholdUpdated(basketId, oldThreshold, newThreshold);
    }
}