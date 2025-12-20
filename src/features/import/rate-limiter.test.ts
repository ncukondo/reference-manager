import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApiType,
  type RateLimiterConfig,
  createRateLimiter,
  getRateLimiter,
  resetRateLimiters,
} from "./rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRateLimiters();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRateLimiters();
  });

  describe("createRateLimiter", () => {
    it("should create a rate limiter with specified requests per second", async () => {
      const limiter = createRateLimiter({ requestsPerSecond: 10 });

      expect(limiter).toBeDefined();
      expect(limiter.requestsPerSecond).toBe(10);
    });

    it("should allow first request immediately", async () => {
      const limiter = createRateLimiter({ requestsPerSecond: 10 });

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      expect(elapsed).toBe(0);
    });

    it("should delay subsequent requests to respect rate limit", async () => {
      const limiter = createRateLimiter({ requestsPerSecond: 10 }); // 100ms interval

      // First request - immediate
      await limiter.acquire();

      // Second request - should wait 100ms
      const acquirePromise = limiter.acquire();
      vi.advanceTimersByTime(100);
      await acquirePromise;

      expect(limiter.lastRequestTime).toBeGreaterThan(0);
    });

    it("should calculate correct interval for different rates", () => {
      const limiter3 = createRateLimiter({ requestsPerSecond: 3 }); // 334ms interval
      const limiter10 = createRateLimiter({ requestsPerSecond: 10 }); // 100ms interval
      const limiter50 = createRateLimiter({ requestsPerSecond: 50 }); // 20ms interval

      expect(limiter3.intervalMs).toBeCloseTo(333.33, 1);
      expect(limiter10.intervalMs).toBe(100);
      expect(limiter50.intervalMs).toBe(20);
    });

    it("should track last request time", async () => {
      const limiter = createRateLimiter({ requestsPerSecond: 10 });

      const before = Date.now();
      await limiter.acquire();
      const after = Date.now();

      expect(limiter.lastRequestTime).toBeGreaterThanOrEqual(before);
      expect(limiter.lastRequestTime).toBeLessThanOrEqual(after);
    });
  });

  describe("getRateLimiter (singleton factory)", () => {
    it("should return singleton for same API type", () => {
      const config: RateLimiterConfig = {};

      const limiter1 = getRateLimiter("pubmed", config);
      const limiter2 = getRateLimiter("pubmed", config);

      expect(limiter1).toBe(limiter2);
    });

    it("should return different instances for different API types", () => {
      const config: RateLimiterConfig = {};

      const pubmedLimiter = getRateLimiter("pubmed", config);
      const crossrefLimiter = getRateLimiter("crossref", config);

      expect(pubmedLimiter).not.toBe(crossrefLimiter);
    });

    it("should use 3 req/sec for PubMed without API key", () => {
      const config: RateLimiterConfig = {};

      const limiter = getRateLimiter("pubmed", config);

      expect(limiter.requestsPerSecond).toBe(3);
      expect(limiter.intervalMs).toBeCloseTo(333.33, 1);
    });

    it("should use 10 req/sec for PubMed with API key", () => {
      const config: RateLimiterConfig = { pubmedApiKey: "test-api-key" };

      const limiter = getRateLimiter("pubmed", config);

      expect(limiter.requestsPerSecond).toBe(10);
      expect(limiter.intervalMs).toBe(100);
    });

    it("should use 50 req/sec for Crossref", () => {
      const config: RateLimiterConfig = {};

      const limiter = getRateLimiter("crossref", config);

      expect(limiter.requestsPerSecond).toBe(50);
      expect(limiter.intervalMs).toBe(20);
    });

    it("should preserve existing singleton even with different config", () => {
      // First call without API key
      const limiter1 = getRateLimiter("pubmed", {});
      expect(limiter1.requestsPerSecond).toBe(3);

      // Second call with API key - should return same instance
      const limiter2 = getRateLimiter("pubmed", { pubmedApiKey: "key" });
      expect(limiter2).toBe(limiter1);
      expect(limiter2.requestsPerSecond).toBe(3); // Still 3, not 10
    });
  });

  describe("resetRateLimiters", () => {
    it("should clear all singletons", () => {
      const config: RateLimiterConfig = {};

      const limiter1 = getRateLimiter("pubmed", config);
      resetRateLimiters();
      const limiter2 = getRateLimiter("pubmed", config);

      expect(limiter1).not.toBe(limiter2);
    });

    it("should allow new configuration after reset", () => {
      // First: no API key
      const limiter1 = getRateLimiter("pubmed", {});
      expect(limiter1.requestsPerSecond).toBe(3);

      // Reset
      resetRateLimiters();

      // Second: with API key
      const limiter2 = getRateLimiter("pubmed", { pubmedApiKey: "key" });
      expect(limiter2.requestsPerSecond).toBe(10);
    });
  });

  describe("concurrent access", () => {
    it("should queue multiple concurrent requests", async () => {
      const limiter = createRateLimiter({ requestsPerSecond: 10 }); // 100ms interval
      const times: number[] = [];

      // Start 3 concurrent acquire calls
      const p1 = limiter.acquire().then(() => times.push(Date.now()));
      const p2 = limiter.acquire().then(() => times.push(Date.now()));
      const p3 = limiter.acquire().then(() => times.push(Date.now()));

      // Use async timer advancement to handle Promise chains properly
      await vi.advanceTimersByTimeAsync(0); // First request
      await vi.advanceTimersByTimeAsync(100); // Second request
      await vi.advanceTimersByTimeAsync(100); // Third request

      await Promise.all([p1, p2, p3]);

      expect(times).toHaveLength(3);
      // Requests should be spaced by at least the interval
      expect(times[1] - times[0]).toBeGreaterThanOrEqual(100);
      expect(times[2] - times[1]).toBeGreaterThanOrEqual(100);
    });
  });

  describe("rate limit values", () => {
    const testCases: Array<{
      api: ApiType;
      config: RateLimiterConfig;
      expectedRate: number;
      description: string;
    }> = [
      {
        api: "pubmed",
        config: {},
        expectedRate: 3,
        description: "PubMed without API key",
      },
      {
        api: "pubmed",
        config: { pubmedApiKey: "key" },
        expectedRate: 10,
        description: "PubMed with API key",
      },
      {
        api: "crossref",
        config: {},
        expectedRate: 50,
        description: "Crossref",
      },
    ];

    for (const { api, config, expectedRate, description } of testCases) {
      it(`should use ${expectedRate} req/sec for ${description}`, () => {
        resetRateLimiters();
        const limiter = getRateLimiter(api, config);
        expect(limiter.requestsPerSecond).toBe(expectedRate);
      });
    }
  });
});
