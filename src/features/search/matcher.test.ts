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

    it("should match title case-insensitively", () => {
      const token: SearchToken = {
        raw: "MACHINE",
        value: "MACHINE",
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

    it("should match keyword with normalization", () => {
      const refWithKeywords: CslItem = {
        ...reference,
        keyword: ["Machine Learning", "Deep Learning"],
      };

      const token: SearchToken = {
        raw: "keyword:LEARNING",
        value: "LEARNING",
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
