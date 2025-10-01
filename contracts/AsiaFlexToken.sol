// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IAsiaFlexToken } from "./interfaces/IAsiaFlexToken.sol";

/**
 * @title AsiaFlexToken
 * @dev Enterprise-grade ERC20 Token with AccessControl, Pausable, EIP712 permit,
 *      supply caps, circuit breakers, and optional blacklist functionality.
 */
contract AsiaFlexToken is
    ERC20,
    ERC20Permit,
    AccessControl,
    Pausable,
    ReentrancyGuard,
    IAsiaFlexToken
{
    // Roles
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CAPS_MANAGER_ROLE = keccak256("CAPS_MANAGER_ROLE");
    bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");

    // Circuit breaker state
    uint256 public maxDailyMint;
    uint256 public maxDailyNetInflows;
    uint256 public lastResetTimestamp;
    uint256 public dailyMintAmount;
    uint256 public dailyNetInflowAmount;

    // Supply management
    uint256 public supplyCap;

    // Blacklist mapping
    mapping(address => bool) private _blacklisted;

    // Legacy compatibility - maintain existing reserves tracking
    uint256 private _reserves;
    uint256 private _price;
    mapping(address => uint256) public pendingRedeems;
    mapping(address => uint256[]) public redeemBlockQueue;

    // Legacy events for compatibility
    event RedeemRequested(address indexed user, uint256 amount);
    event RedeemProcessed(address indexed user, uint256 amount);

    error SupplyCapBelowCurrentSupply(uint256 newCap, uint256 currentSupply);
    error PriceNotAvailable();
    error InsufficientRedeemBalance(address account, uint256 requested, uint256 available);
    error NoPendingRedeem(address account);

    modifier notBlacklisted(address account) {
        if (_blacklisted[account]) {
            revert AccountBlacklisted(account);
        }
        _;
    }

    modifier checkDailyCaps(uint256 amount) {
        _checkAndResetDaily();
        if (dailyMintAmount + amount > maxDailyMint) {
            revert DailyCapsExceeded(amount, maxDailyMint - dailyMintAmount);
        }
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _supplyCap,
        uint256 _maxDailyMint,
        uint256 _maxDailyNetInflows
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(CAPS_MANAGER_ROLE, msg.sender);
        _grantRole(BLACKLIST_MANAGER_ROLE, msg.sender);

        supplyCap = _supplyCap;
        maxDailyMint = _maxDailyMint;
        maxDailyNetInflows = _maxDailyNetInflows;
        lastResetTimestamp = block.timestamp;

        // Initialize legacy state for compatibility
        _reserves = 0;
        _price = 0;
    }

    // -------------------------------------------------------------------------
    // Treasury functions with attestation-based approach
    // Visibility public per consentire invocazioni interne dai wrapper legacy.
    // -------------------------------------------------------------------------
    function mint(
        address to,
        uint256 amount,
        bytes32 attestationHash
    )
        public
        onlyRole(TREASURY_ROLE)
        whenNotPaused
        nonReentrant
        notBlacklisted(to)
        checkDailyCaps(amount)
    {
        if (totalSupply() + amount > supplyCap) {
            revert InsufficientReserves(amount, supplyCap - totalSupply());
        }

        dailyMintAmount += amount;
        _mint(to, amount);
        emit Mint(to, amount, attestationHash);
    }

    function burn(
        address from,
        uint256 amount,
        bytes32 attestationHash
    )
        public
        onlyRole(TREASURY_ROLE)
        whenNotPaused
        nonReentrant
        notBlacklisted(from)
    {
        _checkAndResetDaily();

        // Burning reduces net inflow pressure
        if (dailyNetInflowAmount >= amount) {
            dailyNetInflowAmount -= amount;
        } else {
            dailyNetInflowAmount = 0;
        }

        _burn(from, amount);
        emit Burn(from, amount, attestationHash);
    }

    // -------------------------------------------------------------------------
    // Circuit breaker functions
    // -------------------------------------------------------------------------
    function setMaxDailyMint(uint256 newCap) external onlyRole(CAPS_MANAGER_ROLE) {
        uint256 oldCap = maxDailyMint;
        maxDailyMint = newCap;
        emit DailyCapUpdated(oldCap, newCap);
    }

    function setMaxDailyNetInflows(uint256 newCap) external onlyRole(CAPS_MANAGER_ROLE) {
        uint256 oldCap = maxDailyNetInflows;
        maxDailyNetInflows = newCap;
        emit DailyNetInflowCapUpdated(oldCap, newCap);
    }

    function getRemainingDailyMint() external view returns (uint256) {
        if (_shouldResetDaily()) {
            return maxDailyMint;
        }
        return maxDailyMint > dailyMintAmount ? maxDailyMint - dailyMintAmount : 0;
    }

    function getRemainingDailyNetInflows() external view returns (uint256) {
        if (_shouldResetDaily()) {
            return maxDailyNetInflows;
        }
        return
            maxDailyNetInflows > dailyNetInflowAmount
                ? maxDailyNetInflows - dailyNetInflowAmount
                : 0;
    }

    // -------------------------------------------------------------------------
    // Blacklist functions
    // -------------------------------------------------------------------------
    function setBlacklisted(address account, bool flag)
        external
        onlyRole(BLACKLIST_MANAGER_ROLE)
    {
        _blacklisted[account] = flag;
        // Evento dichiarato in IAsiaFlexToken: (address account, bool isBlacklisted)
        emit BlacklistUpdated(account, flag);
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    // -------------------------------------------------------------------------
    // Pause functions
    // -------------------------------------------------------------------------
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Supply cap management
    // -------------------------------------------------------------------------
    function setSupplyCap(uint256 newCap) external onlyRole(CAPS_MANAGER_ROLE) {
        uint256 currentSupply = totalSupply();
        if (newCap < currentSupply) {
            revert SupplyCapBelowCurrentSupply(newCap, currentSupply);
        }
        supplyCap = newCap;
    }

    // -------------------------------------------------------------------------
    // Legacy compatibility functions - maintain existing interface
    // -------------------------------------------------------------------------
    function mint(address to, uint256 amount) external onlyRole(TREASURY_ROLE) {
        // Convert to new attestation-based approach with empty hash for legacy calls
        mint(to, amount, bytes32(0));
    }

    function mintByUSD(address to, uint256 usdAmount) external onlyRole(TREASURY_ROLE) {
        if (_price == 0) {
            revert PriceNotAvailable();
        }
        uint256 tokenAmount = (usdAmount * 1e18) / _price;
        mint(to, tokenAmount, bytes32(0));
    }

    function burnFrom(address user, uint256 amount) external onlyRole(TREASURY_ROLE) {
        burn(user, amount, bytes32(0));
    }

    function redeemRequest(uint256 amount) external {
        uint256 balance = balanceOf(msg.sender);
        if (balance < amount) {
            revert InsufficientRedeemBalance(msg.sender, amount, balance);
        }
        pendingRedeems[msg.sender] += amount;
        redeemBlockQueue[msg.sender].push(block.number);
        emit RedeemRequested(msg.sender, amount);
    }

    function processRedeem(address user, uint256 /* blockNumber */)
        external
        onlyRole(TREASURY_ROLE)
    {
        uint256 amount = pendingRedeems[user];
        if (amount == 0) {
            revert NoPendingRedeem(user);
        }

        pendingRedeems[user] = 0;
        _burn(user, amount);

        emit RedeemProcessed(user, amount);
    }

    function setReserves(uint256 amount) external onlyRole(TREASURY_ROLE) {
        _reserves = amount;
    }

    function reserves() external view returns (uint256) {
        return _reserves;
    }

    function setPrice(uint256 newPrice) external onlyRole(TREASURY_ROLE) {
        _price = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return _price;
    }

    // -------------------------------------------------------------------------
    // Internal functions
    // -------------------------------------------------------------------------
    function _checkAndResetDaily() internal {
        if (_shouldResetDaily()) {
            lastResetTimestamp = block.timestamp;
            dailyMintAmount = 0;
            dailyNetInflowAmount = 0;
        }
    }

    function _shouldResetDaily() internal view returns (bool) {
        return block.timestamp >= lastResetTimestamp + 1 days;
    }

    // -------------------------------------------------------------------------
    // Transfer override: include blacklist and pause checks
    // -------------------------------------------------------------------------
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        if (from != address(0)) {
            if (_blacklisted[from]) revert AccountBlacklisted(from);
        }
        if (to != address(0)) {
            if (_blacklisted[to]) revert AccountBlacklisted(to);
        }
        super._update(from, to, value);
    }

    // -------------------------------------------------------------------------
    // ERC165 support (AccessControl)
    // -------------------------------------------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
