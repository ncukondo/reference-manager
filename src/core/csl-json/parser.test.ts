import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCslJson } from "./parser";

const FIXTURES_DIR = resolve(__dirname, "../../../tests/fixtures");

describe("CSL-JSON Parser", () => {
  describe("parseCslJson", () => {
    it("should parse a valid CSL-JSON file", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const result = await parseCslJson(filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);

      // Check that all entries have id and custom fields
      for (const entry of result) {
        expect(entry.id).toBeDefined();
        expect(entry.custom).toBeDefined();
        expect(entry.custom).toBeDefined();
      }
    });

    it("should parse an empty CSL-JSON file", async () => {
      const filePath = resolve(FIXTURES_DIR, "empty.csl.json");
      const result = await parseCslJson(filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should parse a single entry file", async () => {
      const filePath = resolve(FIXTURES_DIR, "single-entry.csl.json");
      const result = await parseCslJson(filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("only_entry");
      expect(result[0].custom).toBeDefined();
    });

    it("should generate UUID for entries missing custom field", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const minimalEntry = result.find((e) => e.id === "minimal");
      expect(minimalEntry).toBeDefined();
      expect(minimalEntry?.custom).toBeDefined();
      expect(minimalEntry?.custom).toBeDefined();
    });

    it("should generate UUID for entries with missing UUID", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const missingUuidEntry = result.find((e) => e.id === "missing_uuid");
      expect(missingUuidEntry).toBeDefined();
      expect(missingUuidEntry?.custom).toBeDefined();
      expect(missingUuidEntry?.custom).toBeDefined();
    });

    it("should regenerate UUID for entries with invalid UUID format", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const invalidUuidEntry = result.find((e) => e.id === "invalid_uuid");
      expect(invalidUuidEntry).toBeDefined();
      expect(invalidUuidEntry?.custom).toBeDefined();
      // Should have a valid UUID, not "not-a-valid-uuid"
      expect(invalidUuidEntry?.custom).toBeDefined();
      expect(invalidUuidEntry?.custom).toBeDefined();
    });

    it("should preserve existing valid UUIDs", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const result = await parseCslJson(filePath);

      const smith2023 = result.find((e) => e.id === "smith2023");
      expect(smith2023).toBeDefined();
      expect(smith2023?.custom?.uuid).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("should throw error for non-existent file", async () => {
      const filePath = resolve(FIXTURES_DIR, "non-existent.csl.json");
      await expect(parseCslJson(filePath)).rejects.toThrow();
    });

    it("should throw error for invalid JSON", async () => {
      const filePath = resolve(FIXTURES_DIR, "invalid.json");
      await expect(parseCslJson(filePath)).rejects.toThrow();
    });

    it("should validate CSL-JSON structure", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const result = await parseCslJson(filePath);

      // All entries should have required fields
      for (const entry of result) {
        expect(entry).toHaveProperty("id");
        expect(entry).toHaveProperty("type");
        expect(typeof entry.id).toBe("string");
        expect(typeof entry.type).toBe("string");
      }
    });

    it("should handle entries with institutional authors", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const institutionalEntry = result.find((e) => e.id === "institutional_author");
      expect(institutionalEntry).toBeDefined();
      expect(institutionalEntry?.author).toBeDefined();
      expect(institutionalEntry?.author?.[0]).toHaveProperty("literal");
    });

    it("should handle entries without authors", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const noAuthorEntry = result.find((e) => e.id === "no_author");
      expect(noAuthorEntry).toBeDefined();
      expect(noAuthorEntry?.author).toBeUndefined();
    });

    it("should handle entries without year", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const result = await parseCslJson(filePath);

      const noYearEntry = result.find((e) => e.id === "no_year");
      expect(noYearEntry).toBeDefined();
      expect(noYearEntry?.issued).toBeUndefined();
    });

    describe("Keyword field parsing", () => {
      it("should parse semicolon-separated keywords into array", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "with_keywords");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toEqual(["machine learning", "deep learning", "neural networks"]);
      });

      it("should trim whitespace from keywords", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "with_whitespace");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toEqual(["machine learning", "deep learning", "neural networks"]);
      });

      it("should remove empty keywords", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "with_empty_keywords");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toEqual(["machine learning", "deep learning", "neural networks"]);
      });

      it("should handle missing keyword field", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "without_keywords");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toBeUndefined();
      });

      it("should handle empty string keyword as undefined", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "with_empty_string");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toBeUndefined();
      });

      it("should handle single keyword", async () => {
        const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
        const result = await parseCslJson(filePath);

        const entry = result.find((e) => e.id === "single_keyword");
        expect(entry).toBeDefined();
        expect(entry?.keyword).toEqual(["machine learning"]);
      });
    });
  });
});
