# Testing Strategy

## Overview

AsiaFlex implements a comprehensive testing strategy covering unit tests, integration tests, fork tests, and security-focused testing to ensure robust operation under all conditions.

## Testing Architecture

### Test Categories

```
Testing Pyramid:
    /\
   /  \    E2E Tests (Integration)
  /____\   
 /      \   Contract Tests (Unit)
/________\  Static Analysis (Security)
```

#### Unit Tests
- Individual contract functionality
- Function-level behavior validation
- Edge case handling
- Access control verification

#### Integration Tests
- Multi-contract interactions
- End-to-end user flows
- Cross-contract state consistency
- Oracle integration scenarios

#### Fork Tests
- Mainnet state simulation
- Real-world condition testing
- Gas optimization validation
- External dependency testing

#### Security Tests
- Reentrancy attack prevention
- Access control bypass attempts
- Economic attack simulations
- Circuit breaker validation

## Unit Testing

### AsiaFlexToken Tests

#### Core Functionality
```typescript
describe("AsiaFlexToken", function () {
  let token: AsiaFlexToken;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, treasury, user] = await ethers.getSigners();
    
    const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
    token = await AsiaFlexTokenFactory.deploy(
      "AsiaFlexToken",
      "AFX", 
      ethers.parseEther("1000000"),  // Supply cap
      ethers.parseEther("10000"),    // Daily mint limit
      ethers.parseEther("50000")     // Daily net inflow limit
    );
    
    await token.grantRole(await token.TREASURY_ROLE(), treasury.address);
  });

  describe("Deployment", function () {
    it("Should set correct initial parameters", async function () {
      expect(await token.name()).to.equal("AsiaFlexToken");
      expect(await token.symbol()).to.equal("AFX");
      expect(await token.supplyCap()).to.equal(ethers.parseEther("1000000"));
    });
  });

  describe("Minting", function () {
    it("Should allow treasury to mint within limits", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(token.connect(treasury).mint(user.address, mintAmount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, mintAmount);
      
      expect(await token.balanceOf(user.address)).to.equal(mintAmount);
    });

    it("Should reject minting above daily limit", async function () {
      const exceededAmount = ethers.parseEther("20000");
      
      await expect(token.connect(treasury).mint(user.address, exceededAmount))
        .to.be.revertedWithCustomError(token, "DailyMintExceeded");
    });

    it("Should reject minting above supply cap", async function () {
      const capAmount = ethers.parseEther("1000000");
      
      await expect(token.connect(treasury).mint(user.address, capAmount.add(1)))
        .to.be.revertedWithCustomError(token, "SupplyCapExceeded");
    });
  });

  describe("Circuit Breakers", function () {
    it("Should reset daily limits after 24 hours", async function () {
      const mintAmount = ethers.parseEther("5000");
      
      // Mint near daily limit
      await token.connect(treasury).mint(user.address, mintAmount);
      
      // Fast forward 24 hours
      await network.provider.send("evm_increaseTime", [86400]);
      await network.provider.send("evm_mine");
      
      // Should be able to mint again
      await expect(token.connect(treasury).mint(user.address, mintAmount))
        .to.not.be.reverted;
    });
  });
});
```

### NAVOracleAdapter Tests

#### Price Update Testing
```typescript
describe("NAVOracleAdapter", function () {
  let oracle: NAVOracleAdapter;
  let updater: SignerWithAddress;
  
  beforeEach(async function () {
    [owner, updater] = await ethers.getSigners();
    
    const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
    oracle = await NAVOracleAdapterFactory.deploy(
      ethers.parseEther("100"),  // Initial NAV
      3600,                      // Staleness threshold
      1000                       // Deviation threshold (10%)
    );
    
    await oracle.grantRole(await oracle.ORACLE_UPDATER_ROLE(), updater.address);
  });

  describe("Price Updates", function () {
    it("Should accept valid price updates", async function () {
      const newPrice = ethers.parseEther("105"); // 5% increase
      
      await expect(oracle.connect(updater).updateNAV(newPrice))
        .to.emit(oracle, "NAVUpdated")
        .withArgs(anyValue, ethers.parseEther("100"), newPrice);
      
      expect(await oracle.getCurrentNAV()).to.equal(newPrice);
    });

    it("Should reject updates exceeding deviation threshold", async function () {
      const highPrice = ethers.parseEther("120"); // 20% increase
      
      await expect(oracle.connect(updater).updateNAV(highPrice))
        .to.be.revertedWithCustomError(oracle, "DeviationTooHigh");
    });

    it("Should detect stale prices", async function () {
      // Fast forward past staleness threshold
      await network.provider.send("evm_increaseTime", [7200]); // 2 hours
      await network.provider.send("evm_mine");
      
      expect(await oracle.isStale()).to.be.true;
    });
  });
});
```

### TreasuryController Tests

