import { ethers } from "./hardhat-runtime";
import {
  BASKETS,
  BasketKey,
  getBasketDefinition,
  getBasketId,
  getBasketManager,
  logDryRunNotice,
  parseDryRunFlag,
  requireAddressEnv,
} from "./basket-helpers";

const ERC20_ABI = ["function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)"];

type ExecutionConfig = {
  readonly basketKey: BasketKey;
  readonly amount: string;
  readonly minBase: string;
  readonly recipient?: string;
};

function readEnv(name: string): string | undefined {
  return process.env[name] ?? process.env[name.toUpperCase()];
}

function resolveConfig(): ExecutionConfig {
  const basketKeyInput = readEnv("REDEEM_BASKET_KEY") ?? readEnv("BASKET_KEY") ?? readEnv("BASKET") ?? "";
  const amount = readEnv("REDEEM_TOKEN_AMOUNT") ?? readEnv("TOKEN_AMOUNT");
  const minBase = readEnv("REDEEM_MIN_BASE") ?? readEnv("MIN_BASE") ?? "0";
  const recipient = readEnv("REDEEM_RECIPIENT") ?? readEnv("RECIPIENT");

  if (!basketKeyInput) {
    throw new Error(
      `Missing basket key. Set REDEEM_BASKET_KEY (one of ${BASKETS.map((item) => item.key).join(", ")}).`
    );
  }
  if (!amount) {
    throw new Error("Missing token amount. Set REDEEM_TOKEN_AMOUNT (human-readable units).");
  }

  const key = basketKeyInput.toUpperCase() as BasketKey;
  if (!BASKETS.some((item) => item.key === key)) {
    throw new Error(
      `Unknown basket key ${basketKeyInput}. Supported keys: ${BASKETS.map((item) => item.key).join(", ")}`
    );
  }

  return {
    basketKey: key,
    amount,
    minBase,
    recipient,
  };
}

async function main(): Promise<void> {
  const { basketKey, amount, minBase, recipient } = resolveConfig();
  const basket = getBasketDefinition(basketKey);
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const tokenAddress = requireAddressEnv(basket.tokenEnv);
  const dryRun = parseDryRunFlag();

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  const manager = await getBasketManager(managerAddress);
  const basketId = await getBasketId(manager, basket);
  const state = await manager.basketState(basketId);
  if (state.token === ethers.ZeroAddress) {
    throw new Error(`Basket ${basket.key} is not registered yet.`);
  }
  if (state.token.toLowerCase() !== tokenAddress.toLowerCase()) {
    console.warn(`⚠️  BasketManager token ${state.token} differs from ${tokenAddress} (env ${basket.tokenEnv})`);
  }

  const baseAssetAddress: string = await manager.baseAsset();
  const basketToken = await ethers.getContractAt("BasketToken", state.token);
  const baseAsset = new ethers.Contract(baseAssetAddress, ERC20_ABI, signer);

  const tokenDecimals = await basketToken.decimals();
  const baseDecimals = await baseAsset.decimals();

  const tokenAmount = ethers.parseUnits(amount, tokenDecimals);
  const minBaseAmount = ethers.parseUnits(minBase, baseDecimals);
  const payout = recipient ?? signer.address;

  console.log(`🔄 Redeeming ${basket.key} basket token`);
  console.log(`🌐 Network: ${network.name} (${network.chainId})`);
  console.log(`👤 Signer: ${signer.address}`);
  console.log(`🏦 BasketManager: ${managerAddress}`);
  console.log(`🎯 Recipient: ${payout}`);
  console.log(`🎟️  Token amount: ${ethers.formatUnits(tokenAmount, tokenDecimals)}`);
  console.log(`💵 Min base amount: ${ethers.formatUnits(minBaseAmount, baseDecimals)}`);
  if (dryRun) {
    logDryRunNotice();
  }

  const tokenBalanceBefore = await basketToken.balanceOf(signer.address);
  const recipientBalanceBefore = await baseAsset.balanceOf(payout);
  console.log(`🎟️  Signer ${basket.key} balance: ${ethers.formatUnits(tokenBalanceBefore, tokenDecimals)}`);
  console.log(`💰 Recipient base balance: ${ethers.formatUnits(recipientBalanceBefore, baseDecimals)}`);

  const preview = await manager.redeem.staticCall(basket.region, basket.strategy, tokenAmount, minBaseAmount, payout);
  console.log(`🔍 Preview base out: ${ethers.formatUnits(preview, baseDecimals)} (nav-driven estimate)`);

  if (dryRun) {
    console.log(`[dry-run] Would call BasketManager.redeem for ${basket.key}`);
    return;
  }

  const tx = await manager.redeem(basket.region, basket.strategy, tokenAmount, minBaseAmount, payout);
  console.log(`🚀 Redeem transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Redeem confirmed in block ${receipt?.blockNumber ?? "unknown"}`);

  const tokenBalanceAfter = await basketToken.balanceOf(signer.address);
  const recipientBalanceAfter = await baseAsset.balanceOf(payout);
  console.log(`🎟️  Signer ${basket.key} balance (post): ${ethers.formatUnits(tokenBalanceAfter, tokenDecimals)}`);
  console.log(`💰 Recipient base balance (post): ${ethers.formatUnits(recipientBalanceAfter, baseDecimals)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Redeem failed:", error);
    process.exitCode = 1;
  });
}

export { main };
