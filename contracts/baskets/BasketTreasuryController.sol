// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {
    AccessControlDefaultAdminRules
} from "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { BasketManager } from "./BasketManager.sol";

/**
 * @title BasketTreasuryController
 * @notice Verifies treasury attestations for basket-specific mint and redeem flows.
 */
contract BasketTreasuryController is AccessControlDefaultAdminRules, EIP712, ReentrancyGuard {
    using ECDSA for bytes32;

    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant TREASURY_SIGNER_ROLE = keccak256("TREASURY_SIGNER_ROLE");

    bytes32 private constant MINT_REDEEM_TYPEHASH = keccak256(
        "MintRedeem(bytes32 basketId,address to,uint256 notional,uint256 nav,uint256 deadline,bytes32 proofHash,uint256 nonce)"
    );

    struct MintRedeem {
        bytes32 basketId;
        address to;
        uint256 notional;
        uint256 nav;
        uint256 deadline;
        bytes32 proofHash;
        uint256 nonce;
    }

    BasketManager public immutable basketManager;

    mapping(bytes32 => bool) public usedDigests;

    event MintValidated(
        bytes32 indexed basketId,
        address indexed recipient,
        uint256 notional,
        uint256 nav,
        uint256 shares,
        bytes32 proofHash
    );

    event RedeemValidated(
        bytes32 indexed basketId,
        address indexed account,
        uint256 notional,
        uint256 nav,
        uint256 shares,
        bytes32 proofHash
    );

    error InvalidBasketManager(address manager);
    error InvalidSignature(address expectedSigner, address recoveredSigner);
    error SignatureExpired(uint256 deadline, uint256 currentTimestamp);
    error SignatureAlreadyUsed(bytes32 digest);
    error InvalidRecipient();
    error InvalidNotional();

    constructor(address admin, address manager)
        AccessControlDefaultAdminRules(uint48(1 days), admin)
        EIP712("BasketTreasury", "1")
    {
        if (manager == address(0)) revert InvalidBasketManager(manager);
        basketManager = BasketManager(manager);

        _grantRole(CONTROLLER_ROLE, admin);
        _grantRole(TREASURY_SIGNER_ROLE, admin);
    }

    /**
     * @notice Compute the EIP-712 digest for a mint or redeem request.
     */
    function computeDigest(MintRedeem calldata request) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_REDEEM_TYPEHASH,
                request.basketId,
                request.to,
                request.notional,
                request.nav,
                request.deadline,
                request.proofHash,
                request.nonce
            )
        );
        return _hashTypedDataV4(structHash);
    }

    /**
     * @notice Verify a typed-data signature for the given request.
     */
    function verifySignature(address signer, MintRedeem calldata request, bytes calldata signature)
        public
        view
        returns (bool)
    {
        if (!hasRole(TREASURY_SIGNER_ROLE, signer)) return false;
        bytes32 digest = computeDigest(request);
        address recovered = ECDSA.recover(digest, signature);
        return recovered == signer;
    }

    /**
     * @notice Mint BasketToken shares following a valid treasury attestation.
     */
    function mintWithProof(MintRedeem calldata request, bytes calldata signature, address signer)
        external
        onlyRole(CONTROLLER_ROLE)
        nonReentrant
    {
        _validateRequest(request, signature, signer);

        if (request.to == address(0)) revert InvalidRecipient();
        if (request.notional == 0) revert InvalidNotional();

        uint256 shares = basketManager.quoteMint(request.basketId, request.notional);
        basketManager.mintBasket(request.basketId, request.to, shares);

        emit MintValidated(
            request.basketId,
            request.to,
            request.notional,
            request.nav,
            shares,
            request.proofHash
        );
    }

    /**
     * @notice Burn BasketToken shares following a valid treasury attestation.
     */
    function redeemWithProof(MintRedeem calldata request, bytes calldata signature, address signer)
        external
        onlyRole(CONTROLLER_ROLE)
        nonReentrant
    {
        _validateRequest(request, signature, signer);

        if (request.to == address(0)) revert InvalidRecipient();
        if (request.notional == 0) revert InvalidNotional();

        uint256 shares = basketManager.quoteRedeem(request.basketId, request.notional);
        basketManager.burnBasket(request.basketId, request.to, shares);

        emit RedeemValidated(
            request.basketId,
            request.to,
            request.notional,
            request.nav,
            shares,
            request.proofHash
        );
    }

    function _validateRequest(MintRedeem calldata request, bytes calldata signature, address signer) private {
        if (request.deadline < block.timestamp) {
            revert SignatureExpired(request.deadline, block.timestamp);
        }
        bytes32 digest = computeDigest(request);
        if (!verifySignature(signer, request, signature)) {
            address recovered = ECDSA.recover(digest, signature);
            revert InvalidSignature(signer, recovered);
        }

        if (usedDigests[digest]) revert SignatureAlreadyUsed(digest);
        usedDigests[digest] = true;
    }
}