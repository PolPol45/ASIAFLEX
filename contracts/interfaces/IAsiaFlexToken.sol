// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IAsiaFlexToken
 * @notice Interface for the AsiaFlex Token with treasury controls
 */
interface IAsiaFlexToken {
    // Events
    event Mint(address indexed to, uint256 amount, bytes32 attestationHash);
    event Burn(address indexed from, uint256 amount, bytes32 attestationHash);
    event DailyCapUpdated(uint256 oldCap, uint256 newCap);
    event DailyNetInflowCapUpdated(uint256 oldCap, uint256 newCap);
    event BlacklistUpdated(address indexed account, bool isBlacklisted);

    // Errors
    error InsufficientReserves(uint256 requested, uint256 available);
    error DailyCapsExceeded(uint256 requested, uint256 remaining);
    error InvalidAttestation(bytes32 provided, bytes32 expected);
    error AccountBlacklisted(address account);
    error AttestationRequired(address caller);
    error DailyNetInflowExceeded(uint256 requested, uint256 remaining);

    // Treasury functions
    function mint(address to, uint256 amount, bytes32 attestationHash) external;
    function burn(address from, uint256 amount, bytes32 attestationHash) external;
    
    // Circuit breaker functions
    function setMaxDailyMint(uint256 newCap) external;
    function setMaxDailyNetInflows(uint256 newCap) external;
    function getRemainingDailyMint() external view returns (uint256);
    function getRemainingDailyNetInflows() external view returns (uint256);
    function getRedeemQueueLength(address account) external view returns (uint256);
    
    // Blacklist functions
    function setBlacklisted(address account, bool blacklisted) external;
    function isBlacklisted(address account) external view returns (bool);
}