# AsiaFlex Demo Playground

This directory contains interactive demonstration scripts for testing AsiaFlex Token functionality in a local environment.

## Quick Start

### 1. Start Local Hardhat Node

In one terminal:

```bash
npm run dev:node
```

This starts a local Ethereum network with pre-funded accounts.

### 2. Run the Demo Scenario

In another terminal:

```bash
npm run dev:demo
```

This executes a complete end-to-end scenario including:

- Contract deployment (AsiaFlexToken, NAVOracleAdapter, TreasuryController)
- Role configuration (admin/treasury/oracle roles)
- NAV oracle update
- Token minting to demo account
- Token transfer between accounts
- Partial token burning
- Contract pause/unpause testing
- Supply cap adjustments
- Final status report

### 3. Monitor NAV Price (Optional)

After running the demo, you can monitor the NAV oracle in real-time:

```bash
npm run dev:watch-price
# or directly with oracle address:
# ts-node playground/price-watcher.ts <oracleAddress> [intervalSeconds]
```

## Demo Files

### `demo-e2e.ts`

Complete end-to-end scenario that demonstrates:

- **Deployment**: All core contracts with realistic parameters
- **Setup**: Role assignment and initial configuration
- **NAV Management**: Oracle updates with timestamp tracking
- **Minting**: Centralized token minting with attestation hashes
- **Transfers**: Standard ERC20 transfers between accounts
- **Burning**: Centralized token burning with attestation
- **Circuit Breaker**: Pause/unpause functionality
- **Caps Management**: Dynamic supply and daily limit adjustments

### `price-watcher.ts`

Real-time NAV monitoring tool that:

- Queries oracle every N seconds (default 30s)
- Displays live data in a formatted console table
- Tracks staleness and deviation alerts
- Saves historical data to CSV file (`playground/out/price.csv`)
- Shows recent price history

### Output Files

Demo runs save detailed reports to `playground/out/`:

- `demo-run-<timestamp>.json` - Complete scenario execution report
- `price.csv` - Historical NAV data for analysis

## Demo Scenario Details

The end-to-end demo simulates a realistic day-in-the-life scenario:

1. **Bootstrap Phase**
   - Deploy contracts with production-like caps (1M supply, 10K daily limits)
   - Configure roles (treasury, oracle, admin)
   - Set initial NAV to $100.50

2. **Operations Phase**
   - Mint 1,000 AFX to Account1 (with attestation hash)
   - Account1 transfers 300 AFX to Account2
   - Burn 100 AFX from Account2 (treasury-controlled)

3. **Administration Phase**
   - Test emergency pause/unpause
   - Increase supply cap to 2M tokens
   - Increase daily mint cap to 20K tokens

4. **Reporting Phase**
   - Generate comprehensive JSON report
   - Display summary of all operations
   - Show final balances and contract state

## Example Output

```
🎭 AsiaFlex Demo - End-to-End Scenario
=====================================

🚀 Deploying contracts...
✅ AsiaFlexToken deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ NAVOracleAdapter deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ TreasuryController deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

🔐 Setting up roles...
✅ Roles configured

🔮 Updating NAV to $100.50...
✅ NAV updated to $100.50 at 2024-01-15T10:30:45.123Z

🪙 Minting 1000 AFX to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8...
✅ Minted 1000 AFX

💸 Transferring 300 AFX from 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 to 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC...
✅ Transferred 300 AFX

🔥 Burning 100 AFX from 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC...
✅ Burned 100 AFX

⏸️  Pausing contract...
✅ Contract paused

▶️  Unpausing contract...
✅ Contract unpaused

🔧 Setting new caps...
✅ Caps updated

📊 Final state: {
  totalSupply: "900.0",
  supplyCap: "2000000.0",
  account1Balance: "700.0",
  account2Balance: "200.0",
  navValue: "100.50",
  isPaused: false
}

✅ Demo completed successfully!
📄 Report saved to: playground/out/demo-run-1642248645123.json

🎯 Summary:
   • Deployed contracts: ✅
   • NAV updated to: $100.50
   • Total supply: 900.0 AFX
   • Account1 balance: 700.0 AFX
   • Account2 balance: 200.0 AFX
   • Contract paused: 🟢
```

## Operational Commands

After the demo, you can use operational commands:

```bash
# Check system status
npm run ops:status

# Mint tokens (requires deployed contracts)
npm run ops:mint -- <address> <amount>

# Burn tokens
npm run ops:burn -- <address> <amount>

# Update NAV
npm run ops:nav -- --nav 101.25
```

## Files Generated

- **`playground/out/demo-run-<timestamp>.json`**: Complete execution report with all transaction hashes, contract addresses, and state changes
- **`playground/out/price.csv`**: CSV file with NAV monitoring data (timestamp, value, staleness, deviation)

## Network Configuration

The demo runs on Hardhat's local network with these pre-funded accounts:

- **Deployer**: Contract deployment and initial setup
- **Treasury**: Minting, burning, and administrative functions
- **Account1**: Receives initial mint, sends transfers
- **Account2**: Receives transfers, tokens are burned from here

All operations use realistic gas prices and include proper event emission for monitoring and auditing.
