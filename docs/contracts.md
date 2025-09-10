# Contract APIs

## Overview

This document provides comprehensive API documentation for all AsiaFlex smart contracts, including function signatures, events, errors, and usage examples.

## AsiaFlexToken

Enterprise-grade ERC20 token with supply management and access controls.

### Inheritance
```solidity
contract AsiaFlexToken is 
    ERC20, 
    ERC20Permit, 
    AccessControl, 
    Pausable, 
    ReentrancyGuard,
    IAsiaFlexToken
```

### Constants

#### Roles
```solidity
bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
bytes32 public constant CAPS_MANAGER_ROLE = keccak256("CAPS_MANAGER_ROLE");
bytes32 public constant BLACKLIST_MANAGER_ROLE = keccak256("BLACKLIST_MANAGER_ROLE");
```

### State Variables

#### Supply Management
```solidity
uint256 public supplyCap;              // Maximum total supply
uint256 public maxDailyMint;           // Maximum tokens mintable per day
uint256 public maxDailyNetInflows;     // Maximum net inflow per day
uint256 public lastResetTimestamp;     // Last daily reset timestamp
uint256 public dailyMintAmount;        // Current day mint amount
uint256 public dailyNetInflowAmount;   // Current day net inflow amount
```

#### Legacy Compatibility
```solidity
uint256 private _reserves;             // Reserve amount (legacy)
uint256 private _price;                // Token price (legacy)
mapping(address => uint256) public pendingRedeems;           // Pending redemptions
mapping(address => uint256[]) public redeemBlockQueue;      // Redeem queue
mapping(address => bool) private _blacklisted;              // Blacklist mapping
```

### Constructor
```solidity
constructor(
    string memory name,
    string memory symbol,
    uint256 _supplyCap,
    uint256 _maxDailyMint,
    uint256 _maxDailyNetInflows
) ERC20(name, symbol) ERC20Permit(name)
```

**Parameters:**
- `name`: Token name (e.g., "AsiaFlexToken")
- `symbol`: Token symbol (e.g., "AFX")
- `_supplyCap`: Maximum total supply
- `_maxDailyMint`: Daily mint limit
- `_maxDailyNetInflows`: Daily net inflow limit

### Core Functions

#### mint
```solidity
function mint(address to, uint256 amount) 
    external 
    onlyRole(TREASURY_ROLE) 
    whenNotPaused 
    nonReentrant
```
Mints new tokens to specified address.

**Parameters:**
- `to`: Recipient address
- `amount`: Amount to mint

**Requirements:**
- Caller must have TREASURY_ROLE
- Contract must not be paused
- Must not exceed daily mint limit
- Must not exceed supply cap
- Recipient must not be blacklisted

**Events Emitted:**
- `Transfer(address(0), to, amount)`
- `DailyMintUpdated(dailyMintAmount)`

#### burn
```solidity
function burn(address from, uint256 amount) 
    external 
    onlyRole(TREASURY_ROLE) 
    whenNotPaused 
    nonReentrant
```
Burns tokens from specified address.

**Parameters:**
- `from`: Address to burn from
- `amount`: Amount to burn

**Requirements:**
- Caller must have TREASURY_ROLE
- Contract must not be paused
- Sufficient balance required

#### pause / unpause
```solidity
function pause() external onlyRole(PAUSER_ROLE)
function unpause() external onlyRole(DEFAULT_ADMIN_ROLE)
```
Emergency pause/unpause functionality.

### Circuit Breaker Functions

#### setSupplyCap
```solidity
function setSupplyCap(uint256 _supplyCap) 
    external 
    onlyRole(CAPS_MANAGER_ROLE)
```
Updates the maximum total supply.

#### setDailyLimits
```solidity
function setDailyLimits(
    uint256 _maxDailyMint,
    uint256 _maxDailyNetInflows
) external onlyRole(CAPS_MANAGER_ROLE)
```
Updates daily operational limits.

#### getRemainingDailyMint
```solidity
function getRemainingDailyMint() external view returns (uint256)
```
Returns remaining mint capacity for current day.

#### getRemainingDailyNetInflows
```solidity
function getRemainingDailyNetInflows() external view returns (uint256)
```
Returns remaining net inflow capacity for current day.

