interface MintParams {
  to: string;
  amount: string;
  attestationHash?: string;
  dryRun?: boolean;
}
declare function mint(params: MintParams): Promise<void>;
export { mint };
//# sourceMappingURL=mint.d.ts.map
