/**
 * Rate limiter module for API calls
 *
 * Uses factory + lazy initialization singleton pattern:
 * - RateLimiter class: Delay-based rate limiting with configurable requests/second
 * - getRateLimiter(api, config): Returns singleton per API type
 * - resetRateLimiters(): Clears singletons for test isolation
 */

/**
 * API types supported by the rate limiter
 */
export type ApiType = "pubmed" | "crossref";

/**
 * Configuration for rate limiter
 */
export interface RateLimiterConfig {
  pubmedApiKey?: string;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  readonly requestsPerSecond: number;
  readonly intervalMs: number;
  readonly lastRequestTime: number;
  acquire(): Promise<void>;
}

/**
 * Rate limit settings per API type
 */
const RATE_LIMITS = {
  pubmed: {
    withoutApiKey: 3, // 3 req/sec
    withApiKey: 10, // 10 req/sec
  },
  crossref: 50, // 50 req/sec
} as const;

/**
 * Internal rate limiter implementation
 */
class RateLimiterImpl implements RateLimiter {
  readonly requestsPerSecond: number;
  readonly intervalMs: number;
  private _lastRequestTime = 0;
  private _pending: Promise<void> = Promise.resolve();

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
    this.intervalMs = 1000 / requestsPerSecond;
  }

  get lastRequestTime(): number {
    return this._lastRequestTime;
  }

  async acquire(): Promise<void> {
    // Chain onto pending promise to ensure sequential processing
    this._pending = this._pending.then(() => this._acquireInternal());
    return this._pending;
  }

  private async _acquireInternal(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this._lastRequestTime;
    const waitTime = Math.max(0, this.intervalMs - elapsed);

    if (waitTime > 0 && this._lastRequestTime > 0) {
      await this._delay(waitTime);
    }

    this._lastRequestTime = Date.now();
  }

  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton storage for rate limiters by API type
 */
const limiters = new Map<ApiType, RateLimiter>();

/**
 * Create a new rate limiter instance
 */
export function createRateLimiter(options: {
  requestsPerSecond: number;
}): RateLimiter {
  return new RateLimiterImpl(options.requestsPerSecond);
}

/**
 * Get singleton rate limiter for the specified API type
 *
 * Note: Configuration is only used on first call. Subsequent calls
 * return the existing singleton regardless of config changes.
 */
export function getRateLimiter(api: ApiType, config: RateLimiterConfig): RateLimiter {
  const existing = limiters.get(api);
  if (existing) {
    return existing;
  }

  const requestsPerSecond = getRequestsPerSecond(api, config);
  const limiter = createRateLimiter({ requestsPerSecond });
  limiters.set(api, limiter);

  return limiter;
}

/**
 * Determine requests per second based on API type and configuration
 */
function getRequestsPerSecond(api: ApiType, config: RateLimiterConfig): number {
  switch (api) {
    case "pubmed":
      return config.pubmedApiKey ? RATE_LIMITS.pubmed.withApiKey : RATE_LIMITS.pubmed.withoutApiKey;
    case "crossref":
      return RATE_LIMITS.crossref;
  }
}

/**
 * Reset all rate limiter singletons (for test isolation)
 */
export function resetRateLimiters(): void {
  limiters.clear();
}
