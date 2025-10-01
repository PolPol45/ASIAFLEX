import * as fs from "fs";
import * as path from "path";

/**
 * NAV Cache Manager
 * Provides caching and fallback mechanism for NAV oracle data
 */

export interface CachedNAV {
  value: string;
  timestamp: number;
  source: string;
}

export interface NAVCacheConfig {
  cacheDir?: string;
  maxAge?: number; // Maximum age in seconds before cache is considered stale
  enableFallback?: boolean;
}

export class NAVCacheManager {
  private cacheDir: string;
  private maxAge: number;
  private enableFallback: boolean;

  constructor(config: NAVCacheConfig = {}) {
    this.cacheDir = config.cacheDir || path.join(process.cwd(), ".cache", "nav");
    this.maxAge = config.maxAge || 3600; // Default 1 hour
    this.enableFallback = config.enableFallback !== false;

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get the cache file path
   */
  private getCacheFilePath(): string {
    return path.join(this.cacheDir, "nav-cache.json");
  }

  /**
   * Save NAV to cache
   */
  async saveNAV(nav: string, source: string): Promise<void> {
    const cached: CachedNAV = {
      value: nav,
      timestamp: Date.now(),
      source,
    };

    try {
      fs.writeFileSync(this.getCacheFilePath(), JSON.stringify(cached, null, 2));
    } catch (error) {
      console.warn("Failed to write NAV cache:", error);
    }
  }

  /**
   * Load NAV from cache
   */
  async loadNAV(): Promise<CachedNAV | null> {
    try {
      const cacheFile = this.getCacheFilePath();
      if (!fs.existsSync(cacheFile)) {
        return null;
      }

      const content = fs.readFileSync(cacheFile, "utf-8");
      const cached: CachedNAV = JSON.parse(content);

      return cached;
    } catch (error) {
      console.warn("Failed to read NAV cache:", error);
      return null;
    }
  }

  /**
   * Check if cached NAV is still valid
   */
  async isCacheValid(): Promise<boolean> {
    const cached = await this.loadNAV();
    if (!cached) {
      return false;
    }

    const age = (Date.now() - cached.timestamp) / 1000;
    return age < this.maxAge;
  }

  /**
   * Get NAV with fallback to cache if enabled
   */
  async getNAVWithFallback(fetchFn: () => Promise<string>): Promise<{ nav: string; fromCache: boolean }> {
    try {
      // Try to fetch fresh NAV
      const nav = await fetchFn();
      await this.saveNAV(nav, "api");
      return { nav, fromCache: false };
    } catch (error) {
      console.warn("Failed to fetch NAV from API:", error);

      if (this.enableFallback) {
        // Try to use cached NAV
        const cached = await this.loadNAV();
        if (cached) {
          const age = (Date.now() - cached.timestamp) / 1000;
          console.log(`Using cached NAV (age: ${age.toFixed(0)}s)`);
          return { nav: cached.value, fromCache: true };
        }
      }

      throw new Error("NAV fetch failed and no valid cache available");
    }
  }

  /**
   * Clear the NAV cache
   */
  async clearCache(): Promise<void> {
    try {
      const cacheFile = this.getCacheFilePath();
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    } catch (error) {
      console.warn("Failed to clear NAV cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    exists: boolean;
    age?: number;
    isValid?: boolean;
    value?: string;
    source?: string;
  }> {
    const cached = await this.loadNAV();
    if (!cached) {
      return { exists: false };
    }

    const age = (Date.now() - cached.timestamp) / 1000;
    const isValid = age < this.maxAge;

    return {
      exists: true,
      age,
      isValid,
      value: cached.value,
      source: cached.source,
    };
  }
}

/**
 * Exponential backoff utility for retrying API calls
 */
export class ExponentialBackoff {
  private maxRetries: number;
  private initialDelay: number;
  private maxDelay: number;

  constructor(maxRetries = 5, initialDelay = 1000, maxDelay = 30000) {
    this.maxRetries = maxRetries;
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Execute a function with exponential backoff
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === this.maxRetries - 1;

        if (isLastAttempt) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(this.initialDelay * Math.pow(2, attempt), this.maxDelay);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }
}
