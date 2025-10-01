// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title AsiaFlexTimelock
 * @dev TimelockController for AsiaFlex governance with 24h delay
 * @notice Provides time-delayed execution for critical parameter changes
 * 
 * Security features:
 * - 24-hour minimum delay for all operations
 * - Multi-signature proposers required
 * - Executor role separation
 * - Emergency cancellation capability
 */
contract AsiaFlexTimelock is TimelockController {
    /// @notice Minimum delay of 24 hours (86400 seconds)
    uint256 public constant MIN_DELAY = 24 hours;
    
    /**
     * @dev Constructor for AsiaFlexTimelock
     * @param proposers Addresses that can propose operations
     * @param executors Addresses that can execute operations after delay
     * @param admin Address with admin role (can grant/revoke roles)
     */
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {}
}
