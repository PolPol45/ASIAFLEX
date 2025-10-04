import { parseEther } from "ethers";

export const toWei = (value: number | string | bigint) => parseEther(String(value));
export const toBigInt = (value: number | string | bigint) => BigInt(value);
