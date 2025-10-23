type Fetcher = (symbol: string) => Promise<string>;
type GoogleResolutionPath = "straight" | "dashed" | "inverse" | `override-${string}`;
export interface GoogleCheckResult {
  symbol: string;
  ok: boolean;
  providerPrice: number;
  googlePrice: number | null;
  diffPct: number | null;
  threshold: number;
  inverseUsed: boolean;
  inverseSymbol?: string;
  resolutionPath?: GoogleResolutionPath;
  alert?: string;
  error?: string;
}
export declare function setGoogleMarkupFetcher(fetcher: Fetcher): void;
export declare function resetGoogleMarkupFetcher(): void;
export declare function resetGoogleAlerts(): void;
export declare function collectGoogleAlerts(): GoogleCheckResult[];
export declare function clearStoredGoogleChecks(): void;
export declare function getLastGoogleCheck(symbol: string): GoogleCheckResult | null;
export declare function checkWithGoogle(symbol: string, providerPrice: number): Promise<GoogleCheckResult>;
export {};
//# sourceMappingURL=GoogleFinanceChecker.d.ts.map
