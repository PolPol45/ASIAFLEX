// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title AsiaFlexTimelock
 * @dev Thin wrapper around OpenZeppelin's TimelockController to ensure Hardhat generates an artifact we can deploy.
 */
contract AsiaFlexTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