### Blacklist Functions

#### blacklist / unblacklist
```solidity
function blacklist(address account) external onlyRole(BLACKLIST_MANAGER_ROLE)
function unblacklist(address account) external onlyRole(BLACKLIST_MANAGER_ROLE)
```
Manage address blacklist (optional feature).

#### isBlacklisted
```solidity
function isBlacklisted(address account) external view returns (bool)
```
Check if address is blacklisted.

### Legacy Compatibility

#### setReserves
```solidity
function setReserves(uint256 _reserveAmount) 
    external 
    onlyRole(TREASURY_ROLE)
```
Set reserve amount for legacy compatibility.

#### setPrice
```solidity
function setPrice(uint256 _priceAmount) 
    external 
    onlyRole(TREASURY_ROLE)
```
Set token price for legacy compatibility.

#### reserves / getPrice
```solidity
function reserves() external view returns (uint256)
function getPrice() external view returns (uint256)
```
Get current reserves and price values.

### Events

```solidity
event SupplyCapUpdated(uint256 oldCap, uint256 newCap);
event DailyLimitsUpdated(uint256 maxMint, uint256 maxNetInflows);
event DailyMintUpdated(uint256 newAmount);
event DailyNetInflowUpdated(uint256 newAmount);
event Blacklisted(address indexed account);
event Unblacklisted(address indexed account);
event RedeemRequested(address indexed user, uint256 amount);
```

### Custom Errors

```solidity
error DailyMintExceeded();
error DailyNetInflowExceeded();
error SupplyCapExceeded();
error BlacklistedAddress();
error InvalidAmount();
error ZeroAddress();
```

## NAVOracleAdapter

Oracle contract for AAXJ price feeds with staleness and deviation protection.

### Inheritance
```solidity
contract NAVOracleAdapter is AccessControl, Pausable, INAVOracleAdapter
```

### Constants

#### Roles
```solidity
bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");
```

### State Variables

```solidity
uint256 private _currentNAV;           // Current NAV price
uint256 private _lastUpdateTimestamp;  // Last update timestamp
uint256 public stalenessThreshold;     // Maximum staleness in seconds
uint256 public deviationThreshold;     // Maximum deviation in basis points
```

### Constructor
```solidity
constructor(
    uint256 _initialNAV,
    uint256 _stalenessThreshold,
    uint256 _deviationThreshold
)
```

**Parameters:**
- `_initialNAV`: Initial NAV price
- `_stalenessThreshold`: Maximum staleness (seconds)
- `_deviationThreshold`: Maximum deviation (basis points)

### Core Functions

#### updateNAV
```solidity
function updateNAV(uint256 newNAV) 
    external 
    onlyRole(ORACLE_UPDATER_ROLE) 
    whenNotPaused
```
Updates the NAV price with validation.

**Parameters:**
- `newNAV`: New NAV price

**Requirements:**
- Caller must have ORACLE_UPDATER_ROLE
- Contract must not be paused
- Deviation must be within threshold
- Price must not be stale (unless emergency)

#### getCurrentNAV
```solidity
function getCurrentNAV() external view returns (uint256)
```
Returns current NAV price.

#### getLastUpdateTimestamp
```solidity
function getLastUpdateTimestamp() external view returns (uint256)
```
Returns timestamp of last price update.

#### isStale
```solidity
function isStale() external view returns (bool)
```
Checks if current price is stale.

### Configuration Functions

#### setStalenessThreshold
```solidity
function setStalenessThreshold(uint256 _threshold) 
    external 
    onlyRole(ORACLE_MANAGER_ROLE)
```
Updates staleness threshold.

#### setDeviationThreshold
```solidity
function setDeviationThreshold(uint256 _threshold) 
    external 
    onlyRole(ORACLE_MANAGER_ROLE)
```
Updates deviation threshold.

### View Functions

#### calculateDeviation
```solidity
function calculateDeviation(uint256 oldPrice, uint256 newPrice) 
    external 
    pure 
    returns (uint256)
```
Calculates price deviation in basis points.

#### getAge
```solidity
function getAge() external view returns (uint256)
```
Returns age of current price in seconds.

