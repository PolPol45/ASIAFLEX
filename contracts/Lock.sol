// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.26;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Lock {
    uint256 public unlockTime;
    address payable public owner;

    event Withdrawal(uint256 amount, uint256 when);

    error UnlockTimeNotInFuture(uint256 provided, uint256 currentTime);
    error UnlockTimeNotReached(uint256 unlockTime, uint256 currentTime);
    error NotLockOwner(address caller, address owner);

    constructor(uint256 _unlockTime) payable {
        if (block.timestamp >= _unlockTime) {
            revert UnlockTimeNotInFuture(_unlockTime, block.timestamp);
        }

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        if (block.timestamp < unlockTime) {
            revert UnlockTimeNotReached(unlockTime, block.timestamp);
        }
        if (msg.sender != owner) {
            revert NotLockOwner(msg.sender, owner);
        }

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
