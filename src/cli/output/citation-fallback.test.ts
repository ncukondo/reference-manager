import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types";
import { formatBibliography, formatInText } from "./citation-fallback";

describe("Citation Fallback Formatter", () => {
  const sampleItem1: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Journal of Medical Informatics",
    volume: "10",
    issue: "2",
    page: "123-145",
    DOI: "10.1234/jmi.2023.0045",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const sampleItem2: CslItem = {
    id: "jones-2024",
    type: "article-journal",
    title: "Another Article",
    author: [
      { family: "Jones", given: "Bob" },
      { family: "Williams", given: "Mary" },
    ],
    issued: { "date-parts": [[2024]] },
    "container-title": "Science",
    volume: "15",
    issue: "3",
    page: "200-210",
    DOI: "10.1234/another",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("formatBibliography", () => {
    it("should format empty array as empty string", () => {
      const result = formatBibliography([]);
      expect(result).toBe("");
    });

    it("should format single item with all fields", () => {
      const result = formatBibliography([sampleItem1]);
      expect(result).toBe(
        "Smith J. Journal of Medical Informatics. 2023;10(2):123-145. DOI:10.1234/jmi.2023.0045. Machine Learning in Medical Diagnosis."
      );
    });

    it("should format multiple items with newline separation", () => {
      const result = formatBibliography([sampleItem1, sampleItem2]);
      expect(result).toBe(
        "Smith J. Journal of Medical Informatics. 2023;10(2):123-145. DOI:10.1234/jmi.2023.0045. Machine Learning in Medical Diagnosis.\n\nJones B et al. Science. 2024;15(3):200-210. DOI:10.1234/another. Another Article."
      );
    });

    it("should format single author with given initial", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("Smith J.");
    });

    it("should format multiple authors with et al", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Alice" },
        ],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("Smith J et al.");
    });

    it("should use container-title-short if available", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal of Medical Informatics",
        "container-title-short": "J Med Inform",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("J Med Inform.");
    });

    it("should prioritize PMID over DOI", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        PMID: "12345678",
        DOI: "10.1234/example",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("PMID:12345678");
      expect(result).not.toContain("DOI:");
    });

    it("should use DOI if PMID is not available", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        DOI: "10.1234/example",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("DOI:10.1234/example");
    });

    it("should use URL if PMID and DOI are not available", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        URL: "https://example.com/article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("https://example.com/article");
    });

    it("should omit identifier if none available", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023. Test Article.");
    });

    it("should handle missing author", () => {
      const item: CslItem = {
        id: "unknown-2023",
        type: "article-journal",
        title: "Test Article",
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("Unknown.");
    });

    it("should handle missing year", () => {
      const item: CslItem = {
        id: "smith-nd",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("n.d.");
    });

    it("should handle missing container title", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        volume: "10",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. 2023;10. Test Article.");
    });

    it("should handle missing volume/issue/pages", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023. Test Article.");
    });

    it("should handle only volume (no issue or pages)", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        volume: "10",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023;10. Test Article.");
    });

    it("should handle volume and pages (no issue)", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        volume: "10",
        page: "123-145",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023;10:123-145. Test Article.");
    });

    it("should handle volume, issue, and pages", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        volume: "10",
        issue: "2",
        page: "123-145",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023;10(2):123-145. Test Article.");
    });

    it("should handle missing title", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Smith J. Journal. 2023.");
    });

    it("should handle author with only family name", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "Journal",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toContain("Smith.");
    });

    it("should handle minimal item with only required fields", () => {
      const item: CslItem = {
        id: "minimal-2023",
        type: "article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatBibliography([item]);
      expect(result).toBe("Unknown. n.d..");
    });
  });

  describe("formatInText", () => {
    it("should format empty array as empty string", () => {
      const result = formatInText([]);
      expect(result).toBe("");
    });

    it("should format single author with year", () => {
      const result = formatInText([sampleItem1]);
      expect(result).toBe("(Smith, 2023)");
    });

    it("should format multiple authors with et al", () => {
      const result = formatInText([sampleItem2]);
      expect(result).toBe("(Jones et al, 2024)");
    });

    it("should format multiple items with semicolon separation", () => {
      const result = formatInText([sampleItem1, sampleItem2]);
      expect(result).toBe("(Smith, 2023; Jones et al, 2024)");
    });

    it("should handle missing author", () => {
      const item: CslItem = {
        id: "unknown-2023",
        type: "article-journal",
        title: "Test Article",
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatInText([item]);
      expect(result).toBe("(Unknown, 2023)");
    });

    it("should handle missing year", () => {
      const item: CslItem = {
        id: "smith-nd",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatInText([item]);
      expect(result).toBe("(Smith, n.d.)");
    });

    it("should handle author with only family name", () => {
      const item: CslItem = {
        id: "smith-2023",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatInText([item]);
      expect(result).toBe("(Smith, 2023)");
    });

    it("should handle minimal item with no author or year", () => {
      const item: CslItem = {
        id: "minimal",
        type: "article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatInText([item]);
      expect(result).toBe("(Unknown, n.d.)");
    });

    it("should handle three items with proper formatting", () => {
      const item3: CslItem = {
        id: "tanaka-2022",
        type: "article-journal",
        title: "Third Article",
        author: [{ family: "Tanaka", given: "Taro" }],
        issued: { "date-parts": [[2022]] },
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440003",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = formatInText([sampleItem1, sampleItem2, item3]);
      expect(result).toBe("(Smith, 2023; Jones et al, 2024; Tanaka, 2022)");
    });
  });
});