#### Attestation Verification
```typescript
describe("TreasuryController", function () {
  let treasury: TreasuryController;
  let token: AsiaFlexToken;
  let signer: SignerWithAddress;
  
  beforeEach(async function () {
    // Deploy contracts and setup...
  });

  describe("Attestation Validation", function () {
    it("Should validate correct EIP712 signatures", async function () {
      const mintRequest = {
        to: user.address,
        amount: ethers.parseEther("1000"),
        timestamp: Math.floor(Date.now() / 1000),
        reserveHash: ethers.randomBytes(32)
      };
      
      const signature = await generateMintSignature(mintRequest, signer);
      
      await expect(treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        signature
      )).to.not.be.reverted;
    });

    it("Should reject invalid signatures", async function () {
      const mintRequest = {
        to: user.address,
        amount: ethers.parseEther("1000"),
        timestamp: Math.floor(Date.now() / 1000),
        reserveHash: ethers.randomBytes(32)
      };
      
      const invalidSignature = "0x" + "00".repeat(65);
      
      await expect(treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        invalidSignature
      )).to.be.revertedWithCustomError(treasury, "InvalidSignature");
    });

    it("Should prevent replay attacks", async function () {
      const mintRequest = {
        to: user.address,
        amount: ethers.parseEther("1000"),
        timestamp: Math.floor(Date.now() / 1000),
        reserveHash: ethers.randomBytes(32)
      };
      
      const signature = await generateMintSignature(mintRequest, signer);
      
      // First mint should succeed
      await treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        signature
      );
      
      // Second mint with same signature should fail
      await expect(treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        signature
      )).to.be.revertedWithCustomError(treasury, "RequestAlreadyUsed");
    });
  });
});
```

## Integration Testing

### System Integration Tests

#### End-to-End Mint Flow
```typescript
describe("System Integration", function () {
  let token: AsiaFlexToken;
  let oracle: NAVOracleAdapter;
  let treasury: TreasuryController;
  
  beforeEach(async function () {
    // Deploy and configure full system...
  });

  describe("Complete Mint Flow", function () {
    it("Should handle full mint process", async function () {
      // 1. Update oracle price
      const navPrice = ethers.parseEther("105");
      await oracle.connect(oracleUpdater).updateNAV(navPrice);
      
      // 2. Generate mint attestation
      const mintRequest = {
        to: user.address,
        amount: ethers.parseEther("1000"),
        timestamp: Math.floor(Date.now() / 1000),
        reserveHash: await generateReserveHash()
      };
      
      const signature = await generateMintSignature(mintRequest);
      
      // 3. Execute mint
      await expect(treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        signature
      )).to.emit(token, "Transfer");
      
      // 4. Verify results
      expect(await token.balanceOf(user.address)).to.equal(mintRequest.amount);
      expect(await token.getRemainingDailyMint()).to.be.lt(
        await token.maxDailyMint()
      );
    });
  });

  describe("Circuit Breaker Integration", function () {
    it("Should enforce limits across all operations", async function () {
      const dailyLimit = await token.maxDailyMint();
      const largeAmount = dailyLimit.add(ethers.parseEther("1"));
      
      const mintRequest = {
        to: user.address,
        amount: largeAmount,
        timestamp: Math.floor(Date.now() / 1000),
        reserveHash: await generateReserveHash()
      };
      
      const signature = await generateMintSignature(mintRequest);
      
      await expect(treasury.mint(
        mintRequest.to,
        mintRequest.amount,
        mintRequest.timestamp,
        mintRequest.reserveHash,
        signature
      )).to.be.revertedWithCustomError(token, "DailyMintExceeded");
    });
  });
});
```

## Fork Testing

