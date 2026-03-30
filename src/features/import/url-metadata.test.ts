import { describe, expect, it, vi } from "vitest";
import { extractMetadata } from "./url-metadata.js";

/**
 * Helper to create a mock Playwright Page that simulates page.evaluate()
 * extracting metadata from the DOM.
 */
function createMockPage(opts: {
  title?: string;
  url?: string;
  jsonLd?: unknown[];
  citationMeta?: Record<string, string | string[]>;
  dcMeta?: Record<string, string>;
  ogMeta?: Record<string, string>;
}) {
  const {
    title = "",
    url = "https://example.com",
    jsonLd = [],
    citationMeta = {},
    dcMeta = {},
    ogMeta = {},
  } = opts;

  return {
    title: vi.fn().mockResolvedValue(title),
    url: vi.fn().mockReturnValue(url),
    evaluate: vi.fn().mockResolvedValue({
      jsonLd,
      citation: citationMeta,
      dc: dcMeta,
      og: ogMeta,
      title,
    }),
  };
}

describe("extractMetadata", () => {
  // --- Phase 1 basic tests (preserved) ---

  it("should extract title from page", async () => {
    const page = createMockPage({ title: "Example Page" });
    const result = await extractMetadata(page as never);
    expect(result.title).toBe("Example Page");
  });

  it("should set URL from page", async () => {
    const page = createMockPage({
      title: "Example",
      url: "https://example.com/page?q=test",
    });
    const result = await extractMetadata(page as never);
    expect(result.URL).toBe("https://example.com/page?q=test");
  });

  it("should set type to webpage by default", async () => {
    const page = createMockPage({ title: "Example" });
    const result = await extractMetadata(page as never);
    expect(result.type).toBe("webpage");
  });

  it("should set accessed date to today", async () => {
    const page = createMockPage({ title: "Example" });
    const result = await extractMetadata(page as never);

    expect(result.accessed).toBeDefined();
    const parts = result.accessed?.["date-parts"]?.[0];
    expect(parts).toHaveLength(3);
    const now = new Date();
    expect(parts?.[0]).toBe(now.getFullYear());
    expect(parts?.[1]).toBe(now.getMonth() + 1);
    expect(parts?.[2]).toBe(now.getDate());
  });

  it("should use URL as title fallback when title is empty", async () => {
    const page = createMockPage({ url: "https://example.com/page" });
    const result = await extractMetadata(page as never);
    expect(result.title).toBe("https://example.com/page");
  });

  it("should set empty id for later generation", async () => {
    const page = createMockPage({ title: "Example" });
    const result = await extractMetadata(page as never);
    expect(result.id).toBe("");
  });

  // --- Step 1: JSON-LD Metadata Extraction ---

  describe("JSON-LD extraction", () => {
    it("should extract title from JSON-LD name field", async () => {
      const page = createMockPage({
        title: "HTML Title",
        jsonLd: [{ "@type": "WebPage", name: "JSON-LD Title" }],
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("JSON-LD Title");
    });

    it("should extract author from JSON-LD", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Article",
            author: { "@type": "Person", name: "John Smith" },
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([{ family: "Smith", given: "John" }]);
    });

    it("should extract multiple authors from JSON-LD array", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Article",
            author: [
              { "@type": "Person", name: "John Smith" },
              { "@type": "Person", name: "Jane Doe" },
            ],
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Jane" },
      ]);
    });

    it("should extract datePublished from JSON-LD as issued", async () => {
      const page = createMockPage({
        jsonLd: [{ "@type": "Article", datePublished: "2024-03-15" }],
      });
      const result = await extractMetadata(page as never);
      expect(result.issued).toEqual({ "date-parts": [[2024, 3, 15]] });
    });

    it("should extract legislationDate from JSON-LD as issued", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Legislation",
            name: "Some Law",
            legislationDate: "2023-06-01",
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.issued).toEqual({ "date-parts": [[2023, 6, 1]] });
    });

    it("should extract DOI from JSON-LD identifier", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "ScholarlyArticle",
            identifier: "10.1234/example.2024",
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.DOI).toBe("10.1234/example.2024");
    });

    it("should extract publisher name from JSON-LD", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Article",
            publisher: { "@type": "Organization", name: "Nature Publishing" },
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.publisher).toBe("Nature Publishing");
    });

    it("should extract publisher as string from JSON-LD", async () => {
      const page = createMockPage({
        jsonLd: [{ "@type": "Article", publisher: "Some Publisher" }],
      });
      const result = await extractMetadata(page as never);
      expect(result.publisher).toBe("Some Publisher");
    });

    it("should extract description from JSON-LD as abstract", async () => {
      const page = createMockPage({
        jsonLd: [{ "@type": "Article", description: "This is the abstract text." }],
      });
      const result = await extractMetadata(page as never);
      expect(result.abstract).toBe("This is the abstract text.");
    });

    it("should handle @graph pattern in JSON-LD", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@graph": [
              { "@type": "WebSite", name: "Site Name" },
              {
                "@type": "Article",
                name: "Article Title",
                author: { name: "Author Name" },
              },
            ],
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("Article Title");
    });

    it("should handle organization author in JSON-LD", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Report",
            author: {
              "@type": "Organization",
              name: "World Health Organization",
            },
          },
        ],
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([{ literal: "World Health Organization" }]);
    });
  });

  // --- Step 2: JSON-LD @type → CSL type Mapping ---

  describe("JSON-LD @type to CSL type mapping", () => {
    it.each([
      ["Legislation", "legislation"],
      ["LegislationObject", "legislation"],
      ["Report", "report"],
      ["Article", "article"],
      ["ScholarlyArticle", "article-journal"],
      ["NewsArticle", "article-newspaper"],
      ["WebPage", "webpage"],
    ])("should map Schema.org @type %s to CSL type %s", async (schemaType, cslType) => {
      const page = createMockPage({
        jsonLd: [{ "@type": schemaType, name: "Test" }],
      });
      const result = await extractMetadata(page as never);
      expect(result.type).toBe(cslType);
    });

    it("should default to webpage for unmapped @type", async () => {
      const page = createMockPage({
        jsonLd: [{ "@type": "Product", name: "Test" }],
      });
      const result = await extractMetadata(page as never);
      expect(result.type).toBe("webpage");
    });

    it("should default to webpage when no JSON-LD is present", async () => {
      const page = createMockPage({ title: "Test" });
      const result = await extractMetadata(page as never);
      expect(result.type).toBe("webpage");
    });
  });

  // --- Step 3: citation_* Meta Tag Extraction ---

  describe("citation_* extraction", () => {
    it("should extract citation_title", async () => {
      const page = createMockPage({
        citationMeta: { citation_title: "Citation Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("Citation Title");
    });

    it("should extract multiple citation_author values", async () => {
      const page = createMockPage({
        citationMeta: {
          citation_author: ["Smith, John", "Doe, Jane"],
        },
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Jane" },
      ]);
    });

    it("should extract citation_date as issued", async () => {
      const page = createMockPage({
        citationMeta: { citation_date: "2024/03/15" },
      });
      const result = await extractMetadata(page as never);
      expect(result.issued).toEqual({ "date-parts": [[2024, 3, 15]] });
    });

    it("should extract citation_publication_date as issued fallback", async () => {
      const page = createMockPage({
        citationMeta: { citation_publication_date: "2024/01/20" },
      });
      const result = await extractMetadata(page as never);
      expect(result.issued).toEqual({ "date-parts": [[2024, 1, 20]] });
    });

    it("should extract citation_doi", async () => {
      const page = createMockPage({
        citationMeta: { citation_doi: "10.1000/test" },
      });
      const result = await extractMetadata(page as never);
      expect(result.DOI).toBe("10.1000/test");
    });

    it("should extract citation_journal_title as publisher", async () => {
      const page = createMockPage({
        citationMeta: { citation_journal_title: "Nature" },
      });
      const result = await extractMetadata(page as never);
      expect(result.publisher).toBe("Nature");
    });

    it("should handle single citation_author as string", async () => {
      const page = createMockPage({
        citationMeta: { citation_author: "Smith, John" },
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([{ family: "Smith", given: "John" }]);
    });
  });

  // --- Step 4: Dublin Core Extraction ---

  describe("Dublin Core extraction", () => {
    it("should extract DC.title", async () => {
      const page = createMockPage({
        dcMeta: { "DC.title": "DC Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("DC Title");
    });

    it("should extract DC.creator as author", async () => {
      const page = createMockPage({
        dcMeta: { "DC.creator": "John Smith" },
      });
      const result = await extractMetadata(page as never);
      expect(result.author).toEqual([{ family: "Smith", given: "John" }]);
    });

    it("should extract DC.date as issued", async () => {
      const page = createMockPage({
        dcMeta: { "DC.date": "2024-06-01" },
      });
      const result = await extractMetadata(page as never);
      expect(result.issued).toEqual({ "date-parts": [[2024, 6, 1]] });
    });

    it("should extract DC.publisher", async () => {
      const page = createMockPage({
        dcMeta: { "DC.publisher": "Government Printing Office" },
      });
      const result = await extractMetadata(page as never);
      expect(result.publisher).toBe("Government Printing Office");
    });

    it("should extract DC.description as abstract", async () => {
      const page = createMockPage({
        dcMeta: { "DC.description": "A DC abstract." },
      });
      const result = await extractMetadata(page as never);
      expect(result.abstract).toBe("A DC abstract.");
    });

    it("should extract DOI from DC.identifier", async () => {
      const page = createMockPage({
        dcMeta: { "DC.identifier": "10.1234/dc.example" },
      });
      const result = await extractMetadata(page as never);
      expect(result.DOI).toBe("10.1234/dc.example");
    });

    it("should not extract non-DOI DC.identifier as DOI", async () => {
      const page = createMockPage({
        dcMeta: { "DC.identifier": "ISBN:978-3-16-148410-0" },
      });
      const result = await extractMetadata(page as never);
      expect(result.DOI).toBeUndefined();
    });
  });

  // --- Step 5: Open Graph Extraction ---

  describe("Open Graph extraction", () => {
    it("should extract og:title as fallback title", async () => {
      const page = createMockPage({
        ogMeta: { "og:title": "OG Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("OG Title");
    });

    it("should extract og:description as fallback abstract", async () => {
      const page = createMockPage({
        ogMeta: { "og:description": "OG description text." },
      });
      const result = await extractMetadata(page as never);
      expect(result.abstract).toBe("OG description text.");
    });
  });

  // --- Step 6: Metadata Merge with Fallback Priority ---

  describe("metadata merge with fallback priority", () => {
    it("should prefer JSON-LD title over citation_* and DC", async () => {
      const page = createMockPage({
        title: "HTML Title",
        jsonLd: [{ "@type": "Article", name: "JSON-LD Title" }],
        citationMeta: { citation_title: "Citation Title" },
        dcMeta: { "DC.title": "DC Title" },
        ogMeta: { "og:title": "OG Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("JSON-LD Title");
    });

    it("should prefer citation_* title over DC and OG when no JSON-LD", async () => {
      const page = createMockPage({
        title: "HTML Title",
        citationMeta: { citation_title: "Citation Title" },
        dcMeta: { "DC.title": "DC Title" },
        ogMeta: { "og:title": "OG Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("Citation Title");
    });

    it("should prefer DC title over OG when no JSON-LD or citation_*", async () => {
      const page = createMockPage({
        title: "HTML Title",
        dcMeta: { "DC.title": "DC Title" },
        ogMeta: { "og:title": "OG Title" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("DC Title");
    });

    it("should fall back to HTML title when no metadata sources", async () => {
      const page = createMockPage({ title: "HTML Title" });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("HTML Title");
    });

    it("should merge fields from different sources", async () => {
      const page = createMockPage({
        title: "HTML Title",
        jsonLd: [{ "@type": "Report", name: "Report Title" }],
        citationMeta: {
          citation_author: "Smith, John",
          citation_doi: "10.1000/test",
        },
        dcMeta: { "DC.publisher": "Gov Press" },
        ogMeta: { "og:description": "A description" },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("Report Title");
      expect(result.type).toBe("report");
      expect(result.author).toEqual([{ family: "Smith", given: "John" }]);
      expect(result.DOI).toBe("10.1000/test");
      expect(result.publisher).toBe("Gov Press");
      expect(result.abstract).toBe("A description");
    });

    it("should not overwrite higher-priority fields with lower-priority ones", async () => {
      const page = createMockPage({
        jsonLd: [
          {
            "@type": "Article",
            name: "JSON-LD Title",
            description: "JSON-LD Abstract",
            publisher: { name: "JSON-LD Publisher" },
          },
        ],
        dcMeta: {
          "DC.title": "DC Title",
          "DC.description": "DC Abstract",
          "DC.publisher": "DC Publisher",
        },
      });
      const result = await extractMetadata(page as never);
      expect(result.title).toBe("JSON-LD Title");
      expect(result.abstract).toBe("JSON-LD Abstract");
      expect(result.publisher).toBe("JSON-LD Publisher");
    });
  });
});
