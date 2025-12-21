/**
 * Remote API tests for fetcher module
 *
 * These tests make actual API calls and are run in the "remote" vitest workspace.
 * Run with: npm test -- --project remote
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type PubmedConfig, fetchDoi, fetchPmids } from "./fetcher.js";
import { resetRateLimiters } from "./rate-limiter.js";

describe("fetchPmids (remote)", () => {
  beforeEach(() => {
    resetRateLimiters();
  });

  afterEach(() => {
    resetRateLimiters();
  });

  describe("real API calls", () => {
    it("should fetch a valid PMID from PMC API", async () => {
      // PMID 28012456 - A real PubMed article
      const config: PubmedConfig = {};
      const results = await fetchPmids(["28012456"], config);

      expect(results).toHaveLength(1);
      expect(results[0].pmid).toBe("28012456");
      expect(results[0].success).toBe(true);

      if (results[0].success) {
        expect(results[0].item.id).toContain("28012456");
        expect(results[0].item.type).toBeDefined();
        expect(results[0].item.title).toBeDefined();
      }
    });

    it("should fetch multiple PMIDs in a single batch request", async () => {
      // Two real PubMed articles
      const config: PubmedConfig = {};
      const results = await fetchPmids(["28012456", "29886577"], config);

      expect(results).toHaveLength(2);

      const first = results.find((r) => r.pmid === "28012456");
      const second = results.find((r) => r.pmid === "29886577");

      expect(first?.success).toBe(true);
      expect(second?.success).toBe(true);

      if (first?.success) {
        expect(first.item.title).toBeDefined();
      }
      if (second?.success) {
        expect(second.item.title).toBeDefined();
      }
    });

    it("should handle non-existent PMID", async () => {
      // A PMID that doesn't exist
      const config: PubmedConfig = {};
      const results = await fetchPmids(["99999999999"], config);

      expect(results).toHaveLength(1);
      expect(results[0].pmid).toBe("99999999999");
      expect(results[0].success).toBe(false);

      if (!results[0].success) {
        expect(results[0].error).toContain("not found");
      }
    });

    it("should handle mixed valid and invalid PMIDs", async () => {
      const config: PubmedConfig = {};
      const results = await fetchPmids(["28012456", "99999999999"], config);

      expect(results).toHaveLength(2);

      const valid = results.find((r) => r.pmid === "28012456");
      const invalid = results.find((r) => r.pmid === "99999999999");

      expect(valid?.success).toBe(true);
      expect(invalid?.success).toBe(false);
    });
  });
});

describe("fetchDoi (remote)", () => {
  beforeEach(() => {
    resetRateLimiters();
  });

  afterEach(() => {
    resetRateLimiters();
  });

  describe("real API calls", () => {
    it("should fetch a valid DOI", async () => {
      // A real DOI - Nature article
      const result = await fetchDoi("10.1038/nature12373");

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.item.DOI).toBe("10.1038/nature12373");
        expect(result.item.type).toBeDefined();
        expect(result.item.title).toBeDefined();
      }
    });

    it("should fetch a DOI with special characters", async () => {
      // DOI with parentheses
      const result = await fetchDoi(
        "10.1002/(sici)1097-0258(19980815/30)17:15/16<1661::aid-sim968>3.0.co;2-2"
      );

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.item.type).toBeDefined();
      }
    });

    it("should handle non-existent DOI", async () => {
      // A DOI that doesn't exist
      const result = await fetchDoi("10.1234/nonexistent-doi-12345");

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("should return error for invalid DOI format", async () => {
      const result = await fetchDoi("not-a-valid-doi");

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toContain("Invalid DOI");
      }
    });
  });
});
