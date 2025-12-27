import { describe, expect, it } from "vitest";
import { normalizeDoi, normalizePmid } from "./normalizer.js";

describe("normalizeDoi", () => {
  describe("standard DOI passthrough", () => {
    it("should return standard DOI as-is", () => {
      expect(normalizeDoi("10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should preserve DOI with complex suffix", () => {
      expect(normalizeDoi("10.1038/s41558-023-0001")).toBe("10.1038/s41558-023-0001");
    });

    it("should preserve DOI with special characters", () => {
      expect(normalizeDoi("10.1000/journal.pone.0000001")).toBe("10.1000/journal.pone.0000001");
    });

    it("should preserve DOI case", () => {
      expect(normalizeDoi("10.1000/XYZ123")).toBe("10.1000/XYZ123");
    });
  });

  describe("URL prefix removal", () => {
    it("should remove https://doi.org/ prefix", () => {
      expect(normalizeDoi("https://doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should remove http://doi.org/ prefix", () => {
      expect(normalizeDoi("http://doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should remove https://dx.doi.org/ prefix", () => {
      expect(normalizeDoi("https://dx.doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should remove http://dx.doi.org/ prefix", () => {
      expect(normalizeDoi("http://dx.doi.org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should handle uppercase URL prefix", () => {
      expect(normalizeDoi("HTTPS://DOI.ORG/10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should handle mixed case URL prefix", () => {
      expect(normalizeDoi("Https://Doi.Org/10.1000/xyz123")).toBe("10.1000/xyz123");
    });
  });

  describe("edge cases", () => {
    it("should handle DOI with parentheses", () => {
      expect(normalizeDoi("https://doi.org/10.1000/(test)")).toBe("10.1000/(test)");
    });

    it("should handle DOI with encoded characters in URL", () => {
      // URL encoding should be preserved after prefix removal
      expect(normalizeDoi("https://doi.org/10.1000/test%20space")).toBe("10.1000/test%20space");
    });

    it("should not modify non-DOI strings", () => {
      // Non-DOI input is returned as-is
      expect(normalizeDoi("not-a-doi")).toBe("not-a-doi");
    });

    it("should handle empty string", () => {
      expect(normalizeDoi("")).toBe("");
    });

    it("should handle DOI starting after prefix without 10.", () => {
      // Invalid DOI but we just strip the prefix
      expect(normalizeDoi("https://doi.org/invalid")).toBe("invalid");
    });
  });

  describe("whitespace handling", () => {
    it("should trim leading whitespace", () => {
      expect(normalizeDoi("  10.1000/xyz123")).toBe("10.1000/xyz123");
    });

    it("should trim trailing whitespace", () => {
      expect(normalizeDoi("10.1000/xyz123  ")).toBe("10.1000/xyz123");
    });

    it("should trim whitespace around URL", () => {
      expect(normalizeDoi("  https://doi.org/10.1000/xyz123  ")).toBe("10.1000/xyz123");
    });
  });
});

describe("normalizePmid", () => {
  describe("numeric PMID passthrough", () => {
    it("should return numeric PMID as-is", () => {
      expect(normalizePmid("12345678")).toBe("12345678");
    });

    it("should preserve short PMID", () => {
      expect(normalizePmid("123")).toBe("123");
    });

    it("should preserve long PMID", () => {
      expect(normalizePmid("123456789012")).toBe("123456789012");
    });
  });

  describe("prefix removal", () => {
    it("should remove PMID: prefix", () => {
      expect(normalizePmid("PMID:12345678")).toBe("12345678");
    });

    it("should remove pmid: prefix (lowercase)", () => {
      expect(normalizePmid("pmid:12345678")).toBe("12345678");
    });

    it("should remove Pmid: prefix (mixed case)", () => {
      expect(normalizePmid("Pmid:12345678")).toBe("12345678");
    });

    it("should remove PMID: prefix with single space after colon", () => {
      expect(normalizePmid("PMID: 12345678")).toBe("12345678");
    });

    it("should remove pmid: prefix with multiple spaces after colon", () => {
      expect(normalizePmid("pmid:  12345678")).toBe("12345678");
    });

    it("should remove PMID: prefix with tab after colon", () => {
      expect(normalizePmid("PMID:\t12345678")).toBe("12345678");
    });
  });

  describe("whitespace handling", () => {
    it("should trim leading whitespace", () => {
      expect(normalizePmid("  12345678")).toBe("12345678");
    });

    it("should trim trailing whitespace", () => {
      expect(normalizePmid("12345678  ")).toBe("12345678");
    });

    it("should trim whitespace around prefixed PMID", () => {
      expect(normalizePmid("  PMID:12345678  ")).toBe("12345678");
    });

    it("should trim whitespace with space after colon", () => {
      expect(normalizePmid("  PMID: 12345678  ")).toBe("12345678");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(normalizePmid("")).toBe("");
    });

    it("should handle whitespace-only string", () => {
      expect(normalizePmid("   ")).toBe("");
    });

    it("should not remove partial prefix", () => {
      // "PMI:" is not a valid prefix
      expect(normalizePmid("PMI:12345678")).toBe("PMI:12345678");
    });

    it("should handle PMID: without number", () => {
      expect(normalizePmid("PMID:")).toBe("");
    });

    it("should handle PMID: with only spaces", () => {
      expect(normalizePmid("PMID:   ")).toBe("");
    });
  });
});
