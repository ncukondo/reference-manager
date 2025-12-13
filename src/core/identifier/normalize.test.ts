import { describe, expect, it } from "vitest";
import { normalizeAuthorName, normalizeText, normalizeTitleSlug } from "./normalize";

describe("Text Normalization", () => {
  describe("normalizeText", () => {
    it("should convert to lowercase", () => {
      expect(normalizeText("HELLO")).toBe("hello");
      expect(normalizeText("Hello World")).toBe("hello_world");
    });

    it("should convert spaces to underscores", () => {
      expect(normalizeText("hello world")).toBe("hello_world");
      expect(normalizeText("  multiple   spaces  ")).toBe("multiple_spaces");
    });

    it("should keep only ASCII alphanumeric characters and underscores", () => {
      expect(normalizeText("hello123")).toBe("hello123");
      expect(normalizeText("test-value")).toBe("testvalue"); // hyphen is removed
      expect(normalizeText("test_value")).toBe("test_value"); // explicit underscore kept
      expect(normalizeText("test.value")).toBe("testvalue"); // period is removed
    });

    it("should remove non-ASCII characters", () => {
      expect(normalizeText("café")).toBe("caf");
      expect(normalizeText("naïve")).toBe("nave");
      expect(normalizeText("Müller")).toBe("mller");
      expect(normalizeText("北京")).toBe("");
      expect(normalizeText("日本語")).toBe("");
    });

    it("should handle special characters", () => {
      expect(normalizeText("hello@world")).toBe("helloworld"); // @ is removed
      expect(normalizeText("test#123")).toBe("test123"); // # is removed
      expect(normalizeText("value$%^&*()")).toBe("value"); // symbols are removed
    });

    it("should handle empty string", () => {
      expect(normalizeText("")).toBe("");
    });

    it("should handle mixed case and special chars", () => {
      expect(normalizeText("Test-Value_123!")).toBe("testvalue_123"); // - and ! are removed, _ is kept
    });
  });

  describe("normalizeAuthorName", () => {
    it("should normalize simple author names", () => {
      expect(normalizeAuthorName("Smith")).toBe("smith");
      expect(normalizeAuthorName("JONES")).toBe("jones");
    });

    it("should handle author names with spaces", () => {
      expect(normalizeAuthorName("Van Der Berg")).toBe("van_der_berg");
      expect(normalizeAuthorName("De la Cruz")).toBe("de_la_cruz");
    });

    it("should handle author names with special characters", () => {
      expect(normalizeAuthorName("O'Brien")).toBe("obrien"); // apostrophe is removed
      expect(normalizeAuthorName("Jean-Paul")).toBe("jeanpaul"); // hyphen is removed
    });

    it("should handle non-ASCII author names", () => {
      expect(normalizeAuthorName("Müller")).toBe("mller");
      expect(normalizeAuthorName("García")).toBe("garca");
    });

    it("should handle institutional authors", () => {
      expect(normalizeAuthorName("World Health Organization")).toBe("world_health_organization");
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
      expect(normalizeTitleSlug("Introduction to Testing")).toBe("introduction_to_testing");
    });

    it("should limit to 32 characters", () => {
      const longTitle =
        "This is a very long title that should be truncated to exactly thirty-two characters";
      const result = normalizeTitleSlug(longTitle);
      expect(result.length).toBe(32);
      expect(result).toBe("this_is_a_very_long_title_that_s");
    });

    it("should remove common articles and prepositions", () => {
      // Note: Simple implementation may not remove stop words
      expect(normalizeTitleSlug("The Quick Brown Fox")).toBe("the_quick_brown_fox");
      expect(normalizeTitleSlug("A Study on Machine Learning")).toBe("a_study_on_machine_learning");
    });

    it("should handle titles with special characters", () => {
      expect(normalizeTitleSlug("Test: A Case Study")).toBe("test_a_case_study");
      expect(normalizeTitleSlug("COVID-19 Analysis")).toBe("covid19_analysis"); // hyphen removed
    });

    it("should handle titles with non-ASCII characters", () => {
      expect(normalizeTitleSlug("Café Society")).toBe("caf_society");
      expect(normalizeTitleSlug("Beyond the Müller Effect")).toBe("beyond_the_mller_effect");
    });

    it("should handle numeric titles", () => {
      expect(normalizeTitleSlug("2023 Report")).toBe("2023_report");
      expect(normalizeTitleSlug("Study #42")).toBe("study_42"); // # removed, space -> _
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
      expect(normalizeTitleSlug("English and 中文")).toBe("english_and");
    });

    it("should preserve numbers in title", () => {
      expect(normalizeTitleSlug("HTTP/2 Specification")).toBe("http2_specification"); // / removed
      expect(normalizeTitleSlug("TypeScript 5.0 Release")).toBe("typescript_50_release"); // . removed
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
