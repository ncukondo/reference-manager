import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCslJson } from "./parser";
import type { CslLibrary } from "./types";
import { validateCslJson } from "./validator";

const FIXTURES_DIR = resolve(__dirname, "../../../tests/fixtures");

describe("CSL-JSON Validator", () => {
  describe("validateCslJson", () => {
    it("should validate a valid CSL-JSON library", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const library = await parseCslJson(filePath);

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
    });

    it("should validate an empty library", () => {
      const emptyLibrary: CslLibrary = [];

      const result = validateCslJson(emptyLibrary);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should validate a single entry", async () => {
      const filePath = resolve(FIXTURES_DIR, "single-entry.csl.json");
      const library = await parseCslJson(filePath);

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it("should validate entries with edge cases", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const library = await parseCslJson(filePath);

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should allow additional fields (passthrough)", () => {
      const library: unknown = [
        {
          id: "test",
          type: "article",
          title: "Test Article",
          customField: "This should be allowed",
          anotherCustomField: 123,
        },
      ];

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect((result[0] as { customField: string }).customField).toBe("This should be allowed");
    });

    it("should throw error for non-array data", () => {
      const invalidData: unknown = {
        not: "an array",
        this: "should fail",
      };

      expect(() => validateCslJson(invalidData)).toThrow();
    });

    it("should throw error for entry missing id field", () => {
      const invalidLibrary: unknown = [
        {
          type: "article",
          title: "Missing ID",
        },
      ];

      expect(() => validateCslJson(invalidLibrary)).toThrow(/id/i);
    });

    it("should throw error for entry missing type field", () => {
      const invalidLibrary: unknown = [
        {
          id: "test",
          title: "Missing Type",
        },
      ];

      expect(() => validateCslJson(invalidLibrary)).toThrow(/type/i);
    });

    it("should throw error for invalid author structure", () => {
      const invalidLibrary: unknown = [
        {
          id: "test",
          type: "article",
          author: "This should be an array",
        },
      ];

      expect(() => validateCslJson(invalidLibrary)).toThrow();
    });

    it("should throw error for invalid date structure", () => {
      const invalidLibrary: unknown = [
        {
          id: "test",
          type: "article",
          issued: "2023",
        },
      ];

      expect(() => validateCslJson(invalidLibrary)).toThrow();
    });

    it("should validate entries with institutional authors", () => {
      const library: CslLibrary = [
        {
          id: "institutional",
          type: "report",
          author: [
            {
              literal: "World Health Organization",
            },
          ],
        },
      ];

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].author?.[0]).toHaveProperty("literal");
    });

    it("should validate entries without authors", () => {
      const library: CslLibrary = [
        {
          id: "no_author",
          type: "article",
          title: "Article without author",
        },
      ];

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it("should validate entries with complete date structure", () => {
      const library: CslLibrary = [
        {
          id: "full_date",
          type: "article",
          issued: {
            "date-parts": [[2023, 5, 15]],
          },
        },
      ];

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].issued?.["date-parts"]?.[0]).toEqual([2023, 5, 15]);
    });

    it("should validate entries with all standard fields", () => {
      const library: CslLibrary = [
        {
          id: "complete_entry",
          type: "article-journal",
          title: "Complete Article",
          author: [
            {
              family: "Smith",
              given: "John",
            },
          ],
          issued: {
            "date-parts": [[2023]],
          },
          "container-title": "Journal of Testing",
          volume: "10",
          issue: "2",
          page: "100-110",
          DOI: "10.1234/test",
          PMID: "12345678",
          URL: "https://example.com",
          abstract: "This is a test abstract",
          publisher: "Test Publisher",
          "publisher-place": "Test City",
          note: "Test note",
          custom: {
            uuid: "550e8400-e29b-41d4-a716-446655440001",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];

      const result = validateCslJson(library);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].DOI).toBe("10.1234/test");
      expect(result[0].PMID).toBe("12345678");
    });

    it("should provide meaningful error messages", () => {
      const invalidLibrary: unknown = [
        {
          id: 123, // Should be string
          type: "article",
        },
      ];

      expect(() => validateCslJson(invalidLibrary)).toThrow();
    });
  });
});
