import { describe, expect, it } from "vitest";
import {
  extractUppercaseSegments,
  hasConsecutiveUppercase,
  matchWithUppercaseSensitivity,
} from "./uppercase.js";

describe("uppercase", () => {
  describe("hasConsecutiveUppercase", () => {
    it("should return true for consecutive uppercase letters", () => {
      expect(hasConsecutiveUppercase("AI")).toBe(true);
      expect(hasConsecutiveUppercase("RNA")).toBe(true);
      expect(hasConsecutiveUppercase("API")).toBe(true);
      expect(hasConsecutiveUppercase("CRISPR")).toBe(true);
    });

    it("should return false for lowercase text", () => {
      expect(hasConsecutiveUppercase("api")).toBe(false);
      expect(hasConsecutiveUppercase("machine learning")).toBe(false);
    });

    it("should return false for single uppercase letter", () => {
      expect(hasConsecutiveUppercase("Ai")).toBe(false);
      expect(hasConsecutiveUppercase("A")).toBe(false);
      expect(hasConsecutiveUppercase("Machine")).toBe(false);
    });

    it("should return true for text containing consecutive uppercase", () => {
      expect(hasConsecutiveUppercase("AI therapy")).toBe(true);
      expect(hasConsecutiveUppercase("mRNA synthesis")).toBe(true);
      expect(hasConsecutiveUppercase("using API endpoint")).toBe(true);
    });

    it("should handle empty string", () => {
      expect(hasConsecutiveUppercase("")).toBe(false);
    });

    it("should handle text with non-adjacent uppercase letters", () => {
      expect(hasConsecutiveUppercase("AaBbCc")).toBe(false);
      expect(hasConsecutiveUppercase("McDonalds")).toBe(false);
    });

    it("should detect uppercase at various positions", () => {
      expect(hasConsecutiveUppercase("start AI end")).toBe(true);
      expect(hasConsecutiveUppercase("AI")).toBe(true);
      expect(hasConsecutiveUppercase("endAI")).toBe(true);
    });
  });

  describe("extractUppercaseSegments", () => {
    it("should extract single uppercase segment", () => {
      const result = extractUppercaseSegments("AI");
      expect(result).toEqual([{ segment: "AI", start: 0, end: 2 }]);
    });

    it("should extract uppercase segment from compound word", () => {
      const result = extractUppercaseSegments("AI-based");
      expect(result).toEqual([{ segment: "AI", start: 0, end: 2 }]);
    });

    it("should extract multiple uppercase segments", () => {
      const result = extractUppercaseSegments("AI and RNA research");
      expect(result).toEqual([
        { segment: "AI", start: 0, end: 2 },
        { segment: "RNA", start: 7, end: 10 },
      ]);
    });

    it("should return empty array for no uppercase segments", () => {
      expect(extractUppercaseSegments("api")).toEqual([]);
      expect(extractUppercaseSegments("machine learning")).toEqual([]);
      expect(extractUppercaseSegments("")).toEqual([]);
    });

    it("should not extract single uppercase letters", () => {
      expect(extractUppercaseSegments("A")).toEqual([]);
      expect(extractUppercaseSegments("Machine")).toEqual([]);
      expect(extractUppercaseSegments("Ai")).toEqual([]);
    });

    it("should extract embedded uppercase segments", () => {
      const result = extractUppercaseSegments("mRNA");
      expect(result).toEqual([{ segment: "RNA", start: 1, end: 4 }]);
    });

    it("should extract long uppercase segments", () => {
      const result = extractUppercaseSegments("CRISPR-Cas9");
      expect(result).toEqual([{ segment: "CRISPR", start: 0, end: 6 }]);
    });

    it("should extract adjacent uppercase segments separated by non-letters", () => {
      const result = extractUppercaseSegments("AI/ML pipeline");
      expect(result).toEqual([
        { segment: "AI", start: 0, end: 2 },
        { segment: "ML", start: 3, end: 5 },
      ]);
    });

    it("should handle uppercase at end of string", () => {
      const result = extractUppercaseSegments("therapy AI");
      expect(result).toEqual([{ segment: "AI", start: 8, end: 10 }]);
    });
  });

  describe("matchWithUppercaseSensitivity", () => {
    describe("query with consecutive uppercase", () => {
      it("should match when uppercase segment matches exactly", () => {
        expect(matchWithUppercaseSensitivity("AI", "AI therapy")).toBe(true);
        expect(matchWithUppercaseSensitivity("RNA", "RNA synthesis")).toBe(true);
      });

      it("should not match when uppercase segment has different case", () => {
        expect(matchWithUppercaseSensitivity("AI", "ai therapy")).toBe(false);
        expect(matchWithUppercaseSensitivity("AI", "Ai therapy")).toBe(false);
        expect(matchWithUppercaseSensitivity("RNA", "rna synthesis")).toBe(false);
      });

      it("should match partial uppercase segment in target", () => {
        expect(matchWithUppercaseSensitivity("RNA", "mRNA")).toBe(true);
        expect(matchWithUppercaseSensitivity("RNA", "mRNA synthesis")).toBe(true);
      });

      it("should handle mixed case query with uppercase segment", () => {
        expect(matchWithUppercaseSensitivity("AI therapy", "AI Therapy")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI therapy", "AI therapy works")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI therapy", "ai Therapy")).toBe(false);
      });

      it("should handle compound words with uppercase", () => {
        expect(matchWithUppercaseSensitivity("AI-based", "AI-Based method")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI-based", "ai-Based method")).toBe(false);
      });

      it("should handle multiple uppercase segments in query", () => {
        expect(matchWithUppercaseSensitivity("AI and RNA", "AI and RNA research")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI and RNA", "ai and RNA research")).toBe(false);
        expect(matchWithUppercaseSensitivity("AI and RNA", "AI and rna research")).toBe(false);
      });
    });

    describe("query without consecutive uppercase", () => {
      it("should match case-insensitively when no uppercase in query", () => {
        expect(matchWithUppercaseSensitivity("api", "API endpoint")).toBe(true);
        expect(matchWithUppercaseSensitivity("api", "api endpoint")).toBe(true);
        expect(matchWithUppercaseSensitivity("api", "Api endpoint")).toBe(true);
      });

      it("should match case-insensitively for regular words", () => {
        expect(matchWithUppercaseSensitivity("machine", "Machine Learning")).toBe(true);
        expect(matchWithUppercaseSensitivity("learning", "machine learning")).toBe(true);
      });

      it("should handle single uppercase letter in query", () => {
        expect(matchWithUppercaseSensitivity("Ai", "AI therapy")).toBe(true);
        expect(matchWithUppercaseSensitivity("Ai", "ai therapy")).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("should handle empty strings", () => {
        expect(matchWithUppercaseSensitivity("", "AI therapy")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI", "")).toBe(false);
        expect(matchWithUppercaseSensitivity("", "")).toBe(true);
      });

      it("should handle query longer than target", () => {
        expect(matchWithUppercaseSensitivity("AI therapy method", "AI")).toBe(false);
      });

      it("should handle exact match", () => {
        expect(matchWithUppercaseSensitivity("AI", "AI")).toBe(true);
        expect(matchWithUppercaseSensitivity("api", "api")).toBe(true);
      });

      it("should handle whitespace", () => {
        expect(matchWithUppercaseSensitivity("AI  therapy", "AI therapy")).toBe(true);
        expect(matchWithUppercaseSensitivity("AI therapy", "AI  therapy")).toBe(true);
      });
    });
  });
});
