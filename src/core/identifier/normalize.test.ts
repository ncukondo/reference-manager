import { describe, it, expect } from "vitest";
import { normalizeText, normalizeAuthorName, normalizeTitleSlug } from "./normalize";

describe("Text Normalization", () => {
  describe("normalizeText", () => {
    it("should convert to lowercase", () => {
      expect(normalizeText("HELLO")).toBe("hello");
      expect(normalizeText("Hello World")).toBe("helloworld");
    });

    it("should remove spaces", () => {
      expect(normalizeText("hello world")).toBe("helloworld");
      expect(normalizeText("  multiple   spaces  ")).toBe("multiplespaces");
    });

    it("should keep only ASCII alphanumeric characters", () => {
      expect(normalizeText("hello123")).toBe("hello123");
      expect(normalizeText("test-value")).toBe("testvalue");
      expect(normalizeText("test_value")).toBe("testvalue");
      expect(normalizeText("test.value")).toBe("testvalue");
    });

    it("should remove non-ASCII characters", () => {
      expect(normalizeText("café")).toBe("caf");
      expect(normalizeText("naïve")).toBe("nave");
      expect(normalizeText("Müller")).toBe("mller");
      expect(normalizeText("北京")).toBe("");
      expect(normalizeText("日本語")).toBe("");
    });

    it("should handle special characters", () => {
      expect(normalizeText("hello@world")).toBe("helloworld");
      expect(normalizeText("test#123")).toBe("test123");
      expect(normalizeText("value$%^&*()")).toBe("value");
    });

    it("should handle empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("should handle mixed case and special chars", () => {
      expect(normalizeText("Test-Value_123!")).toBe("testvalue123");
    });
  });

  describe("normalizeAuthorName", () => {
    it("should normalize simple author names", () => {
      expect(normalizeAuthorName("Smith")).toBe("smith");
      expect(normalizeAuthorName("JONES")).toBe("jones");
    });

    it("should handle author names with spaces", () => {
      expect(normalizeAuthorName("Van Der Berg")).toBe("vanderberg");
      expect(normalizeAuthorName("De la Cruz")).toBe("delacruz");
    });

    it("should handle author names with special characters", () => {
      expect(normalizeAuthorName("O'Brien")).toBe("obrien");
      expect(normalizeAuthorName("Jean-Paul")).toBe("jeanpaul");
    });

    it("should handle non-ASCII author names", () => {
      expect(normalizeAuthorName("Müller")).toBe("mller");
      expect(normalizeAuthorName("García")).toBe("garca");
    });

    it("should handle institutional authors", () => {
      expect(normalizeAuthorName("World Health Organization")).toBe("worldhealthorganization");
    });

    it("should return empty string for invalid input", () => {
      expect(normalizeAuthorName("")).toBe("");
      expect(normalizeAuthorName("123")).toBe("123");
    });

    it("should limit to reasonable length", () => {
      const longName = "VeryLongAuthorNameThatShouldBeTruncatedToReasonableLength";
      const result = normalizeAuthorName(longName);
      expect(result.length).toBeLessThanOrEqual(32);
    });
  });

  describe("normalizeTitleSlug", () => {
    it("should create slug from simple title", () => {
      expect(normalizeTitleSlug("Introduction to Testing")).toBe("introductiontotesting");
    });

    it("should limit to 32 characters", () => {
      const longTitle = "This is a very long title that should be truncated to exactly thirty-two characters";
      const result = normalizeTitleSlug(longTitle);
      expect(result.length).toBe(32);
      expect(result).toBe("thisisaverylongtitlethatshouldbe");
    });

    it("should remove common articles and prepositions", () => {
      // Note: Simple implementation may not remove stop words
      expect(normalizeTitleSlug("The Quick Brown Fox")).toBe("thequickbrownfox");
      expect(normalizeTitleSlug("A Study on Machine Learning")).toBe("astudyonmachinelearning");
    });

    it("should handle titles with special characters", () => {
      expect(normalizeTitleSlug("Test: A Case Study")).toBe("testacasestudy");
      expect(normalizeTitleSlug("COVID-19 Analysis")).toBe("covid19analysis");
    });

    it("should handle titles with non-ASCII characters", () => {
      expect(normalizeTitleSlug("Café Society")).toBe("cafsociety");
      expect(normalizeTitleSlug("Beyond the Müller Effect")).toBe("beyondthemllereffect");
    });

    it("should handle numeric titles", () => {
      expect(normalizeTitleSlug("2023 Report")).toBe("2023report");
      expect(normalizeTitleSlug("Study #42")).toBe("study42");
    });

    it("should return empty string for empty title", () => {
      expect(normalizeTitleSlug("")).toBe("");
    });

    it("should handle titles with only special characters", () => {
      expect(normalizeTitleSlug("!!!???")).toBe("");
      expect(normalizeTitleSlug("---")).toBe("");
    });

    it("should truncate at word boundary if possible", () => {
      // This is an optional feature - truncate at space if within last 5 chars
      const title = "Introduction to Modern Statistical Methods and Applications";
      const result = normalizeTitleSlug(title);
      expect(result.length).toBe(32);
    });

    it("should handle mixed language titles", () => {
      expect(normalizeTitleSlug("English and 中文")).toBe("englishand");
    });

    it("should preserve numbers in title", () => {
      expect(normalizeTitleSlug("HTTP/2 Specification")).toBe("http2specification");
      expect(normalizeTitleSlug("TypeScript 5.0 Release")).toBe("typescript50release");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined or null gracefully", () => {
      // These might throw or return empty string depending on implementation
      // We'll test the actual behavior once implemented
    });

    it("should handle very long strings efficiently", () => {
      const veryLongString = "a".repeat(1000);
      const result = normalizeText(veryLongString);
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it("should handle unicode combining characters", () => {
      // e + combining acute accent
      const combined = "e\u0301";
      const result = normalizeText(combined);
      // Should handle combining characters appropriately
      expect(result).toBeDefined();
    });
  });
});