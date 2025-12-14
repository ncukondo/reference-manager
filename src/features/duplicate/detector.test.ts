import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { detectDuplicate } from "./detector.js";

describe("detectDuplicate", () => {
  // Sample references for testing
  const original: CslItem = {
    id: "original2023",
    type: "article-journal",
    title: "Original Article on Climate Change",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023, 1, 10]] },
    "container-title": "Nature Climate Change",
    DOI: "10.1038/s41558-023-0001",
    PMID: "11111111",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440001",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const duplicateDoi: CslItem = {
    id: "duplicate_doi",
    type: "article-journal",
    title: "Same DOI Different Title",
    author: [{ family: "Anderson", given: "J." }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Nature Climate Change",
    DOI: "10.1038/s41558-023-0001",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440002",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const duplicatePmid: CslItem = {
    id: "duplicate_pmid",
    type: "article-journal",
    title: "Same PMID Entry",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023, 1]] },
    "container-title": "Nature Climate Change",
    PMID: "11111111",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440003",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const duplicateTitleAuthorYear: CslItem = {
    id: "duplicate_title_author_year",
    type: "article-journal",
    title: "Original Article on Climate Change",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023, 6, 15]] },
    "container-title": "Different Journal",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440004",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const notDuplicate: CslItem = {
    id: "not_duplicate",
    type: "article-journal",
    title: "Completely Different Article",
    author: [{ family: "Williams", given: "Sarah" }],
    issued: { "date-parts": [[2023, 2, 1]] },
    "container-title": "Science",
    DOI: "10.1126/science.abc1234",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440005",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("DOI-based detection (highest priority)", () => {
    it("should detect duplicate by DOI", () => {
      const result = detectDuplicate(duplicateDoi, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("doi");
      expect(result.matches[0].existing.id).toBe("original2023");
    });

    it("should detect duplicate by DOI even with different title", () => {
      const result = detectDuplicate(duplicateDoi, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi");
    });

    it("should normalize DOI for comparison", () => {
      const itemWithHttpsDoi: CslItem = {
        ...duplicateDoi,
        DOI: "https://doi.org/10.1038/s41558-023-0001",
      };
      const result = detectDuplicate(itemWithHttpsDoi, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi");
    });

    it("should be case-sensitive for DOI", () => {
      const itemWithDifferentCase: CslItem = {
        ...original,
        DOI: "10.1038/S41558-023-0001", // Different case
      };
      const result = detectDuplicate(itemWithDifferentCase, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should not detect duplicate when DOI is different", () => {
      const result = detectDuplicate(notDuplicate, [original]);

      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("PMID-based detection (second priority)", () => {
    it("should detect duplicate by PMID", () => {
      const result = detectDuplicate(duplicatePmid, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("pmid");
      expect(result.matches[0].existing.id).toBe("original2023");
    });

    it("should detect PMID duplicate when no DOI present", () => {
      const itemWithoutDoi: CslItem = {
        ...duplicatePmid,
        DOI: undefined,
      };
      const existingWithoutDoi: CslItem = {
        ...original,
        DOI: undefined,
      };
      const result = detectDuplicate(itemWithoutDoi, [existingWithoutDoi]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("pmid");
    });

    it("should prioritize DOI over PMID", () => {
      // Item has both DOI and PMID matching but different UUID
      const result = detectDuplicate(
        {
          ...original,
          id: "new-item",
          custom: {
            uuid: "different-uuid",
            timestamp: "2024-01-02T00:00:00.000Z",
          },
        },
        [original]
      );

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi"); // DOI takes priority
    });
  });

  describe("Title + Author + Year detection (lowest priority)", () => {
    it("should detect duplicate by title + author + year", () => {
      const result = detectDuplicate(duplicateTitleAuthorYear, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("title-author-year");
      expect(result.matches[0].existing.id).toBe("original2023");
    });

    it("should normalize title for comparison", () => {
      const itemWithVariantTitle: CslItem = {
        ...duplicateTitleAuthorYear,
        title: "ORIGINAL ARTICLE ON CLIMATE CHANGE", // Different case
      };
      const result = detectDuplicate(itemWithVariantTitle, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("title-author-year");
    });

    it("should normalize author names for comparison", () => {
      const itemWithVariantAuthor: CslItem = {
        ...duplicateTitleAuthorYear,
        author: [{ family: "anderson", given: "james" }], // Different case
      };
      const result = detectDuplicate(itemWithVariantAuthor, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("title-author-year");
    });

    it("should match with different month/day, same year", () => {
      const result = detectDuplicate(duplicateTitleAuthorYear, [original]);

      expect(result.isDuplicate).toBe(true);
      // Original: 2023-01-10, Duplicate: 2023-06-15 (same year)
    });

    it("should not match when year is different", () => {
      const itemWithDifferentYear: CslItem = {
        ...duplicateTitleAuthorYear,
        issued: { "date-parts": [[2024]] },
      };
      const result = detectDuplicate(itemWithDifferentYear, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should not match when title is different", () => {
      const itemWithDifferentTitle: CslItem = {
        ...duplicateTitleAuthorYear,
        title: "A Different Article Title",
      };
      const result = detectDuplicate(itemWithDifferentTitle, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should not match when author is different", () => {
      const itemWithDifferentAuthor: CslItem = {
        ...duplicateTitleAuthorYear,
        author: [{ family: "Smith", given: "John" }],
      };
      const result = detectDuplicate(itemWithDifferentAuthor, [original]);

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should not detect duplicate when item has no DOI, PMID, or title", () => {
      const itemWithoutIdentifiers: CslItem = {
        id: "minimal",
        type: "article-journal",
      };
      const result = detectDuplicate(itemWithoutIdentifiers, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should not detect duplicate when item has no author", () => {
      const itemWithoutAuthor: CslItem = {
        id: "no-author",
        type: "article-journal",
        title: "Original Article on Climate Change",
        issued: { "date-parts": [[2023]] },
      };
      const result = detectDuplicate(itemWithoutAuthor, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should not detect duplicate when item has no year", () => {
      const itemWithoutYear: CslItem = {
        id: "no-year",
        type: "article-journal",
        title: "Original Article on Climate Change",
        author: [{ family: "Anderson", given: "James" }],
      };
      const result = detectDuplicate(itemWithoutYear, [original]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should handle empty library", () => {
      const result = detectDuplicate(original, []);

      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it("should handle multiple matches", () => {
      // Create two items with the same DOI
      const duplicate1 = { ...duplicateDoi, id: "dup1" };
      const duplicate2 = { ...duplicateDoi, id: "dup2" };

      const result = detectDuplicate(original, [duplicate1, duplicate2]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
    });

    it("should not match item with itself by UUID", () => {
      // Even if all fields match, same UUID means it's the same item
      const result = detectDuplicate(original, [original]);

      expect(result.isDuplicate).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it("should handle missing custom.uuid gracefully", () => {
      const itemWithoutUuid: CslItem = {
        ...original,
        custom: undefined,
      };
      const existingWithoutUuid: CslItem = {
        ...duplicateDoi,
        custom: undefined,
      };

      const result = detectDuplicate(itemWithoutUuid, [existingWithoutUuid]);

      expect(result.isDuplicate).toBe(true); // Should still detect by DOI
    });
  });

  describe("Priority ordering", () => {
    it("should prefer DOI match over PMID and title-author-year", () => {
      // Create items where DOI matches but PMID and title differ
      const itemWithMatchingDoi: CslItem = {
        id: "test-doi-priority",
        type: "article-journal",
        title: "Different Title",
        author: [{ family: "Different", given: "Author" }],
        DOI: original.DOI,
        PMID: "99999999",
      };

      const result = detectDuplicate(itemWithMatchingDoi, [original]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi");
    });

    it("should prefer PMID match over title-author-year when DOI absent", () => {
      // Create items where PMID matches but title differs
      const itemWithMatchingPmid: CslItem = {
        id: "test-pmid-priority",
        type: "article-journal",
        title: "Different Title",
        author: [{ family: "Different", given: "Author" }],
        PMID: original.PMID,
      };

      const existingWithoutDoi: CslItem = {
        ...original,
        DOI: undefined,
      };

      const result = detectDuplicate(itemWithMatchingPmid, [existingWithoutDoi]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("pmid");
    });
  });
});
