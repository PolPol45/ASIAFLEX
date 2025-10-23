interface BurnParams {
  from: string;
  amount: string;
  attestationHash?: string;
  dryRun?: boolean;
}
declare function burn(params: BurnParams): Promise<void>;
export { burn };
//# sourceMappingURL=burn.d.ts.map
