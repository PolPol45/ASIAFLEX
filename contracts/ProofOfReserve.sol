// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ProofOfReserve
 * @dev Enhanced reserve tracking with proper access control, events, and error handling
 * @notice Tracks off-chain reserve balances with on-chain attestation
 */
contract ProofOfReserve is AccessControl, Pausable {
    /// @notice Role for addresses that can update reserves
    bytes32 public constant RESERVE_UPDATER_ROLE = keccak256("RESERVE_UPDATER_ROLE");
    
    /// @notice Role for addresses that can manage the contract
    bytes32 public constant RESERVE_MANAGER_ROLE = keccak256("RESERVE_MANAGER_ROLE");

    /// @notice Current reserve amount in USD (scaled by 1e18)
    uint256 public reserveUSD;
    
    /// @notice Last update timestamp
    uint256 public lastUpdateTimestamp;
    
    /// @notice Reserve attestation hash for cryptographic proof
    bytes32 public lastAttestationHash;

    /// @notice Maximum allowed deviation between updates (in basis points, 10000 = 100%)
    uint256 public maxDeviationBps;

    // Events
    event ReserveUpdated(
        uint256 indexed timestamp,
        uint256 oldReserve,
        uint256 newReserve,
        bytes32 attestationHash,
        address indexed updater
    );
    
    event MaxDeviationUpdated(uint256 oldDeviation, uint256 newDeviation);
    
    event ReserveUpdateFailed(
        uint256 indexed timestamp,
        uint256 attemptedReserve,
        uint256 currentReserve,
        string reason,
        address indexed updater
    );

    // Custom Errors
    error ZeroAddress();
    error InvalidAmount(uint256 amount);
    error DeviationTooHigh(uint256 currentReserve, uint256 newReserve, uint256 deviation);
    error InvalidAttestationHash();
    error UnauthorizedAccess(address caller);

    constructor(uint256 _maxDeviationBps) {
        if (_maxDeviationBps == 0 || _maxDeviationBps > 10000) {
            revert InvalidAmount(_maxDeviationBps);
        }
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RESERVE_UPDATER_ROLE, msg.sender);
        _grantRole(RESERVE_MANAGER_ROLE, msg.sender);
        
        maxDeviationBps = _maxDeviationBps;
        lastUpdateTimestamp = block.timestamp;
    }

    /**
     * @notice Update reserve amount with attestation
     * @param amount New reserve amount in USD (scaled by 1e18)
     * @param attestationHash Hash of the off-chain reserve attestation
     */
    function setReserve(uint256 amount, bytes32 attestationHash) 
        external 
        onlyRole(RESERVE_UPDATER_ROLE) 
        whenNotPaused 
    {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }
        
        if (attestationHash == bytes32(0)) {
            revert InvalidAttestationHash();
        }

        // Check deviation if we have a previous reserve
        if (reserveUSD > 0) {
            uint256 deviation = _calculateDeviation(reserveUSD, amount);
            if (deviation > maxDeviationBps) {
                emit ReserveUpdateFailed(
                    block.timestamp,
                    amount,
                    reserveUSD,
                    "Deviation too high",
                    msg.sender
                );
                revert DeviationTooHigh(reserveUSD, amount, deviation);
            }
        }

        uint256 oldReserve = reserveUSD;
        reserveUSD = amount;
        lastUpdateTimestamp = block.timestamp;
        lastAttestationHash = attestationHash;

        emit ReserveUpdated(
            block.timestamp,
            oldReserve,
            amount,
            attestationHash,
            msg.sender
        );
    }

    /**
     * @notice Force update reserve bypassing deviation check (emergency use)
     * @param amount New reserve amount
     * @param attestationHash Hash of the off-chain reserve attestation
     * @param reason Reason for forced update
     */
    function forceSetReserve(
        uint256 amount,
        bytes32 attestationHash,
        string calldata reason
    ) 
        external 
        onlyRole(RESERVE_MANAGER_ROLE) 
        whenNotPaused 
    {
        if (amount == 0) {
            revert InvalidAmount(amount);
        }
        
        if (attestationHash == bytes32(0)) {
            revert InvalidAttestationHash();
        }

        uint256 oldReserve = reserveUSD;
        reserveUSD = amount;
        lastUpdateTimestamp = block.timestamp;
        lastAttestationHash = attestationHash;

        emit ReserveUpdated(
            block.timestamp,
            oldReserve,
            amount,
            attestationHash,
            msg.sender
        );
        
        // Log the forced update reason
        emit ReserveUpdateFailed(
            block.timestamp,
            amount,
            oldReserve,
            reason,
            msg.sender
        );
    }

    /**
     * @notice Update maximum allowed deviation
     * @param _maxDeviationBps New maximum deviation in basis points
     */
    function setMaxDeviation(uint256 _maxDeviationBps) 
        external 
        onlyRole(RESERVE_MANAGER_ROLE) 
    {
        if (_maxDeviationBps == 0 || _maxDeviationBps > 10000) {
            revert InvalidAmount(_maxDeviationBps);
        }
        
        uint256 oldDeviation = maxDeviationBps;
        maxDeviationBps = _maxDeviationBps;
        
        emit MaxDeviationUpdated(oldDeviation, _maxDeviationBps);
    }

    /**
     * @notice Pause reserve updates
     */
    function pause() external onlyRole(RESERVE_MANAGER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause reserve updates
     */
    function unpause() external onlyRole(RESERVE_MANAGER_ROLE) {
        _unpause();
    }

    /**
     * @notice Get current reserve information
     * @return reserve Current reserve amount
     * @return timestamp Last update timestamp
     * @return attestationHash Last attestation hash
     */
    function getReserve() 
        external 
        view 
        returns (
            uint256 reserve,
            uint256 timestamp,
            bytes32 attestationHash
        ) 
    {
        return (reserveUSD, lastUpdateTimestamp, lastAttestationHash);
    }

    /**
     * @notice Calculate deviation between two reserve amounts
     * @param currentReserve Current reserve amount
     * @param newReserve New reserve amount
     * @return Deviation in basis points
     */
    function _calculateDeviation(uint256 currentReserve, uint256 newReserve) 
        private 
        pure 
        returns (uint256) 
    {
        if (currentReserve == 0) return 0;
        
        uint256 difference;
        if (newReserve > currentReserve) {
            difference = newReserve - currentReserve;
        } else {
            difference = currentReserve - newReserve;
        }
        
        return (difference * 10000) / currentReserve;
    }
}
