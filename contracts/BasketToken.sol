// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BasketToken
 * @notice Minimal ERC-20 token representing ownership in a specific basket.
 * @dev Minting and burning are restricted to entities holding the MINTER_ROLE (typically the BasketManager).
 */
contract BasketToken is ERC20, ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 private immutable _tokenDecimals;

    /**
     * @notice Deploy a new BasketToken instance.
     * @param name_ Human-readable token name.
     * @param symbol_ Token ticker symbol.
     * @param decimals_ Custom decimal precision for this token.
     * @param admin Address receiving the DEFAULT_ADMIN_ROLE and initial MINTER_ROLE.
     */
    constructor(string memory name_, string memory symbol_, uint8 decimals_, address admin)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        _tokenDecimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /**
     * @notice Get the decimal precision configured for this token.
     * @return The number of decimals used to represent balances.
     */
    function decimals() public view override returns (uint8) {
        return _tokenDecimals;
    }

    /**
     * @notice Mint new BasketToken shares to a recipient.
     * @param to Address receiving the minted shares.
     * @param amount Quantity of shares to mint.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Burn BasketToken shares from an account.
     * @param from Address from which to burn.
     * @param amount Quantity of shares to burn.
     */
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }
}