### Mainnet Fork Tests
```typescript
describe("Fork Tests", function () {
  before(async function () {
    // Reset hardhat network to mainnet fork
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.MAINNET_RPC_URL,
            blockNumber: 18500000 // Recent block
          }
        }
      ]
    });
  });

  describe("Real World Conditions", function () {
    it("Should handle realistic gas prices", async function () {
      // Test with current mainnet gas prices
      const gasPrice = await ethers.provider.getGasPrice();
      console.log(`Current gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
      
      // Execute operations and verify gas usage
      const tx = await token.connect(treasury).mint(
        user.address,
        ethers.parseEther("1000"),
        { gasPrice }
      );
      
      const receipt = await tx.wait();
      expect(receipt.gasUsed).to.be.lt(100000); // Reasonable gas limit
    });

    it("Should work with real ERC20 tokens", async function () {
      // Test interactions with real USDC contract
      const USDC_ADDRESS = "0xA0b86a33E6441b4b1E83CC";
      const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
      
      // Verify compatibility with real token standards
      expect(await usdc.symbol()).to.equal("USDC");
    });
  });
});
```

## Security Testing

### Reentrancy Tests
```typescript
describe("Security Tests", function () {
  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks", async function () {
      // Deploy malicious contract that attempts reentrancy
      const MaliciousContract = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await MaliciousContract.deploy(token.address);
      
      // Grant treasury role to attacker (simulating compromised treasury)
      await token.grantRole(await token.TREASURY_ROLE(), attacker.address);
      
      // Attempt reentrancy attack
      await expect(attacker.attemptReentrancy(ethers.parseEther("1000")))
        .to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
  });

  describe("Access Control", function () {
    it("Should prevent unauthorized role grants", async function () {
      const TREASURY_ROLE = await token.TREASURY_ROLE();
      
      await expect(token.connect(user).grantRole(TREASURY_ROLE, user.address))
        .to.be.revertedWith(`AccessControl: account ${user.address.toLowerCase()} is missing role`);
    });

    it("Should require multi-signature for admin operations", async function () {
      // Test that sensitive operations require multiple signatures
      // Implementation depends on multi-sig setup
    });
  });

  describe("Economic Attacks", function () {
    it("Should handle flash loan attacks", async function () {
      // Simulate large flash loan and attempt to manipulate system
      const flashLoanAmount = ethers.parseEther("1000000");
      
      // Attack should fail due to circuit breakers and attestation requirements
      await expect(simulateFlashLoanAttack(flashLoanAmount))
        .to.be.revertedWithCustomError(token, "DailyMintExceeded");
    });
  });
});
```

## Test Fixtures

### Setup Utilities
```typescript
// Test fixture for complete system deployment
async function deploySystemFixture() {
  const [owner, treasury, pauser, oracleUpdater, user1, user2] = await ethers.getSigners();
  
  // Deploy AsiaFlexToken
  const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
  const token = await AsiaFlexTokenFactory.deploy(
    "AsiaFlexToken",
    "AFX",
    ethers.parseEther("1000000"),  // Supply cap
    ethers.parseEther("10000"),    // Daily mint
    ethers.parseEther("50000")     // Daily net inflows
  );
  
  // Deploy NAVOracleAdapter
  const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
  const oracle = await NAVOracleAdapterFactory.deploy(
    ethers.parseEther("100"), // Initial NAV
    3600,                     // Staleness threshold
    1000                      // Deviation threshold
  );
  
  // Deploy TreasuryController
  const TreasuryControllerFactory = await ethers.getContractFactory("TreasuryController");
  const treasuryController = await TreasuryControllerFactory.deploy(
    token.address,
    treasury.address,
    3600 // Request expiration
  );
  
  // Setup roles
  await token.grantRole(await token.TREASURY_ROLE(), treasuryController.address);
  await token.grantRole(await token.PAUSER_ROLE(), pauser.address);
  await oracle.grantRole(await oracle.ORACLE_UPDATER_ROLE(), oracleUpdater.address);
  
  return {
    token,
    oracle,
    treasuryController,
    owner,
    treasury,
    pauser,
    oracleUpdater,
    user1,
    user2
  };
}

// Signature generation utility
async function generateMintSignature(
  request: MintRequest,
  signer: SignerWithAddress
): Promise<string> {
  const domain = {
    name: "TreasuryController",
    version: "1",
    chainId: await signer.getChainId(),
    verifyingContract: treasuryController.address
  };
  
  const types = {
    MintRequest: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "timestamp", type: "uint256" },
      { name: "reserveHash", type: "bytes32" }
    ]
  };
  
  return await signer._signTypedData(domain, types, request);
}
```

## Coverage Requirements

### Coverage Targets
- **Overall Coverage**: ≥95%
- **Function Coverage**: ≥98%
- **Branch Coverage**: ≥90%
- **Line Coverage**: ≥95%

### Coverage Exclusions
- Library imports (OpenZeppelin)
- Generated interfaces
- Mock contracts
- Unreachable error conditions

### Coverage Reporting
```bash
# Generate coverage report
npm run coverage

# View detailed HTML report
open coverage/index.html

# Check coverage thresholds
npm run coverage:check
```

## Test Automation

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run coverage
      - uses: codecov/codecov-action@v3
```

### Pre-commit Testing
```typescript
// husky pre-commit hook
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test:unit
npm run typecheck
```

### Performance Testing
```typescript
describe("Performance Tests", function () {
  it("Should handle high transaction throughput", async function () {
    const transactions = [];
    const batchSize = 100;
    
    for (let i = 0; i < batchSize; i++) {
      transactions.push(
        token.connect(treasury).mint(user.address, ethers.parseEther("1"))
      );
    }
    
    const startTime = Date.now();
    await Promise.all(transactions);
    const endTime = Date.now();
    
    const avgTxTime = (endTime - startTime) / batchSize;
    expect(avgTxTime).to.be.lt(1000); // < 1 second per transaction
  });
});
```