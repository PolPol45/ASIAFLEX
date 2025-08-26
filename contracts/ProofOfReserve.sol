// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProofOfReserve
 * @dev Tiene traccia delle riserve riportate on-chain dall'owner (oracolo).
 */
contract ProofOfReserve {
    uint256 public reserveUSD;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function setReserve(uint256 amount) external {
        require(msg.sender == owner, "Not authorized");
        reserveUSD = amount;
    }

    function getReserve() external view returns (uint256) {
        return reserveUSD;
    }
}
