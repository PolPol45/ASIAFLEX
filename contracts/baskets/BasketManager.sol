// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { BasketToken } from "../BasketToken.sol";
import { INAVOracleAdapter } from "../interfaces/INAVOracleAdapter.sol";

/**
 * @title BasketManager
 * @notice Governs BasketToken issuance and enforces per-basket operational controls.
 */
contract BasketManager is AccessControlDefaultAdminRules, Pausable, ReentrancyGuard {
    bytes32 public constant GOV_ROLE = keccak256("GOV_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");

    struct BasketLimits {
        uint256 dailyMintCap;
        uint256 dailyNetInflowCap;
        uint256 totalCap;
    }

    struct BasketState {
        uint256 lastDay;
        uint256 mintedToday;
        int256 netInflowToday;
        bool paused;
    }

    struct BasketRecord {
        BasketToken token;
        BasketLimits limits;
        BasketState state;
        bool exists;
    }

    error BasketAlreadyRegistered(bytes32 basketId);
    error BasketNotFound(bytes32 basketId);
    error BasketPaused(bytes32 basketId);
    error InvalidAddress();
    error InvalidAmount();
    error NavUnavailable(bytes32 basketId);
    error NavStale(bytes32 basketId, uint256 age, uint256 threshold);
    error DailyMintCapExceeded(bytes32 basketId, uint256 requested, uint256 remaining);
    error TotalCapExceeded(bytes32 basketId, uint256 supply, uint256 cap);
    error DailyNetInflowExceeded(bytes32 basketId, int256 projected, uint256 limit);

    event BasketRegistered(bytes32 indexed basketId, address indexed basketToken, BasketLimits limits);
    event BasketLimitsUpdated(bytes32 indexed basketId, BasketLimits limits);
    event BasketPauseSet(bytes32 indexed basketId, bool paused);
    event BasketMinted(bytes32 indexed basketId, address indexed to, uint256 shares, uint256 nav);
    event BasketBurned(bytes32 indexed basketId, address indexed from, uint256 shares, uint256 nav);

    INAVOracleAdapter public navOracle;
    mapping(bytes32 => BasketRecord) private _baskets;

    constructor(address admin, uint48 adminDelay, address navOracleAddress)
        AccessControlDefaultAdminRules(adminDelay, admin)
    {
        if (navOracleAddress == address(0)) revert InvalidAddress();
        navOracle = INAVOracleAdapter(navOracleAddress);

        _grantRole(GOV_ROLE, admin);
        _grantRole(CONTROLLER_ROLE, admin);
        _grantRole(ORACLE_MANAGER_ROLE, admin);
    }

    function pause() external onlyRole(GOV_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(GOV_ROLE) {
        _unpause();
    }

    /**
     * @notice Register a BasketToken under management with initial limits.
     * @param basketId Unique basket identifier.
     * @param basketToken Address of the BasketToken ERC-20 implementation.
     * @param limits Initial per-basket limits.
     */
    function registerBasket(bytes32 basketId, address basketToken, BasketLimits calldata limits)
        external
        onlyRole(GOV_ROLE)
    {
        if (basketToken == address(0)) revert InvalidAddress();
        BasketRecord storage record = _baskets[basketId];
        if (record.exists) revert BasketAlreadyRegistered(basketId);

        record.token = BasketToken(basketToken);
        record.limits = limits;
        record.state = BasketState({ lastDay: 0, mintedToday: 0, netInflowToday: 0, paused: false });
        record.exists = true;

        emit BasketRegistered(basketId, basketToken, limits);
    }

    /**
     * @notice Update basket-specific limits.
     * @param basketId Basket identifier.
     * @param limits New per-basket limits.
     */
    function setBasketLimits(bytes32 basketId, BasketLimits calldata limits) external onlyRole(GOV_ROLE) {
        BasketRecord storage record = _requireBasket(basketId);
        record.limits = limits;
        emit BasketLimitsUpdated(basketId, limits);
    }

    /**
     * @notice Pause or resume a basket.
     * @param basketId Basket identifier.
     * @param paused New pause state.
     */
    function setBasketPause(bytes32 basketId, bool paused) external onlyRole(GOV_ROLE) {
        BasketRecord storage record = _requireBasket(basketId);
        record.state.paused = paused;
        emit BasketPauseSet(basketId, paused);
    }

    /**
     * @notice Assign a new NAV oracle adapter.
     * @param newOracle Address of the replacement oracle adapter.
     */
    function setNavOracle(address newOracle) external onlyRole(ORACLE_MANAGER_ROLE) {
        if (newOracle == address(0)) revert InvalidAddress();
        navOracle = INAVOracleAdapter(newOracle);
    }

    /**
     * @notice Quote the number of BasketToken shares minted for a notional amount.
     * @param basketId Basket identifier.
     * @param notional Base notional scaled to 1e18.
     * @return shares Quantity of BasketToken shares to mint.
     */
    function quoteMint(bytes32 basketId, uint256 notional) public view returns (uint256 shares) {
        if (notional == 0) revert InvalidAmount();
        uint256 nav = _freshNav(basketId);
        shares = (notional * 1e18) / nav;
    }

    /**
     * @notice Quote the base notional received for burning BasketToken shares.
     * @param basketId Basket identifier.
     * @param shares Quantity of BasketToken shares.
     * @return notional Base notional scaled to 1e18.
     */
    function quoteRedeem(bytes32 basketId, uint256 shares) public view returns (uint256 notional) {
        if (shares == 0) revert InvalidAmount();
        uint256 nav = _freshNav(basketId);
        notional = (shares * nav) / 1e18;
    }

    /**
     * @notice Mint BasketToken shares, enforcing risk limits and NAV freshness.
     * @param basketId Basket identifier.
     * @param to Recipient address.
     * @param shares Quantity of shares to mint.
     */
    function mintBasket(bytes32 basketId, address to, uint256 shares) external onlyRole(CONTROLLER_ROLE) whenNotPaused {
        if (to == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();

        BasketRecord storage record = _requireBasket(basketId);
        _enforceActive(record, basketId);

        BasketState storage state = record.state;
        BasketLimits storage limits = record.limits;

        uint256 currentDay = block.timestamp / 1 days;
        if (state.lastDay != currentDay) {
            state.lastDay = currentDay;
            state.mintedToday = 0;
            state.netInflowToday = 0;
        }

        if (limits.dailyMintCap != 0) {
            uint256 remaining = limits.dailyMintCap - state.mintedToday;
            if (shares > remaining) revert DailyMintCapExceeded(basketId, shares, remaining);
        }

        if (limits.totalCap != 0) {
            uint256 supply = record.token.totalSupply();
            if (supply + shares > limits.totalCap) revert TotalCapExceeded(basketId, supply, limits.totalCap);
        }

        state.mintedToday += shares;
        state.netInflowToday += int256(shares);
        _enforceNetInflow(state.netInflowToday, limits.dailyNetInflowCap, basketId);

        uint256 nav = _freshNav(basketId);
        record.token.mint(to, shares);

        emit BasketMinted(basketId, to, shares, nav);
    }

    /**
     * @notice Burn BasketToken shares, ensuring risk limits remain satisfied.
     * @param basketId Basket identifier.
     * @param from Address holding the shares.
     * @param shares Quantity of shares to burn.
     */
    function burnBasket(bytes32 basketId, address from, uint256 shares)
        external
        onlyRole(CONTROLLER_ROLE)
        whenNotPaused
    {
        if (from == address(0)) revert InvalidAddress();
        if (shares == 0) revert InvalidAmount();

        BasketRecord storage record = _requireBasket(basketId);
        _enforceActive(record, basketId);

        BasketState storage state = record.state;
        BasketLimits storage limits = record.limits;

        uint256 currentDay = block.timestamp / 1 days;
        if (state.lastDay != currentDay) {
            state.lastDay = currentDay;
            state.mintedToday = 0;
            state.netInflowToday = 0;
        }

        state.netInflowToday -= int256(shares);
        _enforceNetInflow(state.netInflowToday, limits.dailyNetInflowCap, basketId);

        uint256 nav = _freshNav(basketId);
        record.token.burn(from, shares);

        emit BasketBurned(basketId, from, shares, nav);
    }

    /**
     * @notice Return the BasketToken address for a basket.
     * @param basketId Basket identifier.
     * @return token Address of the BasketToken contract.
     */
    function basketTokenOf(bytes32 basketId) external view returns (address token) {
        BasketRecord storage record = _requireBasket(basketId);
        token = address(record.token);
    }

    /**
     * @notice Return basket limit configuration.
     * @param basketId Basket identifier.
     * @return limits Basket limit struct.
     */
    function getBasketLimits(bytes32 basketId) external view returns (BasketLimits memory limits) {
        BasketRecord storage record = _requireBasket(basketId);
        limits = record.limits;
    }

    /**
     * @notice Return basket runtime state.
     * @param basketId Basket identifier.
     * @return state Basket state struct.
     */
    function getBasketState(bytes32 basketId) external view returns (BasketState memory state) {
        BasketRecord storage record = _requireBasket(basketId);
        state = record.state;
    }

    /**
     * @notice Check whether a basket is registered.
     * @param basketId Basket identifier.
     * @return exists True if the basket is known.
     */
    function basketExists(bytes32 basketId) external view returns (bool exists) {
        exists = _baskets[basketId].exists;
    }

    function _freshNav(bytes32 basketId) private view returns (uint256 nav) {
        INAVOracleAdapter.NAVObservation memory observation = navOracle.getObservation(basketId);
        nav = observation.nav;
        if (nav == 0) revert NavUnavailable(basketId);
        if (observation.timestamp == 0) revert NavUnavailable(basketId);
        if (observation.stalenessThreshold != 0) {
            uint256 age = block.timestamp - observation.timestamp;
            if (age > observation.stalenessThreshold) {
                revert NavStale(basketId, age, observation.stalenessThreshold);
            }
        }
    }

    function _enforceNetInflow(int256 netInflow, uint256 limit, bytes32 basketId) private pure {
        if (limit == 0) return;
        int256 cap = int256(limit);
        if (netInflow > cap || netInflow < -cap) {
            revert DailyNetInflowExceeded(basketId, netInflow, limit);
        }
    }

    function _requireBasket(bytes32 basketId) private view returns (BasketRecord storage record) {
        record = _baskets[basketId];
        if (!record.exists) revert BasketNotFound(basketId);
    }

    function _enforceActive(BasketRecord storage record, bytes32 basketId) private view {
        if (record.state.paused) revert BasketPaused(basketId);
    }
}