### Events

```solidity
event NAVUpdated(uint256 timestamp, uint256 oldNAV, uint256 newNAV);
event StalenessThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
event DeviationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
```

### Custom Errors

```solidity
error StalePrice();
error DeviationTooHigh();
error InvalidThreshold();
error InvalidNAV();
```

## TreasuryController

Controls mint/redeem operations with EIP712 signed attestations.

### Inheritance
```solidity
contract TreasuryController is AccessControl, Pausable, EIP712, ITreasuryController
```

### Constants

#### Roles
```solidity
bytes32 public constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
```

#### EIP712 Type Hashes
```solidity
bytes32 private constant MINT_REQUEST_TYPEHASH = keccak256(
    "MintRequest(address to,uint256 amount,uint256 timestamp,bytes32 reserveHash)"
);
bytes32 private constant REDEEM_REQUEST_TYPEHASH = keccak256(
    "RedeemRequest(address from,uint256 amount,uint256 timestamp,bytes32 reserveHash)"
);
```

### State Variables

```solidity
address public treasurySigner;              // Authorized signer address
uint256 public requestExpiration;           // Request validity period
IAsiaFlexToken public immutable asiaFlexToken; // Token contract
mapping(bytes32 => bool) public usedRequests;  // Replay protection
```

### Constructor
```solidity
constructor(
    address _asiaFlexToken,
    address _treasurySigner,
    uint256 _requestExpiration
) EIP712("TreasuryController", "1")
```

**Parameters:**
- `_asiaFlexToken`: AsiaFlexToken contract address
- `_treasurySigner`: Authorized signer address
- `_requestExpiration`: Request expiration time (seconds)

### Core Functions

#### mint
```solidity
function mint(
    address to,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash,
    bytes calldata signature
) external whenNotPaused nonReentrant
```
Mints tokens with signed attestation.

**Parameters:**
- `to`: Recipient address
- `amount`: Amount to mint
- `timestamp`: Request timestamp
- `reserveHash`: Reserve proof hash
- `signature`: EIP712 signature

**Requirements:**
- Valid signature from treasury signer
- Request not expired
- Request not previously used
- All token contract requirements

#### redeem
```solidity
function redeem(
    address from,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash,
    bytes calldata signature
) external whenNotPaused nonReentrant
```
Redeems (burns) tokens with signed attestation.

**Parameters:**
- `from`: Token holder address
- `amount`: Amount to redeem
- `timestamp`: Request timestamp
- `reserveHash`: Reserve proof hash
- `signature`: EIP712 signature

### Configuration Functions

#### setTreasurySigner
```solidity
function setTreasurySigner(address _signer) 
    external 
    onlyRole(TREASURY_MANAGER_ROLE)
```
Updates treasury signer address.

#### setRequestExpiration
```solidity
function setRequestExpiration(uint256 _expiration) 
    external 
    onlyRole(TREASURY_MANAGER_ROLE)
```
Updates request expiration period.

### View Functions

#### verifyMintAttestation
```solidity
function verifyMintAttestation(
    address to,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash,
    bytes calldata signature
) external view returns (bool)
```
Verifies mint attestation signature.

#### verifyRedeemAttestation
```solidity
function verifyRedeemAttestation(
    address from,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash,
    bytes calldata signature
) external view returns (bool)
```
Verifies redeem attestation signature.

#### getRequestHash
```solidity
function getRequestHash(
    bytes32 typeHash,
    address account,
    uint256 amount,
    uint256 timestamp,
    bytes32 reserveHash
) external view returns (bytes32)
```
Generates request hash for given parameters.

### Events

```solidity
event MintExecuted(
    address indexed to,
    uint256 amount,
    bytes32 reserveHash,
    bytes32 requestHash
);
event RedeemExecuted(
    address indexed from,
    uint256 amount,
    bytes32 reserveHash,
    bytes32 requestHash
);
event TreasurySignerUpdated(address oldSigner, address newSigner);
event RequestExpirationUpdated(uint256 oldExpiration, uint256 newExpiration);
```

### Custom Errors

```solidity
error InvalidSignature();
error RequestExpired();
error RequestAlreadyUsed();
error InvalidTimestamp();
error ZeroAmount();
```

