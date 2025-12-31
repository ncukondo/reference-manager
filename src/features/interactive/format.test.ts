/**
 * Tests for interactive search display format functions
 */

import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatAuthors, formatIdentifiers, formatSearchResult, formatTitle } from "./format.js";

describe("Interactive search format functions", () => {
  describe("formatAuthors", () => {
    it("should format single author", () => {
      const authors = [{ family: "Smith", given: "John" }];
      expect(formatAuthors(authors)).toBe("Smith, J.");
    });

    it("should format two authors", () => {
      const authors = [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Alice" },
      ];
      expect(formatAuthors(authors)).toBe("Smith, J., & Doe, A.");
    });

    it("should format three authors", () => {
      const authors = [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Alice" },
        { family: "Johnson", given: "Bob" },
      ];
      expect(formatAuthors(authors)).toBe("Smith, J., Doe, A., & Johnson, B.");
    });

    it("should format more than three authors with et al.", () => {
      const authors = [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Alice" },
        { family: "Johnson", given: "Bob" },
        { family: "Williams", given: "Carol" },
      ];
      expect(formatAuthors(authors)).toBe("Smith, J., et al.");
    });

    it("should handle author without given name", () => {
      const authors = [{ family: "Smith" }];
      expect(formatAuthors(authors)).toBe("Smith");
    });

    it("should handle institutional author with literal", () => {
      const authors = [{ literal: "World Health Organization" }];
      expect(formatAuthors(authors)).toBe("World Health Organization");
    });

    it("should handle mixed personal and institutional authors", () => {
      const authors = [{ family: "Smith", given: "John" }, { literal: "WHO" }];
      expect(formatAuthors(authors)).toBe("Smith, J., & WHO");
    });

    it("should return empty string for undefined authors", () => {
      expect(formatAuthors(undefined)).toBe("");
    });

    it("should return empty string for empty array", () => {
      expect(formatAuthors([])).toBe("");
    });
  });

  describe("formatTitle", () => {
    it("should return title unchanged when within max width", () => {
      const title = "Short title";
      expect(formatTitle(title, 80)).toBe("Short title");
    });

    it("should truncate title with ellipsis when exceeding max width", () => {
      const title = "This is a very long title that exceeds the maximum width";
      const result = formatTitle(title, 30);
      expect(result).toBe("This is a very long title t...");
      expect(result.length).toBe(30);
    });

    it("should return empty string for undefined title", () => {
      expect(formatTitle(undefined, 80)).toBe("");
    });

    it("should return empty string for empty title", () => {
      expect(formatTitle("", 80)).toBe("");
    });

    it("should handle title exactly at max width", () => {
      const title = "Exact length";
      expect(formatTitle(title, 12)).toBe("Exact length");
    });
  });

  describe("formatIdentifiers", () => {
    it("should format DOI", () => {
      const item: CslItem = { id: "test", type: "article", DOI: "10.1000/example" };
      expect(formatIdentifiers(item)).toBe("DOI: 10.1000/example");
    });

    it("should format PMID", () => {
      const item: CslItem = { id: "test", type: "article", PMID: "12345678" };
      expect(formatIdentifiers(item)).toBe("PMID: 12345678");
    });

    it("should format PMCID", () => {
      const item: CslItem = { id: "test", type: "article", PMCID: "PMC1234567" };
      expect(formatIdentifiers(item)).toBe("PMCID: PMC1234567");
    });

    it("should format ISBN", () => {
      const item: CslItem = { id: "test", type: "book", ISBN: "978-4-00-000000-0" };
      expect(formatIdentifiers(item)).toBe("ISBN: 978-4-00-000000-0");
    });

    it("should format multiple identifiers with pipe separator", () => {
      const item: CslItem = {
        id: "test",
        type: "article",
        DOI: "10.1000/example",
        PMID: "12345678",
      };
      expect(formatIdentifiers(item)).toBe("DOI: 10.1000/example | PMID: 12345678");
    });

    it("should format all identifiers", () => {
      const item: CslItem = {
        id: "test",
        type: "article",
        DOI: "10.1000/example",
        PMID: "12345678",
        PMCID: "PMC1234567",
        ISBN: "978-4-00-000000-0",
      };
      expect(formatIdentifiers(item)).toBe(
        "DOI: 10.1000/example | PMID: 12345678 | PMCID: PMC1234567 | ISBN: 978-4-00-000000-0"
      );
    });

    it("should return empty string when no identifiers", () => {
      const item: CslItem = { id: "test", type: "article" };
      expect(formatIdentifiers(item)).toBe("");
    });
  });

  describe("formatSearchResult", () => {
    const baseItem: CslItem = {
      id: "smith-2020",
      type: "article-journal",
      title: "Machine learning in medicine: A comprehensive review",
      author: [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Alice" },
      ],
      issued: { "date-parts": [[2020]] },
      DOI: "10.1000/example",
      PMID: "12345678",
    };

    it("should format complete result with all fields", () => {
      const result = formatSearchResult(baseItem, 1, 80);
      expect(result).toContain("[1]");
      expect(result).toContain("Smith, J., & Doe, A.");
      expect(result).toContain("(2020)");
      expect(result).toContain("Machine learning in medicine");
      expect(result).toContain("DOI: 10.1000/example");
      expect(result).toContain("PMID: 12345678");
    });

    it("should format result without year", () => {
      const itemNoYear: CslItem = { ...baseItem, issued: undefined };
      const result = formatSearchResult(itemNoYear, 1, 80);
      expect(result).toContain("[1]");
      expect(result).toContain("Smith, J., & Doe, A.");
      expect(result).not.toContain("(2020)");
    });

    it("should format result without authors", () => {
      const itemNoAuthor: CslItem = { ...baseItem, author: undefined };
      const result = formatSearchResult(itemNoAuthor, 1, 80);
      expect(result).toContain("[1]");
      expect(result).toContain("(2020)");
      expect(result).not.toContain("Smith");
    });

    it("should format result without identifiers", () => {
      const itemNoIds: CslItem = {
        id: "test",
        type: "article",
        title: "Test title",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2020]] },
      };
      const result = formatSearchResult(itemNoIds, 1, 80);
      expect(result).toContain("[1]");
      expect(result).not.toContain("DOI:");
      expect(result).not.toContain("PMID:");
    });

    it("should include index number", () => {
      const result = formatSearchResult(baseItem, 5, 80);
      expect(result).toContain("[5]");
    });

    it("should truncate long title based on terminal width", () => {
      const itemLongTitle: CslItem = {
        ...baseItem,
        title:
          "This is an extremely long title that should be truncated when the terminal width is limited to ensure proper display",
      };
      const result = formatSearchResult(itemLongTitle, 1, 50);
      expect(result).toContain("...");
    });
  });
});
