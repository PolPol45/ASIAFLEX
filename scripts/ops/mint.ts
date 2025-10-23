import "dotenv/config";
import { ethers } from "./hardhat-runtime";
import { BASKET_ID } from "./basketIds";
import { logDryRunNotice, parseDryRunFlag, requireAddressEnv } from "./basket-helpers";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

type ParsedArgs = {
  readonly basket: string;
  readonly amount: string;
  readonly network: string;
  readonly dryRun: boolean;
};

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  let basket = "";
  let amount = "";
  let network = process.env.HARDHAT_NETWORK || "sepolia";
  let dryRun = parseDryRunFlag(argv);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run" || a === "--dryRun") {
      dryRun = true;
      continue;
    }
    if (a === "--basket" && i + 1 < argv.length) {
      basket = argv[++i];
    } else if (a === "--amount" && i + 1 < argv.length) {
      amount = argv[++i];
    } else if (a === "--network" && i + 1 < argv.length) {
      network = argv[++i];
    }
  }

  if (!basket || !amount) {
    console.error("Usage: npx ts-node scripts/ops/mint.ts --basket EUFX --amount 100 --network sepolia");
    process.exit(1);
  }
  return { basket: basket.toUpperCase(), amount, network, dryRun };
}

function envVarForBasket(b: string): string {
  switch (b) {
    case "EUFX":
      return "TOK_EUFX";
    case "ASFX":
      return "TOK_ASFX";
    case "EUBOND":
      return "TOK_EUBOND";
    case "ASBOND":
      return "TOK_ASBOND";
    case "EUASMIX":
      return "TOK_EUAS";
    default:
      throw new Error(`Unsupported basket ${b}`);
  }
}

async function main(): Promise<void> {
  const { basket, amount, network, dryRun } = parseArgs();
  const managerAddress = requireAddressEnv("BASKET_MANAGER");
  const tokenEnvName = envVarForBasket(basket);
  const tokenEnvVal = requireAddressEnv(tokenEnvName);

  // Set network via HARDHAT_NETWORK env for provider selection
  process.env.HARDHAT_NETWORK = network;

  const [signer] = await ethers.getSigners();
  const manager = await ethers.getContractAt("BasketManager", managerAddress, signer);

  const id = BASKET_ID[basket as keyof typeof BASKET_ID];
  const state = await manager.basketState(id);
  if (state.token.toLowerCase() !== tokenEnvVal.toLowerCase()) {
    throw new Error(`Basket token mismatch on-chain ${state.token} != env ${tokenEnvVal}`);
  }

  const basketToken = await ethers.getContractAt("BasketToken", state.token, signer);
  const baseAssetAddr = await manager.baseAsset();
  const baseAsset = new ethers.Contract(baseAssetAddr, ERC20_ABI, signer);

  const baseDecimals: number = await baseAsset.decimals();
  const tokenDecimalsBig: bigint = await basketToken.decimals();
  const tokenDecimals = Number(tokenDecimalsBig);

  const baseAmount = ethers.parseUnits(amount, baseDecimals);
  // minTokens calculation is handled via slippage; placeholder removed to avoid unused variable lint

  console.log(`Minting ${basket} with base amount ${amount} (decimals ${baseDecimals})`);
  const balance = await baseAsset.balanceOf(signer.address);
  console.log(`Signer base balance: ${ethers.formatUnits(balance, baseDecimals)}`);

  const allowance = await baseAsset.allowance(signer.address, managerAddress);
  console.log(`Allowance to manager: ${ethers.formatUnits(allowance, baseDecimals)}`);
  if (allowance < baseAmount) {
    if (dryRun) {
      console.log(
        `[dry-run] Would approve ${ethers.formatUnits(baseAmount, baseDecimals)} to manager ${managerAddress}`
      );
    } else {
      console.log(`Approving ${ethers.formatUnits(baseAmount, baseDecimals)} to manager ${managerAddress}`);
      const approveTx = await baseAsset.approve(managerAddress, baseAmount);
      console.log(`Approve tx: ${approveTx.hash}`);
      await approveTx.wait();
    }
  }

  if (balance < baseAmount) {
    throw new Error(`Insufficient base balance: have ${ethers.formatUnits(balance, baseDecimals)}, need ${amount}`);
  }

  // derive region and strategy from numeric id
  const regionVal = Math.floor(Number(id) / 3);
  const strategyVal = Number(id) % 3;

  const previewTokens = await manager.mint.staticCall(
    regionVal,
    strategyVal,
    baseAmount,
    0,
    signer.address,
    ethers.ZeroHash
  );
  console.log(`Preview tokens: ${ethers.formatUnits(previewTokens, tokenDecimals)}`);

  if (dryRun) {
    logDryRunNotice();
    console.log(`[dry-run] Would call BasketManager.mint for basket ${basket}`);
    return;
  }

  const tx = await manager.mint(regionVal, strategyVal, baseAmount, 0, signer.address, ethers.ZeroHash);
  console.log(`Mint tx: ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt) {
    console.log(`Confirmed in block ${receipt.blockNumber}, gasUsed ${receipt.gasUsed?.toString()}`);
  } else {
    console.log(`Transaction sent, no receipt available`);
  }

  const tokenBalance = await basketToken.balanceOf(signer.address);
  console.log(`Beneficiary ${signer.address} ${basket} balance: ${ethers.formatUnits(tokenBalance, tokenDecimals)}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Mint failed:", err);
    process.exitCode = 1;
  });
}

export { main };
