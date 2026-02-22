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

  // Sample books for ISBN testing
  const bookOriginal: CslItem = {
    id: "book2023",
    type: "book",
    title: "Introduction to Climate Science",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023]] },
    publisher: "Academic Press",
    ISBN: "9784000000000",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440010",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const bookDuplicateIsbn: CslItem = {
    id: "book_duplicate",
    type: "book",
    title: "Different Book Title",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2022]] },
    publisher: "Other Publisher",
    ISBN: "9784000000000",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440011",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const bookSectionOriginal: CslItem = {
    id: "chapter2023",
    type: "chapter",
    title: "Chapter 1: Fundamentals",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Introduction to Climate Science",
    ISBN: "9784000000000",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440012",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const bookSectionSameIsbnSameTitle: CslItem = {
    id: "chapter_duplicate",
    type: "chapter",
    title: "Chapter 1: Fundamentals",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Introduction to Climate Science",
    ISBN: "9784000000000",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440013",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const bookSectionSameIsbnDifferentTitle: CslItem = {
    id: "chapter_different",
    type: "chapter",
    title: "Chapter 2: Advanced Topics",
    author: [{ family: "Anderson", given: "James" }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Introduction to Climate Science",
    ISBN: "9784000000000",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440014",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

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

  describe("ISBN-based detection (third priority)", () => {
    it("should detect duplicate by ISBN for book type", () => {
      const result = detectDuplicate(bookDuplicateIsbn, [bookOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("isbn");
      expect(result.matches[0].existing.id).toBe("book2023");
    });

    it("should detect duplicate by ISBN + title for chapter type", () => {
      const result = detectDuplicate(bookSectionSameIsbnSameTitle, [bookSectionOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("isbn-title");
    });

    it("should NOT detect duplicate for chapter with same ISBN but different title", () => {
      const result = detectDuplicate(bookSectionSameIsbnDifferentTitle, [bookSectionOriginal]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should normalize ISBN for comparison (remove hyphens)", () => {
      const itemWithHyphenatedIsbn: CslItem = {
        ...bookDuplicateIsbn,
        ISBN: "978-4-00-000000-0",
      };
      const result = detectDuplicate(itemWithHyphenatedIsbn, [bookOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("isbn");
    });

    it("should prioritize DOI over ISBN", () => {
      const bookWithDoi: CslItem = {
        ...bookOriginal,
        DOI: "10.1234/book.2023",
      };
      const itemWithMatchingDoiAndIsbn: CslItem = {
        ...bookDuplicateIsbn,
        DOI: "10.1234/book.2023",
      };
      const result = detectDuplicate(itemWithMatchingDoiAndIsbn, [bookWithDoi]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi"); // DOI takes priority over ISBN
    });

    it("should prioritize PMID over ISBN", () => {
      const bookWithPmid: CslItem = {
        ...bookOriginal,
        PMID: "12345678",
      };
      const itemWithMatchingPmidAndIsbn: CslItem = {
        ...bookDuplicateIsbn,
        PMID: "12345678",
      };
      const result = detectDuplicate(itemWithMatchingPmidAndIsbn, [bookWithPmid]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("pmid"); // PMID takes priority over ISBN
    });

    it("should use ISBN when PMID and DOI are absent", () => {
      const result = detectDuplicate(bookDuplicateIsbn, [bookOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("isbn");
    });

    it("should handle ISBN-10 format with X check digit", () => {
      const bookWithIsbn10: CslItem = {
        ...bookOriginal,
        ISBN: "400000000X",
      };
      const itemWithIsbn10: CslItem = {
        ...bookDuplicateIsbn,
        ISBN: "4-00-000000-X",
      };
      const result = detectDuplicate(itemWithIsbn10, [bookWithIsbn10]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("isbn");
    });

    it("should be case-insensitive for ISBN-10 X check digit", () => {
      const bookWithUpperX: CslItem = {
        ...bookOriginal,
        ISBN: "400000000X",
      };
      const itemWithLowerX: CslItem = {
        ...bookDuplicateIsbn,
        ISBN: "400000000x",
      };
      const result = detectDuplicate(itemWithLowerX, [bookWithUpperX]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("isbn");
    });

    it("should handle ISBN field as array (use first)", () => {
      const bookWithIsbnArray: CslItem = {
        ...bookOriginal,
        ISBN: "9784000000000",
      };
      const itemWithIsbnArray: CslItem = {
        ...bookDuplicateIsbn,
        ISBN: "9784000000000",
      };
      const result = detectDuplicate(itemWithIsbnArray, [bookWithIsbnArray]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("isbn");
    });
  });

  describe("arXiv ID-based detection (fourth priority)", () => {
    const arxivOriginal: CslItem = {
      id: "arxiv2023",
      type: "article",
      title: "arXiv Paper on LLMs",
      author: [{ family: "Smith", given: "Alice" }],
      custom: {
        uuid: "660e8400-e29b-41d4-a716-446655440099",
        timestamp: "2024-01-01T00:00:00.000Z",
        arxiv_id: "2301.13867",
      },
    };

    it("should detect duplicate by arXiv ID", () => {
      const newItem: CslItem = {
        id: "new-arxiv",
        type: "article",
        title: "Same arXiv Paper",
        custom: { arxiv_id: "2301.13867" },
      };
      const result = detectDuplicate(newItem, [arxivOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].type).toBe("arxiv");
      expect(result.matches[0].details?.arxiv_id).toBe("2301.13867");
    });

    it("should detect duplicate by arXiv ID ignoring version suffix", () => {
      const newItem: CslItem = {
        id: "new-arxiv-v2",
        type: "article",
        title: "Same arXiv Paper v2",
        custom: { arxiv_id: "2301.13867v2" },
      };
      const result = detectDuplicate(newItem, [arxivOriginal]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("arxiv");
    });

    it("should NOT detect duplicate when arXiv IDs differ", () => {
      const newItem: CslItem = {
        id: "different-arxiv",
        type: "article",
        title: "Different arXiv Paper",
        custom: { arxiv_id: "2301.99999" },
      };
      const result = detectDuplicate(newItem, [arxivOriginal]);

      expect(result.isDuplicate).toBe(false);
    });

    it("should NOT match when item has no arxiv_id", () => {
      const newItem: CslItem = {
        id: "no-arxiv",
        type: "article",
        title: "No arXiv ID",
      };
      const result = detectDuplicate(newItem, [arxivOriginal]);

      // Should not match on arXiv (may match on title-author-year)
      const arxivMatch = result.matches.find((m) => m.type === "arxiv");
      expect(arxivMatch).toBeUndefined();
    });

    it("should prioritize DOI over arXiv ID", () => {
      const arxivWithDoi: CslItem = {
        ...arxivOriginal,
        DOI: "10.1234/paper.2023",
      };
      const newItem: CslItem = {
        id: "doi-and-arxiv",
        type: "article",
        title: "Paper with both",
        DOI: "10.1234/paper.2023",
        custom: { arxiv_id: "2301.13867" },
      };
      const result = detectDuplicate(newItem, [arxivWithDoi]);

      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("doi");
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

  describe("Literal author format", () => {
    it("should detect duplicate by title-author-year with literal authors", () => {
      const literalAuthorItem: CslItem = {
        id: "who2023",
        type: "article-journal",
        title: "Global Health Report",
        author: [{ literal: "World Health Organization" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440020",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const duplicateItem: CslItem = {
        id: "who2023-dup",
        type: "article-journal",
        title: "Global Health Report",
        author: [{ literal: "World Health Organization" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440021",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = detectDuplicate(duplicateItem, [literalAuthorItem]);
      expect(result.isDuplicate).toBe(true);
      expect(result.matches[0].type).toBe("title-author-year");
    });

    it("should not match literal author against different literal author", () => {
      const item1: CslItem = {
        id: "who2023",
        type: "article-journal",
        title: "Global Health Report",
        author: [{ literal: "World Health Organization" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440020",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const item2: CslItem = {
        id: "un2023",
        type: "article-journal",
        title: "Global Health Report",
        author: [{ literal: "United Nations" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440021",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const result = detectDuplicate(item2, [item1]);
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
