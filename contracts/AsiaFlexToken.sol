// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AsiaFlexToken
 * @dev ERC20 Token with Mint, Burn, Proof of Reserve and external price feed (oracle).
 */
contract AsiaFlexToken is ERC20, Ownable {
    uint256 private _reserves;
    uint256 private _price; // Prezzo di riferimento (es. AAXJ in USD scaled 1e18)

    mapping(address => uint256) public pendingRedeems;
    mapping(address => uint256[]) public redeemBlockQueue;

    event RedeemRequested(address indexed user, uint256 amount);
    event RedeemProcessed(address indexed user, uint256 amount);

    constructor() ERC20("AsiaFlexToken", "AFX") {
        _transferOwnership(msg.sender); // imposta l'owner al deployer
        _reserves = 0;
        _price = 0;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(amount <= _reserves, "Insufficient reserves");
        _mint(to, amount);
        _reserves -= amount;
    }

    function mintByUSD(address to, uint256 usdAmount) external onlyOwner {
        require(_price > 0, "Price not set");
        uint256 tokenAmount = (usdAmount * 1e18) / _price;
        require(tokenAmount <= _reserves, "Insufficient reserves");
        _mint(to, tokenAmount);
        _reserves -= tokenAmount;
    }

    // 🔥 Solo l'owner può bruciare i token in possesso dell'utente per specifici blocchi
    function burnFrom(address user, uint256 amount) external onlyOwner {
        _burn(user, amount);
    }

    // ✋ L'utente richiede il redeem (ma non brucia direttamente)
    function redeemRequest(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        pendingRedeems[msg.sender] += amount;
        redeemBlockQueue[msg.sender].push(block.number);
        emit RedeemRequested(msg.sender, amount);
    }

    // ✅ L'owner processa e brucia il token per richieste effettuate a un determinato blocco
    function processRedeem(address user, uint256 blockNumber) external onlyOwner {
        require(redeemBlockQueue[user].length > 0, "No redeem requests");
        require(redeemBlockQueue[user][0] == blockNumber, "Redeem not for this block");

        uint256 amount = pendingRedeems[user];
        require(amount > 0, "Nothing to redeem");

        // Rimuove il blocco dalla coda
        for (uint256 i = 0; i < redeemBlockQueue[user].length - 1; i++) {
            redeemBlockQueue[user][i] = redeemBlockQueue[user][i + 1];
        }
        redeemBlockQueue[user].pop();

        pendingRedeems[user] = 0;
        _burn(user, amount);
        emit RedeemProcessed(user, amount);
    }

    function setReserves(uint256 amount) external onlyOwner {
        _reserves = amount;
    }

    function reserves() external view returns (uint256) {
        return _reserves;
    }

    function setPrice(uint256 newPrice) external onlyOwner {
        _price = newPrice;
    }

    function getPrice() external view returns (uint256) {
        return _price;
    }   
}

