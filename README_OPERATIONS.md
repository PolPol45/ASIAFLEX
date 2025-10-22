# Operations Quick Commands

Sanity & resolve addresses

```bash
# Show envs and verify on-chain tokens match
HARDHAT_NETWORK=sepolia \
BASKET_MANAGER=0x... \
TOK_EUFX=0x... \
TOK_ASFX=0x... \
TOK_EUBOND=0x... \
TOK_ASBOND=0x... \
TOK_EUAS=0x... \
  npx hardhat run scripts/ops/resolve-addresses.ts
```

Console quick checks

```bash
npx hardhat console --network sepolia <<'EOF'
const m = await ethers.getContractAt("BasketManager", process.env.BASKET_MANAGER);
(await m.basketState(0)).token // EUFX token address expected = TOK_EUFX
(await ethers.getContractAt("BasketToken", process.env.TOK_EUFX)).symbol()
EOF
```

Approve & mint (env driven)

```bash
# Mint EUFX to your wallet (example)
HARDHAT_NETWORK=sepolia \
BASKET_MANAGER=0x... \
TOK_EUFX=0x... \
MINT_BASKET_KEY=EUFX \
MINT_BASE_AMOUNT=100 \
MINT_BENEFICIARY=0xF4569BC729C62a2eD036F0A3fA66EDf842F14574 \
  npm run ops:mint
```

Same for other baskets, set MINT_BASKET_KEY to ASFX, EUBOND, ASBOND, EUAS.
