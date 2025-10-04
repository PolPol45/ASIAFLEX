import { TypedDataEncoder } from "ethers";
import type { Signer, TypedDataField } from "ethers";

export type MintRedeemRequest = {
  basketId: string;
  to: string;
  notional: bigint;
  nav: bigint;
  deadline: bigint;
  proofHash: string;
  nonce: bigint;
};

const MINT_REDEEM_TYPES: Record<string, TypedDataField[]> = {
  MintRedeem: [
    { name: "basketId", type: "bytes32" },
    { name: "to", type: "address" },
    { name: "notional", type: "uint256" },
    { name: "nav", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "proofHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
  ],
};

export function basketTreasuryDomain(chainId: bigint, verifyingContract: string) {
  return {
    name: "BasketTreasury",
    version: "1",
    chainId,
    verifyingContract,
  } as const;
}

export function encodeMintRedeemDigest(domain: ReturnType<typeof basketTreasuryDomain>, request: MintRedeemRequest) {
  return TypedDataEncoder.hash(domain, MINT_REDEEM_TYPES, request);
}

export async function signMintRedeem(
  signer: Signer,
  domain: ReturnType<typeof basketTreasuryDomain>,
  request: MintRedeemRequest
): Promise<string> {
  return signer.signTypedData(domain, MINT_REDEEM_TYPES, request);
}

export { MINT_REDEEM_TYPES };
