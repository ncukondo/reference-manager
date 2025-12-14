import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { sortResults } from "./sorter.js";
import type { SearchResult } from "./types.js";

describe("sortResults", () => {
  /**
   * Helper function to create a minimal SearchResult for testing
   */
  function createSearchResult(overrides: Partial<SearchResult>): SearchResult {
    return {
      reference: {
        id: "test-id",
        type: "article-journal",
        title: "Test Article",
      },
      tokenMatches: [],
      overallStrength: "partial",
      score: 50,
      ...overrides,
    };
  }

  /**
   * Helper to create a reference with specific properties
   */
  function createReference(
    id: string,
    title: string,
    year?: number,
    authors?: { family: string; given?: string }[]
  ): CslItem {
    const ref: CslItem = {
      id,
      type: "article-journal",
      title,
    };

    if (year !== undefined) {
      ref.issued = {
        "date-parts": [[year]],
      };
    }

    if (authors) {
      ref.author = authors;
    }

    return ref;
  }

  describe("Sort by match strength (primary criterion)", () => {
    it("should sort exact matches before partial matches", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("partial", "Partial Match"),
          overallStrength: "partial",
          score: 50,
        }),
        createSearchResult({
          reference: createReference("exact", "Exact Match"),
          overallStrength: "exact",
          score: 100,
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("exact");
      expect(sorted[1].reference.id).toBe("partial");
    });

    it("should maintain order when all have same match strength", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("first", "First"),
          overallStrength: "partial",
        }),
        createSearchResult({
          reference: createReference("second", "Second"),
          overallStrength: "partial",
        }),
        createSearchResult({
          reference: createReference("third", "Third"),
          overallStrength: "partial",
        }),
      ];

      const sorted = sortResults(results);

      // Should maintain registration order when strength is the same
      expect(sorted[0].reference.id).toBe("first");
      expect(sorted[1].reference.id).toBe("second");
      expect(sorted[2].reference.id).toBe("third");
    });
  });

  describe("Sort by year (secondary criterion, descending)", () => {
    it("should sort by year descending when match strength is equal", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("old", "Old", 2020),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("new", "New", 2023),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("middle", "Middle", 2021),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("new"); // 2023
      expect(sorted[1].reference.id).toBe("middle"); // 2021
      expect(sorted[2].reference.id).toBe("old"); // 2020
    });

    it("should treat missing year as 0000 (sorted last)", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("with-year", "With Year", 2023),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("no-year", "No Year"),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("with-year");
      expect(sorted[1].reference.id).toBe("no-year");
    });

    it("should prioritize match strength over year", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("partial-new", "Partial New", 2023),
          overallStrength: "partial",
        }),
        createSearchResult({
          reference: createReference("exact-old", "Exact Old", 2020),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      // Exact match should come first even though it's older
      expect(sorted[0].reference.id).toBe("exact-old");
      expect(sorted[1].reference.id).toBe("partial-new");
    });
  });

  describe("Sort by author (tertiary criterion, alphabetical)", () => {
    it("should sort by author alphabetically when strength and year are equal", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("smith", "Smith Article", 2023, [
            { family: "Smith", given: "John" },
          ]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("anderson", "Anderson Article", 2023, [
            { family: "Anderson", given: "Jane" },
          ]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("zhao", "Zhao Article", 2023, [
            { family: "Zhao", given: "Li" },
          ]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("anderson");
      expect(sorted[1].reference.id).toBe("smith");
      expect(sorted[2].reference.id).toBe("zhao");
    });

    it("should handle missing authors (sorted last in author tier)", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("no-author", "No Author", 2023),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("with-author", "With Author", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("with-author");
      expect(sorted[1].reference.id).toBe("no-author");
    });

    it("should prioritize year over author", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("anderson-old", "Anderson Old", 2020, [
            { family: "Anderson" },
          ]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("smith-new", "Smith New", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      // Newer year should come first even though Smith > Anderson alphabetically
      expect(sorted[0].reference.id).toBe("smith-new");
      expect(sorted[1].reference.id).toBe("anderson-old");
    });
  });

  describe("Sort by title (quaternary criterion, alphabetical)", () => {
    it("should sort by title alphabetically when all other criteria are equal", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("z", "Zebra Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("a", "Apple Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("m", "Mango Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("a");
      expect(sorted[1].reference.id).toBe("m");
      expect(sorted[2].reference.id).toBe("z");
    });

    it("should handle missing title", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: { id: "no-title", type: "article-journal" },
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("with-title", "With Title", 2023),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      // Missing title should be sorted after titles
      expect(sorted[0].reference.id).toBe("with-title");
      expect(sorted[1].reference.id).toBe("no-title");
    });

    it("should be case-insensitive for title comparison", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("lower", "apple", 2023, [{ family: "A" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("upper", "BANANA", 2023, [{ family: "A" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("mixed", "Cherry", 2023, [{ family: "A" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      expect(sorted[0].reference.id).toBe("lower"); // apple
      expect(sorted[1].reference.id).toBe("upper"); // BANANA
      expect(sorted[2].reference.id).toBe("mixed"); // Cherry
    });
  });

  describe("Registration order (final tiebreaker)", () => {
    it("should maintain registration order when all criteria are equal", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("first", "Same Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("second", "Same Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("third", "Same Title", 2023, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      // Should maintain original order
      expect(sorted[0].reference.id).toBe("first");
      expect(sorted[1].reference.id).toBe("second");
      expect(sorted[2].reference.id).toBe("third");
    });
  });

  describe("Complex multi-criteria sorting", () => {
    it("should correctly sort by all criteria in priority order", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("partial-new-z", "Zebra", 2023, [{ family: "Anderson" }]),
          overallStrength: "partial",
        }),
        createSearchResult({
          reference: createReference("exact-old-a", "Apple", 2020, [{ family: "Smith" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("exact-new-b", "Banana", 2023, [{ family: "Anderson" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("exact-new-a", "Apple", 2023, [{ family: "Anderson" }]),
          overallStrength: "exact",
        }),
        createSearchResult({
          reference: createReference("exact-mid-z", "Zebra", 2021, [{ family: "Zhao" }]),
          overallStrength: "exact",
        }),
      ];

      const sorted = sortResults(results);

      // Expected order:
      // 1. exact-new-a: exact, 2023, Anderson, Apple
      // 2. exact-new-b: exact, 2023, Anderson, Banana
      // 3. exact-mid-z: exact, 2021, Zhao, Zebra
      // 4. exact-old-a: exact, 2020, Smith, Apple
      // 5. partial-new-z: partial, 2023, Anderson, Zebra

      expect(sorted[0].reference.id).toBe("exact-new-a");
      expect(sorted[1].reference.id).toBe("exact-new-b");
      expect(sorted[2].reference.id).toBe("exact-mid-z");
      expect(sorted[3].reference.id).toBe("exact-old-a");
      expect(sorted[4].reference.id).toBe("partial-new-z");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty array", () => {
      const results: SearchResult[] = [];
      const sorted = sortResults(results);
      expect(sorted).toEqual([]);
    });

    it("should handle single result", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("only", "Only Result"),
        }),
      ];
      const sorted = sortResults(results);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].reference.id).toBe("only");
    });

    it("should not modify original array", () => {
      const results: SearchResult[] = [
        createSearchResult({
          reference: createReference("b", "B", 2020),
          overallStrength: "partial",
        }),
        createSearchResult({
          reference: createReference("a", "A", 2023),
          overallStrength: "exact",
        }),
      ];

      const originalOrder = results.map((r) => r.reference.id);
      sortResults(results);

      // Original array should not be modified
      expect(results.map((r) => r.reference.id)).toEqual(originalOrder);
    });
  });
});
