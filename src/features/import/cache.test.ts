import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import {
  type CacheConfig,
  cacheDoiResult,
  cachePmidResult,
  getDoiFromCache,
  getPmidFromCache,
  resetCache,
} from "./cache.js";

describe("cache module", () => {
  beforeEach(() => {
    resetCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockCslItem: CslItem = {
    id: "test-id",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
  };

  describe("PMID cache", () => {
    it("should return undefined for uncached PMID", () => {
      const result = getPmidFromCache("12345678");
      expect(result).toBeUndefined();
    });

    it("should cache and retrieve PMID result", () => {
      cachePmidResult("12345678", mockCslItem);
      const result = getPmidFromCache("12345678");
      expect(result).toEqual(mockCslItem);
    });

    it("should return undefined after TTL expires", () => {
      cachePmidResult("12345678", mockCslItem);

      // Advance time past default TTL (1 hour)
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const result = getPmidFromCache("12345678");
      expect(result).toBeUndefined();
    });

    it("should return result within TTL", () => {
      cachePmidResult("12345678", mockCslItem);

      // Advance time within TTL
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      const result = getPmidFromCache("12345678");
      expect(result).toEqual(mockCslItem);
    });

    it("should support custom TTL", () => {
      const config: CacheConfig = { ttlMs: 5000 }; // 5 seconds
      cachePmidResult("12345678", mockCslItem, config);

      // Within custom TTL
      vi.advanceTimersByTime(4000);
      expect(getPmidFromCache("12345678")).toEqual(mockCslItem);

      // After custom TTL
      vi.advanceTimersByTime(2000);
      expect(getPmidFromCache("12345678")).toBeUndefined();
    });

    it("should cache multiple PMIDs independently", () => {
      const item1: CslItem = { ...mockCslItem, id: "pmid:11111111" };
      const item2: CslItem = { ...mockCslItem, id: "pmid:22222222" };

      cachePmidResult("11111111", item1);
      cachePmidResult("22222222", item2);

      expect(getPmidFromCache("11111111")).toEqual(item1);
      expect(getPmidFromCache("22222222")).toEqual(item2);
    });

    it("should overwrite existing cache entry", () => {
      const item1: CslItem = { ...mockCslItem, title: "First" };
      const item2: CslItem = { ...mockCslItem, title: "Second" };

      cachePmidResult("12345678", item1);
      cachePmidResult("12345678", item2);

      expect(getPmidFromCache("12345678")?.title).toBe("Second");
    });
  });

  describe("DOI cache", () => {
    it("should return undefined for uncached DOI", () => {
      const result = getDoiFromCache("10.1000/test");
      expect(result).toBeUndefined();
    });

    it("should cache and retrieve DOI result", () => {
      cacheDoiResult("10.1000/test", mockCslItem);
      const result = getDoiFromCache("10.1000/test");
      expect(result).toEqual(mockCslItem);
    });

    it("should return undefined after TTL expires", () => {
      cacheDoiResult("10.1000/test", mockCslItem);

      // Advance time past default TTL (1 hour)
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      const result = getDoiFromCache("10.1000/test");
      expect(result).toBeUndefined();
    });

    it("should return result within TTL", () => {
      cacheDoiResult("10.1000/test", mockCslItem);

      // Advance time within TTL
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      const result = getDoiFromCache("10.1000/test");
      expect(result).toEqual(mockCslItem);
    });

    it("should support custom TTL", () => {
      const config: CacheConfig = { ttlMs: 5000 }; // 5 seconds
      cacheDoiResult("10.1000/test", mockCslItem, config);

      // Within custom TTL
      vi.advanceTimersByTime(4000);
      expect(getDoiFromCache("10.1000/test")).toEqual(mockCslItem);

      // After custom TTL
      vi.advanceTimersByTime(2000);
      expect(getDoiFromCache("10.1000/test")).toBeUndefined();
    });

    it("should cache multiple DOIs independently", () => {
      const item1: CslItem = { ...mockCslItem, id: "doi:10.1000/a" };
      const item2: CslItem = { ...mockCslItem, id: "doi:10.1000/b" };

      cacheDoiResult("10.1000/a", item1);
      cacheDoiResult("10.1000/b", item2);

      expect(getDoiFromCache("10.1000/a")).toEqual(item1);
      expect(getDoiFromCache("10.1000/b")).toEqual(item2);
    });
  });

  describe("cache isolation", () => {
    it("should keep PMID and DOI caches separate", () => {
      // Use same key for both (hypothetical edge case)
      const pmidItem: CslItem = { ...mockCslItem, title: "PMID Article" };
      const doiItem: CslItem = { ...mockCslItem, title: "DOI Article" };

      cachePmidResult("12345678", pmidItem);
      cacheDoiResult("12345678", doiItem);

      expect(getPmidFromCache("12345678")?.title).toBe("PMID Article");
      expect(getDoiFromCache("12345678")?.title).toBe("DOI Article");
    });
  });

  describe("resetCache", () => {
    it("should clear all cached entries", () => {
      cachePmidResult("12345678", mockCslItem);
      cacheDoiResult("10.1000/test", mockCslItem);

      resetCache();

      expect(getPmidFromCache("12345678")).toBeUndefined();
      expect(getDoiFromCache("10.1000/test")).toBeUndefined();
    });
  });
});
