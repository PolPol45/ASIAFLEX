import * as fs from "fs";
import * as path from "path";

export interface BasketAllocationInfo {
  assetId: string;
  weightBps: number;
  isBond: boolean;
  accrualBps: number;
  initialPrice?: string;
  updatedAt?: number;
  decimals?: number;
}

export interface BasketInfo {
  name: string;
  symbol: string;
  region: string;
  strategy: string;
  regionEnum: number;
  strategyEnum: number;
  basketId: string;
  tokenAddress: string;
  nav: string;
  navTimestamp: number;
  allocations: BasketAllocationInfo[];
}

export interface BasketDeployment {
  network: string;
  chainId: string;
  timestamp: string;
  baseAsset: string;
  manager: string;
  oracle?: string;
  medianOracle?: string;
  navOracle?: string;
  baskets: BasketInfo[];
}

const BASKET_DEPLOYMENTS_DIR = path.resolve(__dirname, "../../deployments/baskets");

function collectCandidateNames(networkName: string, chainId?: bigint): string[] {
  const normalized = networkName?.toLowerCase?.() ?? "";
  const candidates = new Set<string>();

  if (normalized) {
    candidates.add(normalized);
  }

  if (normalized === "hardhat") {
    candidates.add("localhost");
  }

  if (normalized === "localhost") {
    candidates.add("hardhat");
  }

  if (chainId === BigInt(31337)) {
    candidates.add("hardhat");
    candidates.add("localhost");
  }

  if (chainId) {
    candidates.add(chainId.toString());
  }

  return Array.from(candidates).filter(Boolean);
}

function resolveBasketDeploymentPath(networkName: string, chainId?: bigint): string {
  const candidates = collectCandidateNames(networkName, chainId);

  for (const candidate of candidates) {
    const filePath = path.join(BASKET_DEPLOYMENTS_DIR, `${candidate}.json`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  const tried = candidates.map((candidate) => path.join("scripts", "deployments", "baskets", `${candidate}.json`));
  throw new Error(
    `Basket deployment file not found for network ${networkName}. Candidate paths checked: ${tried.join(", ")}`
  );
}

export function loadBasketDeployment(networkName: string, chainId?: bigint): BasketDeployment {
  const filePath = resolveBasketDeploymentPath(networkName, chainId);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
