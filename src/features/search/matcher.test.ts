import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { matchReference, matchToken } from "./matcher.js";
import type { SearchToken } from "./types.js";

describe("matchToken", () => {
  const reference: CslItem = {
    id: "smith2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis: A Comprehensive Review",
    author: [
      { family: "Smith", given: "John" },
      { family: "Johnson", given: "Emily" },
    ],
    issued: { "date-parts": [[2023, 5, 15]] },
    "container-title": "Journal of Medical Informatics",
    DOI: "10.1234/jmi.2023.0045",
    PMID: "12345678",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("ID field matching (exact, case-sensitive)", () => {
    it("should match exact PMID", () => {
      const token: SearchToken = {
        raw: "pmid:12345678",
        value: "12345678",
        field: "pmid",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("PMID");
      expect(matches[0].strength).toBe("exact");
    });

    it("should not match partial PMID", () => {
      const token: SearchToken = {
        raw: "pmid:1234",
        value: "1234",
        field: "pmid",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(0);
    });

    it("should not match PMID with different case", () => {
      const token: SearchToken = {
        raw: "pmid:12345678",
        value: "12345678",
        field: "pmid",
        isPhrase: false,
      };

      const refWithUpperPmid: CslItem = {
        ...reference,
        PMID: "ABCD1234",
      };

      const matches = matchToken(token, refWithUpperPmid);
      expect(matches).toHaveLength(0);
    });

    it("should match exact DOI", () => {
      const token: SearchToken = {
        raw: "doi:10.1234/jmi.2023.0045",
        value: "10.1234/jmi.2023.0045",
        field: "doi",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("DOI");
      expect(matches[0].strength).toBe("exact");
    });

    it("should not match partial DOI", () => {
      const token: SearchToken = {
        raw: "doi:10.1234",
        value: "10.1234",
        field: "doi",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(0);
    });

    it("should match exact URL", () => {
      const refWithUrl: CslItem = {
        ...reference,
        URL: "https://example.com/article",
      };

      const token: SearchToken = {
        raw: "url:https://example.com/article",
        value: "https://example.com/article",
        field: "url",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithUrl);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("URL");
      expect(matches[0].strength).toBe("exact");
    });

    it("should match URL in additional_urls array", () => {
      const refWithAdditionalUrls: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          additional_urls: ["https://example.com/mirror1", "https://example.com/mirror2"],
        },
      };

      const token: SearchToken = {
        raw: "url:https://example.com/mirror2",
        value: "https://example.com/mirror2",
        field: "url",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithAdditionalUrls);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("custom.additional_urls");
      expect(matches[0].strength).toBe("exact");
    });

    it("should match exact ISBN", () => {
      const refWithIsbn: CslItem = {
        ...reference,
        ISBN: "9784000000000",
      };

      const token: SearchToken = {
        raw: "isbn:9784000000000",
        value: "9784000000000",
        field: "isbn",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithIsbn);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("ISBN");
      expect(matches[0].strength).toBe("exact");
    });

    it("should not match partial ISBN", () => {
      const refWithIsbn: CslItem = {
        ...reference,
        ISBN: "9784000000000",
      };

      const token: SearchToken = {
        raw: "isbn:978400",
        value: "978400",
        field: "isbn",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithIsbn);
      expect(matches).toHaveLength(0);
    });

    it("should match ISBN case-insensitively (for X check digit)", () => {
      const refWithIsbn10: CslItem = {
        ...reference,
        ISBN: "400000000X",
      };

      const token: SearchToken = {
        raw: "isbn:400000000x",
        value: "400000000x",
        field: "isbn",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithIsbn10);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("ISBN");
      expect(matches[0].strength).toBe("exact");
    });

    it("should match exact id (citation key)", () => {
      const token: SearchToken = {
        raw: "id:smith2023",
        value: "smith2023",
        field: "id",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("id");
      expect(matches[0].strength).toBe("exact");
    });

    it("should match id case-insensitively", () => {
      const token: SearchToken = {
        raw: "id:SMITH2023",
        value: "SMITH2023",
        field: "id",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("id");
      expect(matches[0].strength).toBe("exact");
    });

    it("should not match partial id", () => {
      const token: SearchToken = {
        raw: "id:smith",
        value: "smith",
        field: "id",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(0);
    });

    it("should match DOI case-insensitively", () => {
      const token: SearchToken = {
        raw: "doi:10.1234/JMI.2023.0045",
        value: "10.1234/JMI.2023.0045",
        field: "doi",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("DOI");
      expect(matches[0].strength).toBe("exact");
    });
  });

  describe("Content field matching (partial, case-insensitive)", () => {
    it("should match partial title (case-insensitive)", () => {
      const token: SearchToken = {
        raw: "learning",
        value: "learning",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches.length).toBeGreaterThan(0);
      const titleMatch = matches.find((m) => m.field === "title");
      expect(titleMatch).toBeDefined();
      expect(titleMatch?.strength).toBe("partial");
    });

    it("should match title case-insensitively when query has no consecutive uppercase", () => {
      const token: SearchToken = {
        raw: "machine",
        value: "machine",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
      expect(matches[0].strength).toBe("partial");
    });

    it("should match author family name", () => {
      const token: SearchToken = {
        raw: "smith",
        value: "smith",
        field: "author",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("author");
      expect(matches[0].strength).toBe("partial");
    });

    it("should match author with given initial", () => {
      const token: SearchToken = {
        raw: "johnson e",
        value: "johnson e",
        field: "author",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("author");
    });

    it("should match author with full given name", () => {
      const refWithTakeshi: CslItem = {
        id: "test",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Kondo", given: "Takeshi" }],
        custom: {
          uuid: "test-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const token: SearchToken = {
        raw: "author:Takeshi",
        value: "Takeshi",
        field: "author",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTakeshi);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("author");
    });

    it("should match literal author name", () => {
      const refWithLiteral: CslItem = {
        id: "who2023",
        type: "article-journal",
        title: "Health Report",
        author: [{ literal: "World Health Organization" }],
        custom: {
          uuid: "test-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const token: SearchToken = {
        raw: "author:World Health",
        value: "World Health",
        field: "author",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithLiteral);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("author");
    });

    it("should NOT match author whose given name starts differently", () => {
      const refWithTakuma: CslItem = {
        id: "test",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Kondo", given: "Takuma" }],
        custom: {
          uuid: "test-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const token: SearchToken = {
        raw: "author:Takeshi",
        value: "Takeshi",
        field: "author",
        isPhrase: false,
      };

      // "Takeshi" should NOT match "Takuma" (different given name, only initial T matches)
      const matches = matchToken(token, refWithTakuma);
      expect(matches).toHaveLength(0);
    });

    it("should match container-title", () => {
      const token: SearchToken = {
        raw: "medical informatics",
        value: "medical informatics",
        isPhrase: true,
      };

      const matches = matchToken(token, reference);
      expect(matches.length).toBeGreaterThan(0);
      const containerMatch = matches.find((m) => m.field === "container-title");
      expect(containerMatch).toBeDefined();
    });

    it("should handle normalized text with diacritics", () => {
      const refWithDiacritics: CslItem = {
        ...reference,
        title: "Café Résumé: A Study of Naïve Approaches",
      };

      const token: SearchToken = {
        raw: "resume",
        value: "resume",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithDiacritics);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
    });
  });

  describe("Year field matching", () => {
    it("should match year from issued.date-parts", () => {
      const token: SearchToken = {
        raw: "2023",
        value: "2023",
        field: "year",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("year");
      expect(matches[0].strength).toBe("exact");
    });

    it("should not match wrong year", () => {
      const token: SearchToken = {
        raw: "2020",
        value: "2020",
        field: "year",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(0);
    });
  });

  describe("Keyword field matching (array field)", () => {
    it("should match keyword in array with field specifier", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["machine learning", "deep learning", "neural networks"],
      };

      const token: SearchToken = {
        raw: "keyword:machine",
        value: "machine",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithKeywords);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("keyword");
      expect(matches[0].strength).toBe("partial");
    });

    it("should match any keyword element in array", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["machine learning", "deep learning", "neural networks"],
      };

      const token: SearchToken = {
        raw: "keyword:neural",
        value: "neural",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithKeywords);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("keyword");
      expect(matches[0].value).toBe("neural networks");
    });

    it("should match keyword with normalization (case-insensitive when no consecutive uppercase)", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["Machine Learning", "Deep Learning"],
      };

      const token: SearchToken = {
        raw: "keyword:learning",
        value: "learning",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithKeywords);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].field).toBe("keyword");
    });

    it("should not match when keyword not in array", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["machine learning", "deep learning"],
      };

      const token: SearchToken = {
        raw: "keyword:quantum",
        value: "quantum",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithKeywords);
      expect(matches).toHaveLength(0);
    });

    it("should handle empty keyword array", () => {
      const refWithEmptyKeywords: CslItem = {
        ...reference,
        keyword: [],
      };

      const token: SearchToken = {
        raw: "keyword:machine",
        value: "machine",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithEmptyKeywords);
      expect(matches).toHaveLength(0);
    });

    it("should handle missing keyword field", () => {
      const token: SearchToken = {
        raw: "keyword:machine",
        value: "machine",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches).toHaveLength(0);
    });

    it("should search keyword in multi-field search", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["machine learning", "artificial intelligence"],
      };

      const token: SearchToken = {
        raw: "artificial",
        value: "artificial",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithKeywords);
      const keywordMatch = matches.find((m) => m.field === "keyword");
      expect(keywordMatch).toBeDefined();
      expect(keywordMatch?.strength).toBe("partial");
    });

    it("should match uppercase 'RNA' in keyword 'mRNA sequencing'", () => {
      const refWithRNAKeyword: CslItem = {
        ...reference,
        keyword: ["mRNA sequencing", "gene expression"],
      };

      const token: SearchToken = {
        raw: "keyword:RNA",
        value: "RNA",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithRNAKeyword);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("keyword");
      expect(matches[0].value).toBe("mRNA sequencing");
    });

    it("should NOT match uppercase 'RNA' in keyword 'mrna sequencing' (lowercase)", () => {
      const refWithLowercaseKeyword: CslItem = {
        ...reference,
        keyword: ["mrna sequencing", "gene expression"],
      };

      const token: SearchToken = {
        raw: "keyword:RNA",
        value: "RNA",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithLowercaseKeyword);
      expect(matches).toHaveLength(0);
    });

    it("should match lowercase query 'rna' with uppercase keyword 'RNA' (case-insensitive)", () => {
      const refWithUppercaseKeyword: CslItem = {
        ...reference,
        keyword: ["RNA sequencing", "gene expression"],
      };

      const token: SearchToken = {
        raw: "keyword:rna",
        value: "rna",
        field: "keyword",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithUppercaseKeyword);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("keyword");
    });
  });

  describe("Tag field matching (custom.tags array)", () => {
    it("should match tag in array with field specifier", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["review", "important"],
        },
      };

      const token: SearchToken = {
        raw: "tag:review",
        value: "review",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("tag");
      expect(matches[0].strength).toBe("partial");
    });

    it("should match partial tag value", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["review"],
        },
      };

      const token: SearchToken = {
        raw: "tag:rev",
        value: "rev",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("tag");
      expect(matches[0].value).toBe("review");
    });

    it("should return no match when custom is empty", () => {
      const refWithEmptyCustom: CslItem = {
        ...reference,
        custom: {},
      };

      const token: SearchToken = {
        raw: "tag:review",
        value: "review",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithEmptyCustom);
      expect(matches).toHaveLength(0);
    });

    it("should return no match when custom is missing", () => {
      const refWithoutCustom: CslItem = {
        id: "test",
        type: "article-journal",
        title: "Test Title",
      };

      const token: SearchToken = {
        raw: "tag:review",
        value: "review",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithoutCustom);
      expect(matches).toHaveLength(0);
    });

    it("should handle empty tags array", () => {
      const refWithEmptyTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: [],
        },
      };

      const token: SearchToken = {
        raw: "tag:review",
        value: "review",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithEmptyTags);
      expect(matches).toHaveLength(0);
    });

    it("should match any tag element in array", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["important", "urgent", "review"],
        },
      };

      const token: SearchToken = {
        raw: "tag:urgent",
        value: "urgent",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("tag");
      expect(matches[0].value).toBe("urgent");
    });

    it("should not match when tag not in array", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["review", "important"],
        },
      };

      const token: SearchToken = {
        raw: "tag:urgent",
        value: "urgent",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(0);
    });

    it("should search tag in multi-field search", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["review", "methodology"],
        },
      };

      const token: SearchToken = {
        raw: "methodology",
        value: "methodology",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      const tagMatch = matches.find((m) => m.field === "tag");
      expect(tagMatch).toBeDefined();
      expect(tagMatch?.strength).toBe("partial");
    });

    it("should match uppercase query in tag with uppercase-sensitivity", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["AI research", "methodology"],
        },
      };

      const token: SearchToken = {
        raw: "tag:AI",
        value: "AI",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("tag");
    });

    it("should NOT match uppercase query when tag has lowercase", () => {
      const refWithTags: CslItem = {
        ...reference,
        custom: {
          ...reference.custom,
          tags: ["ai research", "methodology"],
        },
      };

      const token: SearchToken = {
        raw: "tag:AI",
        value: "AI",
        field: "tag",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithTags);
      expect(matches).toHaveLength(0);
    });
  });

  describe("Multi-field search (no field specifier)", () => {
    it("should search across all fields when no field specified", () => {
      const token: SearchToken = {
        raw: "smith",
        value: "smith",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      expect(matches.length).toBeGreaterThan(0);
    });

    it("should return exact match for ID found in multi-field search", () => {
      const token: SearchToken = {
        raw: "12345678",
        value: "12345678",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      const pmidMatch = matches.find((m) => m.field === "PMID");
      expect(pmidMatch).toBeDefined();
      expect(pmidMatch?.strength).toBe("exact");
    });

    it("should return exact match for citation key (id) in multi-field search", () => {
      const token: SearchToken = {
        raw: "smith2023",
        value: "smith2023",
        isPhrase: false,
      };

      const matches = matchToken(token, reference);
      const idMatch = matches.find((m) => m.field === "id");
      expect(idMatch).toBeDefined();
      expect(idMatch?.strength).toBe("exact");
    });
  });

  describe("Uppercase-sensitive matching for content fields", () => {
    it("should match uppercase query 'AI' with title containing 'AI'", () => {
      const refWithAI: CslItem = {
        ...reference,
        title: "AI therapy for mental health",
      };

      const token: SearchToken = {
        raw: "title:AI",
        value: "AI",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithAI);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
    });

    it("should NOT match uppercase query 'AI' with title containing only 'ai'", () => {
      const refWithLowercaseAi: CslItem = {
        ...reference,
        title: "ai therapy for mental health",
      };

      const token: SearchToken = {
        raw: "title:AI",
        value: "AI",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithLowercaseAi);
      expect(matches).toHaveLength(0);
    });

    it("should NOT match uppercase query 'AI' with title containing 'Ai'", () => {
      const refWithMixedAi: CslItem = {
        ...reference,
        title: "Ai therapy for mental health",
      };

      const token: SearchToken = {
        raw: "title:AI",
        value: "AI",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithMixedAi);
      expect(matches).toHaveLength(0);
    });

    it("should match lowercase query 'api' with title containing 'API' (case-insensitive)", () => {
      const refWithAPI: CslItem = {
        ...reference,
        title: "RESTful API design patterns",
      };

      const token: SearchToken = {
        raw: "title:api",
        value: "api",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithAPI);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
    });

    it("should match mixed query 'AI therapy' with title containing both", () => {
      const refWithAITherapy: CslItem = {
        ...reference,
        title: "AI Therapy: New Approaches",
      };

      const token: SearchToken = {
        raw: "title:AI therapy",
        value: "AI therapy",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithAITherapy);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
    });

    it("should match 'RNA' in 'mRNA' (partial uppercase match)", () => {
      const refWithMRNA: CslItem = {
        ...reference,
        title: "mRNA sequencing advances",
      };

      const token: SearchToken = {
        raw: "title:RNA",
        value: "RNA",
        field: "title",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithMRNA);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("title");
    });

    it("should work with author field uppercase matching", () => {
      // Test with family name containing uppercase abbreviation
      const refWithAIAuthor: CslItem = {
        id: "test",
        type: "article-journal",
        title: "Test",
        author: [{ family: "AI Research Group", given: "Team" }],
        custom: {
          uuid: "test-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const token: SearchToken = {
        raw: "author:AI",
        value: "AI",
        field: "author",
        isPhrase: false,
      };

      const matches = matchToken(token, refWithAIAuthor);
      expect(matches).toHaveLength(1);
      expect(matches[0].field).toBe("author");
    });

    it("should NOT match author with lowercase when query has uppercase", () => {
      const refWithLowercaseAuthor: CslItem = {
        id: "test",
        type: "article-journal",
        title: "Test",
        author: [{ family: "Aiden", given: "John" }],
        custom: {
          uuid: "test-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const token: SearchToken = {
        raw: "author:AI",
        value: "AI",
        field: "author",
        isPhrase: false,
      };

      // "AI" should NOT match "Aiden" because consecutive uppercase requires exact case match
      const matches = matchToken(token, refWithLowercaseAuthor);
      expect(matches).toHaveLength(0);
    });
  });
});

describe("matchReference", () => {
  const references: CslItem[] = [
    {
      id: "smith2023",
      type: "article-journal",
      title: "Machine Learning in Medical Diagnosis",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      DOI: "10.1234/jmi.2023.0045",
      PMID: "12345678",
      custom: {
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
    {
      id: "wilson2021",
      type: "book",
      title: "Introduction to Data Science",
      author: [{ family: "Wilson", given: "Robert" }],
      issued: { "date-parts": [[2021]] },
      publisher: "Academic Press",
      custom: {
        uuid: "550e8400-e29b-41d4-a716-446655440002",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
  ];

  describe("AND logic", () => {
    it("should match when all tokens match", () => {
      const tokens: SearchToken[] = [
        { raw: "smith", value: "smith", isPhrase: false },
        { raw: "2023", value: "2023", isPhrase: false },
      ];

      const result = matchReference(references[0], tokens);
      expect(result).not.toBeNull();
      expect(result?.tokenMatches).toHaveLength(2);
    });

    it("should not match when any token does not match", () => {
      const tokens: SearchToken[] = [
        { raw: "smith", value: "smith", isPhrase: false },
        { raw: "2020", value: "2020", isPhrase: false },
      ];

      const result = matchReference(references[0], tokens);
      expect(result).toBeNull();
    });

    it("should match when all field-specific tokens match", () => {
      const tokens: SearchToken[] = [
        {
          raw: "author:smith",
          value: "smith",
          field: "author",
          isPhrase: false,
        },
        {
          raw: "title:learning",
          value: "learning",
          field: "title",
          isPhrase: false,
        },
      ];

      const result = matchReference(references[0], tokens);
      expect(result).not.toBeNull();
    });

    it("should handle empty token array", () => {
      const result = matchReference(references[0], []);
      expect(result).toBeNull();
    });
  });

  describe("Match strength calculation", () => {
    it("should set overallStrength to exact when ID field matches", () => {
      const tokens: SearchToken[] = [
        {
          raw: "pmid:12345678",
          value: "12345678",
          field: "pmid",
          isPhrase: false,
        },
      ];

      const result = matchReference(references[0], tokens);
      expect(result).not.toBeNull();
      expect(result?.overallStrength).toBe("exact");
    });

    it("should set overallStrength to partial when only content fields match", () => {
      const tokens: SearchToken[] = [{ raw: "machine", value: "machine", isPhrase: false }];

      const result = matchReference(references[0], tokens);
      expect(result).not.toBeNull();
      expect(result?.overallStrength).toBe("partial");
    });

    it("should calculate score based on match strength", () => {
      const tokens: SearchToken[] = [
        {
          raw: "pmid:12345678",
          value: "12345678",
          field: "pmid",
          isPhrase: false,
        },
      ];

      const result = matchReference(references[0], tokens);
      expect(result).not.toBeNull();
      expect(result?.score).toBeGreaterThan(0);
    });
  });
});
