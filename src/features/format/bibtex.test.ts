import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibtex } from "./bibtex.js";

describe("BibTeX Output Formatter", () => {
  const articleJournal: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [
      { family: "Smith", given: "John" },
      { family: "Doe", given: "Alice" },
    ],
    issued: { "date-parts": [[2023]] },
    "container-title": "Journal of AI",
    volume: "10",
    issue: "3",
    page: "123-145",
    DOI: "10.1234/example",
    URL: "https://example.com/article",
    PMID: "12345678",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const book: CslItem = {
    id: "jones-2022",
    type: "book",
    title: "Introduction to Computer Science",
    author: [{ family: "Jones", given: "Bob" }],
    issued: { "date-parts": [[2022]] },
    publisher: "Tech Press",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const inbook: CslItem = {
    id: "tanaka-2021",
    type: "chapter",
    title: "Deep Learning Fundamentals",
    author: [{ family: "Tanaka", given: "Taro" }],
    issued: { "date-parts": [[2021]] },
    "container-title": "Handbook of AI",
    publisher: "AI Publisher",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440003",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const withPMCID: CslItem = {
    id: "yamada-2020",
    type: "article",
    title: "Research Study",
    author: [{ family: "Yamada", given: "Yuki" }],
    issued: { "date-parts": [[2020]] },
    PMCID: "PMC1234567",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440004",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("formatBibtex", () => {
    it("should format empty array as empty string", () => {
      const result = formatBibtex([]);
      expect(result).toBe("");
    });

    it("should format article-journal as @article", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("@article{smith-2023,");
    });

    it("should format book as @book", () => {
      const result = formatBibtex([book]);

      expect(result).toContain("@book{jones-2022,");
    });

    it("should format chapter as @inbook", () => {
      const result = formatBibtex([inbook]);

      expect(result).toContain("@inbook{tanaka-2021,");
    });

    it("should use CSL-JSON id as citation key", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("@article{smith-2023,");
    });

    it("should format title field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("title = {Machine Learning in Medical Diagnosis}");
    });

    it("should format authors as Family, Given", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("author = {Smith, John and Doe, Alice}");
    });

    it("should format single author", () => {
      const result = formatBibtex([book]);

      expect(result).toContain("author = {Jones, Bob}");
    });

    it("should format year field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("year = {2023}");
    });

    it("should format journal field for article", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("journal = {Journal of AI}");
    });

    it("should format booktitle field for chapter", () => {
      const result = formatBibtex([inbook]);

      expect(result).toContain("booktitle = {Handbook of AI}");
    });

    it("should format volume field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("volume = {10}");
    });

    it("should format number field from issue", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("number = {3}");
    });

    it("should format pages field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("pages = {123-145}");
    });

    it("should format doi field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("doi = {10.1234/example}");
    });

    it("should format url field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("url = {https://example.com/article}");
    });

    it("should format PMID in note field", () => {
      const result = formatBibtex([articleJournal]);

      expect(result).toContain("note = {PMID: 12345678}");
    });

    it("should format PMCID in note field", () => {
      const result = formatBibtex([withPMCID]);

      expect(result).toContain("note = {PMCID: PMC1234567}");
    });

    it("should format publisher field", () => {
      const result = formatBibtex([book]);

      expect(result).toContain("publisher = {Tech Press}");
    });

    it("should indent fields with 2 spaces", () => {
      const result = formatBibtex([articleJournal]);

      const lines = result.split("\n");
      const fieldLines = lines.filter((line) => line.includes("=") && !line.startsWith("@"));
      for (const line of fieldLines) {
        expect(line.startsWith("  ")).toBe(true);
      }
    });

    it("should end each field with comma", () => {
      const result = formatBibtex([articleJournal]);

      const lines = result.split("\n");
      const fieldLines = lines.filter((line) => line.includes("=") && !line.startsWith("@"));
      for (const line of fieldLines) {
        expect(line.trim().endsWith(",")).toBe(true);
      }
    });

    it("should close entry with closing brace", () => {
      const result = formatBibtex([articleJournal]);

      expect(result.trim().endsWith("}")).toBe(true);
    });

    it("should separate multiple entries with empty line", () => {
      const result = formatBibtex([articleJournal, book]);

      expect(result).toContain("}\n\n@book");
    });

    it("should not include fields that are not present", () => {
      const result = formatBibtex([book]);

      expect(result).not.toContain("doi =");
      expect(result).not.toContain("volume =");
      expect(result).not.toContain("journal =");
    });

    it("should handle unknown types as @misc", () => {
      const misc: CslItem = {
        id: "unknown-2024",
        type: "webpage",
        title: "Some Webpage",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440005",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const result = formatBibtex([misc]);

      expect(result).toContain("@misc{unknown-2024,");
    });
  });
});