## Interfaces

### IAsiaFlexToken

```solidity
interface IAsiaFlexToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function pause() external;
    function unpause() external;
    function setSupplyCap(uint256 _supplyCap) external;
    function setDailyLimits(uint256 _maxDailyMint, uint256 _maxDailyNetInflows) external;
    function blacklist(address account) external;
    function unblacklist(address account) external;
    
    function supplyCap() external view returns (uint256);
    function maxDailyMint() external view returns (uint256);
    function maxDailyNetInflows() external view returns (uint256);
    function getRemainingDailyMint() external view returns (uint256);
    function getRemainingDailyNetInflows() external view returns (uint256);
    function isBlacklisted(address account) external view returns (bool);
}
```

### INAVOracleAdapter

```solidity
interface INAVOracleAdapter {
    function updateNAV(uint256 newNAV) external;
    function setStalenessThreshold(uint256 _threshold) external;
    function setDeviationThreshold(uint256 _threshold) external;
    
    function getCurrentNAV() external view returns (uint256);
    function getLastUpdateTimestamp() external view returns (uint256);
    function isStale() external view returns (bool);
    function calculateDeviation(uint256 oldPrice, uint256 newPrice) external pure returns (uint256);
}
```

### ITreasuryController

```solidity
interface ITreasuryController {
    function mint(
        address to,
        uint256 amount,
        uint256 timestamp,
        bytes32 reserveHash,
        bytes calldata signature
    ) external;
    
    function redeem(
        address from,
        uint256 amount,
        uint256 timestamp,
        bytes32 reserveHash,
        bytes calldata signature
    ) external;
    
    function setTreasurySigner(address _signer) external;
    function setRequestExpiration(uint256 _expiration) external;
    
    function verifyMintAttestation(
        address to,
        uint256 amount,
        uint256 timestamp,
        bytes32 reserveHash,
        bytes calldata signature
    ) external view returns (bool);
}
```

## Usage Examples

### Deploying Contracts

```typescript
// Deploy AsiaFlexToken
const AsiaFlexTokenFactory = await ethers.getContractFactory("AsiaFlexToken");
const token = await AsiaFlexTokenFactory.deploy(
  "AsiaFlexToken",
  "AFX",
  ethers.parseEther("1000000"),  // 1M supply cap
  ethers.parseEther("10000"),    // 10K daily mint
  ethers.parseEther("50000")     // 50K daily net inflows
);

// Deploy NAVOracleAdapter
const NAVOracleAdapterFactory = await ethers.getContractFactory("NAVOracleAdapter");
const oracle = await NAVOracleAdapterFactory.deploy(
  ethers.parseEther("100"),      // $100 initial NAV
  3600,                          // 1 hour staleness
  1000                           // 10% deviation limit
);

// Deploy TreasuryController
const TreasuryControllerFactory = await ethers.getContractFactory("TreasuryController");
const treasury = await TreasuryControllerFactory.deploy(
  await token.getAddress(),
  signerAddress,
  3600                           // 1 hour request expiration
);
```

### Setting Up Roles

```typescript
// Grant roles
const TREASURY_ROLE = await token.TREASURY_ROLE();
const ORACLE_UPDATER_ROLE = await oracle.ORACLE_UPDATER_ROLE();

await token.grantRole(TREASURY_ROLE, await treasury.getAddress());
await oracle.grantRole(ORACLE_UPDATER_ROLE, oracleUpdaterAddress);
```

### Minting Tokens

```typescript
// Generate mint attestation
const mintRequest = {
  to: userAddress,
  amount: ethers.parseEther("1000"),
  timestamp: Math.floor(Date.now() / 1000),
  reserveHash: generateReserveHash()
};

const signature = await generateMintSignature(mintRequest, treasurySigner);

// Execute mint
await treasury.mint(
  mintRequest.to,
  mintRequest.amount,
  mintRequest.timestamp,
  mintRequest.reserveHash,
  signature
);
```

### Updating Oracle Price

```typescript
// Update NAV price
const newNAV = ethers.parseEther("105.50");
await oracle.connect(oracleUpdater).updateNAV(newNAV);
```