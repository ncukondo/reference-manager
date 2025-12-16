import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types";
import { Reference } from "../../core/reference";
import { formatPretty } from "./pretty";

describe("Pretty Output Formatter", () => {
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
    URL: "https://example.com/article",
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

  const itemWithPMCID: CslItem = {
    id: "tanaka-2021",
    type: "article",
    title: "Deep Learning Research",
    author: [{ family: "Tanaka", given: "Taro" }],
    issued: { "date-parts": [[2021]] },
    PMCID: "PMC1234567",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440003",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const minimalItem: CslItem = {
    id: "minimal-2024",
    type: "article",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440004",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("formatPretty", () => {
    it("should format empty array as empty string", () => {
      const result = formatPretty([]);
      expect(result).toBe("");
    });

    it("should format single reference with header line", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("[smith-2023] Machine Learning in Medical Diagnosis");
    });

    it("should indent field lines with 2 spaces", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      const lines = result.split("\n");
      // Check that field lines start with 2 spaces
      expect(lines.some((line) => line.startsWith("  Authors:"))).toBe(true);
      expect(lines.some((line) => line.startsWith("  Year:"))).toBe(true);
      expect(lines.some((line) => line.startsWith("  Type:"))).toBe(true);
    });

    it("should format authors as Family, Given-Initial", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("Authors: Smith, J.; Doe, A.");
    });

    it("should format single author correctly", () => {
      const ref = new Reference(sampleItem2);
      const result = formatPretty([ref]);

      expect(result).toContain("Authors: Jones, B.");
    });

    it("should display year from issued.date-parts", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("Year: 2023");
    });

    it("should display (no year) when year is missing", () => {
      const ref = new Reference(minimalItem);
      const result = formatPretty([ref]);

      expect(result).toContain("Year: (no year)");
    });

    it("should display CSL-JSON type", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("Type: article-journal");
    });

    it("should display DOI when present", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("DOI: 10.1234/jmi.2023.0045");
    });

    it("should display PMID when present", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("PMID: 12345678");
    });

    it("should display PMCID when present", () => {
      const ref = new Reference(itemWithPMCID);
      const result = formatPretty([ref]);

      expect(result).toContain("PMCID: PMC1234567");
    });

    it("should display URL when present", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("URL: https://example.com/article");
    });

    it("should always display UUID", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      expect(result).toContain("UUID: 550e8400-e29b-41d4-a716-446655440001");
    });

    it("should not display DOI when not present", () => {
      const ref = new Reference(sampleItem2);
      const result = formatPretty([ref]);

      expect(result).not.toContain("DOI:");
    });

    it("should separate multiple references with empty line", () => {
      const ref1 = new Reference(sampleItem1);
      const ref2 = new Reference(sampleItem2);
      const result = formatPretty([ref1, ref2]);

      // Should have empty line between references
      expect(result).toContain("\n\n[jones-2022]");
    });

    it("should display fields in correct order", () => {
      const ref = new Reference(sampleItem1);
      const result = formatPretty([ref]);

      const lines = result.split("\n").filter((line) => line.trim());
      // Find indices of each field
      const authorsIdx = lines.findIndex((line) => line.includes("Authors:"));
      const yearIdx = lines.findIndex((line) => line.includes("Year:"));
      const typeIdx = lines.findIndex((line) => line.includes("Type:"));
      const doiIdx = lines.findIndex((line) => line.includes("DOI:"));
      const pmidIdx = lines.findIndex((line) => line.includes("PMID:"));
      const urlIdx = lines.findIndex((line) => line.includes("URL:"));
      const uuidIdx = lines.findIndex((line) => line.includes("UUID:"));

      // Check order: Authors < Year < Type < DOI < PMID < URL < UUID
      expect(authorsIdx).toBeLessThan(yearIdx);
      expect(yearIdx).toBeLessThan(typeIdx);
      expect(typeIdx).toBeLessThan(doiIdx);
      expect(doiIdx).toBeLessThan(pmidIdx);
      expect(pmidIdx).toBeLessThan(urlIdx);
      expect(urlIdx).toBeLessThan(uuidIdx);
    });

    it("should handle reference with no title", () => {
      const ref = new Reference(minimalItem);
      const result = formatPretty([ref]);

      // Should still have header with ID
      expect(result).toContain("[minimal-2024]");
    });

    it("should handle reference with no authors", () => {
      const ref = new Reference(minimalItem);
      const result = formatPretty([ref]);

      // Should not include Authors line
      expect(result).not.toContain("Authors:");
    });

    it("should format multiple references correctly", () => {
      const ref1 = new Reference(sampleItem1);
      const ref2 = new Reference(sampleItem2);
      const ref3 = new Reference(itemWithPMCID);
      const result = formatPretty([ref1, ref2, ref3]);

      // Should contain all three headers
      expect(result).toContain("[smith-2023]");
      expect(result).toContain("[jones-2022]");
      expect(result).toContain("[tanaka-2021]");

      // Should have proper separators
      const parts = result.split("\n\n");
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });
  });
});
