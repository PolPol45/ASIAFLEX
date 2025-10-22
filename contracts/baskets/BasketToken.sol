// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BasketToken
 * @dev Thin ERC20 wrapper dedicated to a specific basket/strategy combination.
 *      Minting and burning are restricted to the BasketManager via MANAGER_ROLE.
 */
contract BasketToken is ERC20, AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    constructor(string memory name_, string memory symbol_, address manager) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, manager);
        _grantRole(MANAGER_ROLE, manager);
    }

    function mint(address to, uint256 amount) external onlyRole(MANAGER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(MANAGER_ROLE) {
        _burn(from, amount);
    }
}
