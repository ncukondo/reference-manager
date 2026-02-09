import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatPretty } from "./pretty.js";

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

    it("should format single item with header line", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("[smith-2023] Machine Learning in Medical Diagnosis");
    });

    it("should indent field lines with 2 spaces", () => {
      const result = formatPretty([sampleItem1]);

      const lines = result.split("\n");
      // Check that field lines start with 2 spaces
      expect(lines.some((line) => line.startsWith("  Authors:"))).toBe(true);
      expect(lines.some((line) => line.startsWith("  Year:"))).toBe(true);
      expect(lines.some((line) => line.startsWith("  Type:"))).toBe(true);
    });

    it("should format authors as Family, Given-Initial", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("Authors: Smith, J.; Doe, A.");
    });

    it("should format single author correctly", () => {
      const result = formatPretty([sampleItem2]);

      expect(result).toContain("Authors: Jones, B.");
    });

    it("should display year from issued.date-parts", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("Year: 2023");
    });

    it("should display (no year) when year is missing", () => {
      const result = formatPretty([minimalItem]);

      expect(result).toContain("Year: (no year)");
    });

    it("should display CSL-JSON type", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("Type: article-journal");
    });

    it("should display DOI when present", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("DOI: 10.1234/jmi.2023.0045");
    });

    it("should display PMID when present", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("PMID: 12345678");
    });

    it("should display PMCID when present", () => {
      const result = formatPretty([itemWithPMCID]);

      expect(result).toContain("PMCID: PMC1234567");
    });

    it("should display URL when present", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("URL: https://example.com/article");
    });

    it("should always display UUID", () => {
      const result = formatPretty([sampleItem1]);

      expect(result).toContain("UUID: 550e8400-e29b-41d4-a716-446655440001");
    });

    it("should not display DOI when not present", () => {
      const result = formatPretty([sampleItem2]);

      expect(result).not.toContain("DOI:");
    });

    it("should separate multiple items with empty line", () => {
      const result = formatPretty([sampleItem1, sampleItem2]);

      // Should have empty line between items
      expect(result).toContain("\n\n[jones-2022]");
    });

    it("should display fields in correct order", () => {
      const result = formatPretty([sampleItem1]);

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

    it("should handle item with no title", () => {
      const result = formatPretty([minimalItem]);

      // Should still have header with ID
      expect(result).toContain("[minimal-2024]");
    });

    it("should handle item with no authors", () => {
      const result = formatPretty([minimalItem]);

      // Should not include Authors line
      expect(result).not.toContain("Authors:");
    });

    it("should format multiple items correctly", () => {
      const result = formatPretty([sampleItem1, sampleItem2, itemWithPMCID]);

      // Should contain all three headers
      expect(result).toContain("[smith-2023]");
      expect(result).toContain("[jones-2022]");
      expect(result).toContain("[tanaka-2021]");

      // Should have proper separators
      const parts = result.split("\n\n");
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });

    it("should display (no uuid) when uuid is missing", () => {
      const itemWithoutUuid: CslItem = {
        id: "no-uuid",
        type: "article",
      };
      const result = formatPretty([itemWithoutUuid]);

      expect(result).toContain("UUID: (no uuid)");
    });

    it("should show indicator line for item with resources", () => {
      const itemWithResources: CslItem = {
        id: "res-2024",
        type: "article-journal",
        title: "Test",
        URL: "https://example.com",
        custom: {
          uuid: "test-uuid",
          tags: ["ml"],
          attachments: {
            directory: "test-dir",
            files: [{ filename: "fulltext.pdf", role: "fulltext" }],
          },
        },
      };
      const result = formatPretty([itemWithResources]);
      const lines = result.split("\n");
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toBe("  📄🔗🏷");
    });

    it("should not add indicator line for item without resources", () => {
      const result = formatPretty([sampleItem2]);
      const lines = result.split("\n");
      const lastLine = lines[lines.length - 1];
      // Last line should be UUID, not an indicator
      expect(lastLine).toContain("UUID:");
    });

    it("should indent indicator line with 2 spaces", () => {
      const itemWithUrl: CslItem = {
        id: "url-2024",
        type: "article",
        URL: "https://example.com",
        custom: { uuid: "test-uuid" },
      };
      const result = formatPretty([itemWithUrl]);
      const lines = result.split("\n");
      const lastLine = lines[lines.length - 1];
      expect(lastLine).toBe("  🔗");
    });
  });
});
