import fs from "fs";
import path from "path";

export type DeploymentFile = {
  network: string;
  contracts: Record<string, string>;
  addresses?: Record<string, string>;
  [key: string]: unknown;
};

export type LoadAddressesResult = {
  filePath: string;
  data: DeploymentFile;
};

const DEPLOYMENTS_DIR = path.join(__dirname, "../deployments");

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolvePath(networkName: string, overridePath?: string) {
  if (overridePath) {
    return path.resolve(overridePath);
  }
  ensureDirectory(DEPLOYMENTS_DIR);
  return path.join(DEPLOYMENTS_DIR, `${networkName}.json`);
}

function createTemplate(networkName: string): DeploymentFile {
  return {
    network: networkName,
    contracts: {},
    addresses: {},
  };
}

export function loadAddresses(networkName: string, overridePath?: string): LoadAddressesResult {
  const filePath = resolvePath(networkName, overridePath);

  if (!fs.existsSync(filePath)) {
    const template = createTemplate(networkName);
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    return { filePath, data: { ...template } };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: DeploymentFile;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }

  const contractsSource = {
    ...(typeof parsed.addresses === "object" && parsed.addresses !== null
      ? (parsed.addresses as Record<string, string>)
      : {}),
    ...(typeof parsed.contracts === "object" && parsed.contracts !== null
      ? (parsed.contracts as Record<string, string>)
      : {}),
  };

  parsed.contracts = contractsSource;
  parsed.addresses = { ...contractsSource };
  if (!parsed.network) {
    parsed.network = networkName;
  }
  return { filePath, data: parsed };
}

export function saveAddress(networkName: string, key: string, address: string, overridePath?: string): DeploymentFile {
  const { filePath, data } = loadAddresses(networkName, overridePath);
  const updatedContracts = {
    ...data.contracts,
    [key]: address,
  };
  const updated: DeploymentFile = {
    ...data,
    contracts: updatedContracts,
    addresses: {
      ...(data.addresses || {}),
      [key]: address,
    },
  };

  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
  return updated;
}

export function getContractAddress(networkName: string, key: string, overridePath?: string): string | undefined {
  const { data } = loadAddresses(networkName, overridePath);
  return data.contracts[key];
}
