// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ProofOfReserve
 * @dev Tiene traccia delle riserve riportate on-chain dall'owner (oracolo).
 */
contract ProofOfReserve {
    uint256 public reserveUSD;
    address public owner;

    event ReserveUpdated(uint256 oldReserveUSD, uint256 newReserveUSD);

    error NotAuthorized(address caller, address expectedOwner);

    constructor() {
        owner = msg.sender;
    }

    function setReserve(uint256 amount) external {
        if (msg.sender != owner) {
            revert NotAuthorized(msg.sender, owner);
        }
        uint256 previousReserve = reserveUSD;
        reserveUSD = amount;
        emit ReserveUpdated(previousReserve, amount);
    }

    function getReserve() external view returns (uint256) {
        return reserveUSD;
    }
}
