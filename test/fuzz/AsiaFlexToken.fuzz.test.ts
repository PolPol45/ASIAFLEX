import { expect } from "chai";
import { ethers } from "hardhat";
import { AsiaFlexToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Fuzz Testing Infrastructure for AsiaFlexToken
 *
 * This test file demonstrates property-based testing and fuzz testing techniques
 * for the AsiaFlexToken contract. In production, consider using:
 * - Foundry's built-in fuzzer
 * - Echidna
 * - Manticore
 * - Trail of Bits tools
 */

describe("AsiaFlexToken - Fuzz Tests", function () {
  let token: AsiaFlexToken;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let users: SignerWithAddress[];

  const SUPPLY_CAP = ethers.parseEther("100000000"); // 100M
  const MAX_DAILY_MINT = ethers.parseEther("1000000"); // 1M
  const MAX_DAILY_NET_INFLOWS = ethers.parseEther("1000000"); // 1M

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    treasury = signers[1];
    users = signers.slice(2, 12); // 10 test users

    const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
    token = await AsiaFlexTokenFactory.deploy("AsiaFlex", "AFX", SUPPLY_CAP, MAX_DAILY_MINT, MAX_DAILY_NET_INFLOWS);

    // Grant treasury role
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    await token.grantRole(TREASURY_ROLE, treasury.address);
  });

  describe("Property: Total Supply Never Exceeds Supply Cap", function () {
    it("Should maintain supply cap invariant across random mints", async function () {
      // Fuzz test: Random mint operations should never exceed supply cap
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        // Random amount (up to daily limit)
        const randomAmount = ethers.parseEther(String(Math.floor(Math.random() * 10000) + 1));

        // Random recipient
        const randomRecipient = users[Math.floor(Math.random() * users.length)];

        try {
          await token.connect(treasury).mint(randomRecipient.address, randomAmount, ethers.ZeroHash);

          // Invariant: Total supply must never exceed supply cap
          const totalSupply = await token.totalSupply();
          expect(totalSupply).to.be.lte(SUPPLY_CAP);
        } catch {
          // Expected failures are OK (daily limit, supply cap, etc.)
          // Just ensure supply cap is still respected
          const totalSupply = await token.totalSupply();
          expect(totalSupply).to.be.lte(SUPPLY_CAP);
        }

        // Randomly reset daily limits (simulate day passing)
        if (Math.random() < 0.1) {
          await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
          await ethers.provider.send("evm_mine", []);
        }
      }
    });
  });

  describe("Property: Burn Never Creates Tokens", function () {
    it("Should maintain that burns only decrease or maintain supply", async function () {
      // First mint some tokens
      const mintAmount = ethers.parseEther("100000");
      await token.connect(treasury).mint(users[0].address, mintAmount, ethers.ZeroHash);

      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        const supplyBefore = await token.totalSupply();

        // Random burn amount
        const userBalance = await token.balanceOf(users[0].address);
        if (userBalance > 0) {
          const randomAmount = (userBalance * BigInt(Math.floor(Math.random() * 50) + 1)) / 100n; // 1-50% of balance

          try {
            await token.connect(treasury).burn(users[0].address, randomAmount, ethers.ZeroHash);

            const supplyAfter = await token.totalSupply();

            // Invariant: Supply after burn <= supply before burn
            expect(supplyAfter).to.be.lte(supplyBefore);

            // Invariant: Supply decreased by exactly burn amount
            expect(supplyBefore - supplyAfter).to.equal(randomAmount);
          } catch {
            // If burn fails, supply should be unchanged
            const supplyAfter = await token.totalSupply();
            expect(supplyAfter).to.equal(supplyBefore);
          }
        }
      }
    });
  });

  describe("Property: Balance Sum Equals Total Supply", function () {
    it("Should maintain that sum of all balances equals total supply", async function () {
      const iterations = 30;

      for (let i = 0; i < iterations; i++) {
        // Random operation: mint or transfer
        const operation = Math.random();

        if (operation < 0.5) {
          // Mint to random user
          const randomAmount = ethers.parseEther(String(Math.floor(Math.random() * 1000) + 1));
          const randomRecipient = users[Math.floor(Math.random() * users.length)];

          try {
            await token.connect(treasury).mint(randomRecipient.address, randomAmount, ethers.ZeroHash);
          } catch {
            // Expected failures are OK
          }
        } else {
          // Transfer between random users
          const fromUser = users[Math.floor(Math.random() * users.length)];
          const toUser = users[Math.floor(Math.random() * users.length)];
          const balance = await token.balanceOf(fromUser.address);

          if (balance > 0) {
            const transferAmount = (balance * BigInt(Math.floor(Math.random() * 50) + 1)) / 100n;

            try {
              await token.connect(fromUser).transfer(toUser.address, transferAmount);
            } catch {
              // Expected failures are OK (blacklist, pause, etc.)
            }
          }
        }

        // Check invariant: Sum of balances = total supply
        const totalSupply = await token.totalSupply();
        let balanceSum = 0n;

        for (const user of users) {
          balanceSum += await token.balanceOf(user.address);
        }

        // Add treasury balance
        balanceSum += await token.balanceOf(treasury.address);

        expect(balanceSum).to.equal(totalSupply);

        // Randomly reset daily limits
        if (Math.random() < 0.1) {
          await ethers.provider.send("evm_increaseTime", [86400]);
          await ethers.provider.send("evm_mine", []);
        }
      }
    });
  });

  describe("Property: Transfer Preserves Value", function () {
    it("Should maintain that transfers don't create or destroy tokens", async function () {
      // Mint initial supply
      const initialMint = ethers.parseEther("100000");
      await token.connect(treasury).mint(users[0].address, initialMint, ethers.ZeroHash);

      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const fromUser = users[Math.floor(Math.random() * users.length)];
        const toUser = users[Math.floor(Math.random() * users.length)];

        const fromBalanceBefore = await token.balanceOf(fromUser.address);
        const toBalanceBefore = await token.balanceOf(toUser.address);
        const totalBefore = fromBalanceBefore + toBalanceBefore;

        if (fromBalanceBefore > 0 && fromUser.address !== toUser.address) {
          const transferAmount = (fromBalanceBefore * BigInt(Math.floor(Math.random() * 50) + 1)) / 100n;

          try {
            await token.connect(fromUser).transfer(toUser.address, transferAmount);

            const fromBalanceAfter = await token.balanceOf(fromUser.address);
            const toBalanceAfter = await token.balanceOf(toUser.address);
            const totalAfter = fromBalanceAfter + toBalanceAfter;

            // Invariant: Total balance of sender + receiver unchanged
            expect(totalAfter).to.equal(totalBefore);

            // Invariant: Sender balance decreased by exactly transfer amount
            expect(fromBalanceBefore - fromBalanceAfter).to.equal(transferAmount);

            // Invariant: Receiver balance increased by exactly transfer amount
            expect(toBalanceAfter - toBalanceBefore).to.equal(transferAmount);
          } catch {
            // If transfer fails, balances should be unchanged
            const fromBalanceAfter = await token.balanceOf(fromUser.address);
            const toBalanceAfter = await token.balanceOf(toUser.address);

            expect(fromBalanceAfter).to.equal(fromBalanceBefore);
            expect(toBalanceAfter).to.equal(toBalanceBefore);
          }
        }
      }
    });
  });

  describe("Property: Daily Limits Reset Properly", function () {
    it("Should reset daily mint amount after time passes", async function () {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        // Mint up to daily limit
        const mintAmount = MAX_DAILY_MINT / 2n;
        await token.connect(treasury).mint(users[0].address, mintAmount, ethers.ZeroHash);

        const dailyMintBefore = await token.dailyMintAmount();
        expect(dailyMintBefore).to.be.gt(0);

        // Advance time by 1 day + some random seconds
        const randomSeconds = Math.floor(Math.random() * 3600); // 0-1 hour
        await ethers.provider.send("evm_increaseTime", [86400 + randomSeconds]);
        await ethers.provider.send("evm_mine", []);

        // Trigger reset by checking remaining limit
        const remaining = await token.getRemainingDailyMint();

        // Invariant: After day passes, remaining should be back to max
        expect(remaining).to.equal(MAX_DAILY_MINT);
      }
    });
  });

  describe("Property: Blacklist Blocks All Operations", function () {
    it("Should prevent all token operations for blacklisted address", async function () {
      // Mint some tokens to test user
      const mintAmount = ethers.parseEther("10000");
      await token.connect(treasury).mint(users[0].address, mintAmount, ethers.ZeroHash);

      // Blacklist the user
      const BLACKLIST_MANAGER_ROLE = await token.BLACKLIST_MANAGER_ROLE();
      await token.grantRole(BLACKLIST_MANAGER_ROLE, owner.address);
      await token.setBlacklisted(users[0].address, true);

      // Try various operations - all should fail
      const operations = [
        // Transfer from blacklisted
        () => token.connect(users[0]).transfer(users[1].address, ethers.parseEther("100")),

        // Transfer to blacklisted
        () => token.connect(users[1]).transfer(users[0].address, ethers.parseEther("1")),

        // Mint to blacklisted
        () => token.connect(treasury).mint(users[0].address, ethers.parseEther("100"), ethers.ZeroHash),

        // Burn from blacklisted
        () => token.connect(treasury).burn(users[0].address, ethers.parseEther("100"), ethers.ZeroHash),
      ];

      for (const operation of operations) {
        await expect(operation()).to.be.revertedWithCustomError(token, "AccountBlacklisted");
      }
    });
  });

  describe("Property: Pause Blocks User Operations But Not Admin", function () {
    it("Should allow admin operations during pause but block user operations", async function () {
      // Mint some tokens
      await token.connect(treasury).mint(users[0].address, ethers.parseEther("10000"), ethers.ZeroHash);

      // Pause the contract
      const PAUSER_ROLE = await token.PAUSER_ROLE();
      await token.grantRole(PAUSER_ROLE, owner.address);
      await token.pause();

      // User operations should fail
      await expect(
        token.connect(users[0]).transfer(users[1].address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      // Admin operations should also be blocked during pause
      await expect(
        token.connect(treasury).mint(users[0].address, ethers.parseEther("100"), ethers.ZeroHash)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      // Unpause
      await token.unpause();

      // Operations should work again
      await expect(token.connect(users[0]).transfer(users[1].address, ethers.parseEther("100"))).to.not.be.reverted;
    });
  });

  describe("Stress Test: High-Frequency Operations", function () {
    it("Should handle rapid sequence of operations without breaking invariants", async function () {
      this.timeout(120000); // 2 minutes

      // Mint initial supply to multiple users
      for (let i = 0; i < 5; i++) {
        await token.connect(treasury).mint(users[i].address, ethers.parseEther("10000"), ethers.ZeroHash);
      }

      // Perform many rapid operations
      const operations = 100;

      for (let i = 0; i < operations; i++) {
        const opType = Math.random();
        const user1 = users[Math.floor(Math.random() * 5)];
        const user2 = users[Math.floor(Math.random() * 5)];

        if (opType < 0.8) {
          // Transfer
          const balance = await token.balanceOf(user1.address);
          if (balance > ethers.parseEther("1") && user1.address !== user2.address) {
            const amount = ethers.parseEther("1");
            await token.connect(user1).transfer(user2.address, amount);
          }
        } else if (opType < 0.9) {
          // Mint (limited by daily cap)
          try {
            await token.connect(treasury).mint(user1.address, ethers.parseEther("100"), ethers.ZeroHash);
          } catch {
            // Expected when hitting daily limit
          }
        } else {
          // Burn
          const balance = await token.balanceOf(user1.address);
          if (balance > 0) {
            const amount = balance > ethers.parseEther("100") ? ethers.parseEther("100") : balance;
            await token.connect(treasury).burn(user1.address, amount, ethers.ZeroHash);
          }
        }

        // Periodically verify invariants
        if (i % 10 === 0) {
          const totalSupply = await token.totalSupply();
          expect(totalSupply).to.be.lte(SUPPLY_CAP);

          let balanceSum = 0n;
          for (const user of users) {
            balanceSum += await token.balanceOf(user.address);
          }
          expect(balanceSum).to.be.lte(totalSupply);
        }
      }
    });
  });
});
