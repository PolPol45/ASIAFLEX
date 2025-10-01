import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS_DIR = path.resolve(__dirname, "../../deployments");

function collectCandidateNames(networkName: string, chainId?: bigint): string[] {
  const normalized = networkName?.toLowerCase?.() ?? "";
  const candidates = new Set<string>();

  if (networkName) {
    candidates.add(networkName);
    candidates.add(normalized);
  }

  if (normalized === "hardhat") {
    candidates.add("localhost");
  }

  if (normalized === "localhost") {
    candidates.add("hardhat");
  }

  if (chainId === BigInt(31337)) {
    candidates.add("localhost");
    candidates.add("hardhat");
  }

  return Array.from(candidates).filter(Boolean);
}

export function resolveDeploymentPath(networkName: string, chainId?: bigint): string {
  const candidates = collectCandidateNames(networkName, chainId);

  for (const candidate of candidates) {
    const filePath = path.join(DEPLOYMENTS_DIR, `${candidate}.json`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  const tried = candidates.map((name) => path.join("scripts", "deployments", `${name}.json`));
  throw new Error(`Deployment file not found for network ${networkName}. Candidate paths checked: ${tried.join(", ")}`);
}

export function loadDeployment(networkName: string, chainId?: bigint): any {
  const filePath = resolveDeploymentPath(networkName, chainId);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
