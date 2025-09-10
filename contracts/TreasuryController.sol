// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/ITreasuryController.sol";
import "./interfaces/IAsiaFlexToken.sol";

/**
 * @title TreasuryController
 * @dev Controls mint/redeem flows with signed attestations for reserve validation
 */
contract TreasuryController is AccessControl, Pausable, EIP712, ITreasuryController {
    using ECDSA for bytes32;

    bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
    
    // Type hashes for EIP712
    bytes32 private constant MINT_REQUEST_TYPEHASH = keccak256(
        "MintRequest(address to,uint256 amount,uint256 timestamp,bytes32 reserveHash)"
    );
    
    bytes32 private constant REDEEM_REQUEST_TYPEHASH = keccak256(
        "RedeemRequest(address from,uint256 amount,uint256 timestamp,bytes32 reserveHash)"
    );

    // Configuration
    address public treasurySigner;
    uint256 public requestExpiration; // seconds
    IAsiaFlexToken public immutable asiaFlexToken;

    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedRequests;

    constructor(
        address _asiaFlexToken,
        address _treasurySigner,
        uint256 _requestExpiration
    ) EIP712("TreasuryController", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_MANAGER_ROLE, msg.sender);

        asiaFlexToken = IAsiaFlexToken(_asiaFlexToken);
        treasurySigner = _treasurySigner;
        requestExpiration = _requestExpiration;
    }

    function executeMint(
        MintRequest calldata request,
        bytes calldata signature
    ) external whenNotPaused {
        // Check request expiration
        if (block.timestamp > request.timestamp + requestExpiration) {
            revert RequestExpired(request.timestamp, requestExpiration);
        }

        // Verify signature
        if (!verifyMintSignature(request, signature)) {
            bytes32 structHash = _hashMintRequest(request);
            revert InvalidSignature(signature, structHash);
        }

        // Prevent replay attacks
        bytes32 requestHash = keccak256(abi.encode(request, signature));
        if (usedRequests[requestHash]) {
            revert InvalidSignature(signature, requestHash);
        }
        usedRequests[requestHash] = true;

        // Execute mint with attestation hash
        asiaFlexToken.mint(request.to, request.amount, request.reserveHash);

        emit MintExecuted(request.to, request.amount, request.reserveHash);
    }

    function executeRedeem(
        RedeemRequest calldata request,
        bytes calldata signature
    ) external whenNotPaused {
        // Check request expiration
        if (block.timestamp > request.timestamp + requestExpiration) {
            revert RequestExpired(request.timestamp, requestExpiration);
        }

        // Verify signature
        if (!verifyRedeemSignature(request, signature)) {
            bytes32 structHash = _hashRedeemRequest(request);
            revert InvalidSignature(signature, structHash);
        }

        // Prevent replay attacks
        bytes32 requestHash = keccak256(abi.encode(request, signature));
        if (usedRequests[requestHash]) {
            revert InvalidSignature(signature, requestHash);
        }
        usedRequests[requestHash] = true;

        // Execute burn with attestation hash
        asiaFlexToken.burn(request.from, request.amount, request.reserveHash);

        emit RedeemExecuted(request.from, request.amount, request.reserveHash);
    }

    function setTreasurySigner(address newSigner) external onlyRole(TREASURY_MANAGER_ROLE) {
        address oldSigner = treasurySigner;
        treasurySigner = newSigner;
        emit TreasurySignerUpdated(oldSigner, newSigner);
    }

    function setRequestExpiration(uint256 newExpiration) external onlyRole(TREASURY_MANAGER_ROLE) {
        uint256 oldExpiration = requestExpiration;
        requestExpiration = newExpiration;
        emit RequestExpirationUpdated(oldExpiration, newExpiration);
    }

    function getTreasurySigner() external view returns (address) {
        return treasurySigner;
    }

    function getRequestExpiration() external view returns (uint256) {
        return requestExpiration;
    }

    function verifyMintSignature(
        MintRequest calldata request,
        bytes calldata signature
    ) public view returns (bool) {
        bytes32 structHash = _hashMintRequest(request);
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        return signer == treasurySigner;
    }

    function verifyRedeemSignature(
        RedeemRequest calldata request,
        bytes calldata signature
    ) public view returns (bool) {
        bytes32 structHash = _hashRedeemRequest(request);
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        return signer == treasurySigner;
    }

    function pause() external onlyRole(TREASURY_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(TREASURY_MANAGER_ROLE) {
        _unpause();
    }

    // Emergency functions
    function emergencyMint(
        address to,
        uint256 amount,
        bytes32 attestationHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        asiaFlexToken.mint(to, amount, attestationHash);
        emit MintExecuted(to, amount, attestationHash);
    }

    function emergencyBurn(
        address from,
        uint256 amount,
        bytes32 attestationHash
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused {
        asiaFlexToken.burn(from, amount, attestationHash);
        emit RedeemExecuted(from, amount, attestationHash);
    }

    // Internal functions
    function _hashMintRequest(MintRequest calldata request) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            MINT_REQUEST_TYPEHASH,
            request.to,
            request.amount,
            request.timestamp,
            request.reserveHash
        ));
    }

    function _hashRedeemRequest(RedeemRequest calldata request) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            REDEEM_REQUEST_TYPEHASH,
            request.from,
            request.amount,
            request.timestamp,
            request.reserveHash
        ));
    }

    // View functions for debugging/monitoring
    function getMintRequestHash(MintRequest calldata request) external view returns (bytes32) {
        bytes32 structHash = _hashMintRequest(request);
        return _hashTypedDataV4(structHash);
    }

    function getRedeemRequestHash(RedeemRequest calldata request) external view returns (bytes32) {
        bytes32 structHash = _hashRedeemRequest(request);
        return _hashTypedDataV4(structHash);
    }

    function isRequestUsed(MintRequest calldata request, bytes calldata signature) external view returns (bool) {
        bytes32 requestHash = keccak256(abi.encode(request, signature));
        return usedRequests[requestHash];
    }

    function isRedeemRequestUsed(RedeemRequest calldata request, bytes calldata signature) external view returns (bool) {
        bytes32 requestHash = keccak256(abi.encode(request, signature));
        return usedRequests[requestHash];
    }
}