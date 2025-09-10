// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITreasuryController
 * @notice Interface for treasury controller managing mint/redeem flows
 */
interface ITreasuryController {
    // Structs
    struct MintRequest {
        address to;
        uint256 amount;
        uint256 timestamp;
        bytes32 reserveHash;
    }

    struct RedeemRequest {
        address from;
        uint256 amount;
        uint256 timestamp;
        bytes32 reserveHash;
    }

    // Events
    event MintExecuted(address indexed to, uint256 amount, bytes32 attestationHash);
    event RedeemExecuted(address indexed from, uint256 amount, bytes32 attestationHash);
    event TreasurySignerUpdated(address indexed oldSigner, address indexed newSigner);
    event RequestExpirationUpdated(uint256 oldExpiration, uint256 newExpiration);

    // Errors
    error InvalidSignature(bytes signature, bytes32 hash);
    error RequestExpired(uint256 timestamp, uint256 expiration);
    error InvalidReserveAttestation(bytes32 provided, bytes32 expected);

    // Core functions
    function executeMint(
        MintRequest calldata request,
        bytes calldata signature
    ) external;
    
    function executeRedeem(
        RedeemRequest calldata request,
        bytes calldata signature
    ) external;
    
    // Configuration
    function setTreasurySigner(address newSigner) external;
    function setRequestExpiration(uint256 newExpiration) external;
    function getTreasurySigner() external view returns (address);
    function getRequestExpiration() external view returns (uint256);
    
    // Verification
    function verifyMintSignature(
        MintRequest calldata request,
        bytes calldata signature
    ) external view returns (bool);
    
    function verifyRedeemSignature(
        RedeemRequest calldata request,
        bytes calldata signature
    ) external view returns (bool);
}