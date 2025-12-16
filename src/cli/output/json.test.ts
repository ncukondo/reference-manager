import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types";
import { Reference } from "../../core/reference";
import { formatJson } from "./json";

describe("JSON Output Formatter", () => {
  const sampleItem1: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [
      { family: "Smith", given: "John" },
      { family: "Doe", given: "Alice" },
    ],
    issued: { "date-parts": [[2023]] },
    DOI: "10.1234/jmi.2023.0045",
    PMID: "12345678",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const sampleItem2: CslItem = {
    id: "jones-2022",
    type: "book",
    title: "Introduction to Computer Science",
    author: [{ family: "Jones", given: "Bob" }],
    issued: { "date-parts": [[2022]] },
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("formatJson", () => {
    it("should format empty array as empty JSON array", () => {
      const result = formatJson([]);
      expect(result).toBe("[]");
    });

    it("should format single reference as JSON array", () => {
      const ref = new Reference(sampleItem1);
      const result = formatJson([ref]);

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("smith-2023");
      expect(parsed[0].title).toBe("Machine Learning in Medical Diagnosis");
    });

    it("should format multiple references as JSON array", () => {
      const ref1 = new Reference(sampleItem1);
      const ref2 = new Reference(sampleItem2);
      const result = formatJson([ref1, ref2]);

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("smith-2023");
      expect(parsed[1].id).toBe("jones-2022");
    });

    it("should include all CSL-JSON fields", () => {
      const ref = new Reference(sampleItem1);
      const result = formatJson([ref]);

      const parsed = JSON.parse(result);
      expect(parsed[0]).toHaveProperty("id");
      expect(parsed[0]).toHaveProperty("type");
      expect(parsed[0]).toHaveProperty("title");
      expect(parsed[0]).toHaveProperty("author");
      expect(parsed[0]).toHaveProperty("issued");
      expect(parsed[0]).toHaveProperty("DOI");
      expect(parsed[0]).toHaveProperty("PMID");
      expect(parsed[0]).toHaveProperty("custom");
    });

    it("should preserve custom fields including UUID", () => {
      const ref = new Reference(sampleItem1);
      const result = formatJson([ref]);

      const parsed = JSON.parse(result);
      expect(parsed[0].custom.uuid).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(parsed[0].custom.created_at).toBe("2024-01-01T00:00:00.000Z");
      expect(parsed[0].custom.timestamp).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should produce compact JSON without formatting", () => {
      const ref = new Reference(sampleItem1);
      const result = formatJson([ref]);

      // Compact JSON should not have newlines or extra spaces
      expect(result).not.toContain("\n");
      expect(result).not.toMatch(/\s{2,}/); // No consecutive spaces
    });

    it("should produce valid JSON that can be parsed", () => {
      const ref1 = new Reference(sampleItem1);
      const ref2 = new Reference(sampleItem2);
      const result = formatJson([ref1, ref2]);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("should handle references with minimal fields", () => {
      const minimalItem: CslItem = {
        id: "minimal-2024",
        type: "article",
      };
      const ref = new Reference(minimalItem);
      const result = formatJson([ref]);

      const parsed = JSON.parse(result);
      expect(parsed[0].id).toBe("minimal-2024");
      expect(parsed[0].type).toBe("article");
    });

    it("should preserve field order consistently", () => {
      const ref = new Reference(sampleItem1);
      const result1 = formatJson([ref]);
      const result2 = formatJson([ref]);

      expect(result1).toBe(result2);
    });
  });
});
