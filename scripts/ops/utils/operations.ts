import * as fs from "fs";
import * as path from "path";

const OPERATIONS_DIR = path.resolve(__dirname, "../../deployments/operations");

function ensureOperationsDir(): void {
  if (!fs.existsSync(OPERATIONS_DIR)) {
    fs.mkdirSync(OPERATIONS_DIR, { recursive: true });
  }
}

export function saveOperation(networkName: string, operationType: string, payload: any): string {
  ensureOperationsDir();

  const filename = `${networkName}_${operationType}_${Date.now()}.json`;
  const filePath = path.join(OPERATIONS_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  console.log(`📝 Operation saved to ${filePath}`);

  return filePath;
}

export function listOperations(): string[] {
  ensureOperationsDir();
  return fs
    .readdirSync(OPERATIONS_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(OPERATIONS_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}
