import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { resolveAllUrls, resolveDefaultUrl, resolveUrlByType } from "./url.js";

/**
 * Helper to create a minimal CslItem for testing.
 */
function makeItem(overrides: Partial<CslItem> = {}): CslItem {
  return {
    id: "test2023",
    type: "article-journal",
    ...overrides,
  };
}

describe("resolveAllUrls", () => {
  it("returns all URLs in priority order (DOI > URL > PMID > PMCID > additional_urls)", () => {
    const item = makeItem({
      DOI: "10.1000/example",
      URL: "https://journal.com/article/123",
      PMID: "12345678",
      PMCID: "PMC9876543",
      custom: {
        additional_urls: ["https://extra1.com", "https://extra2.com"],
      },
    });

    const urls = resolveAllUrls(item);
    expect(urls).toEqual([
      "https://doi.org/10.1000/example",
      "https://journal.com/article/123",
      "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9876543/",
      "https://extra1.com",
      "https://extra2.com",
    ]);
  });

  it("returns only available URLs when some fields are missing", () => {
    const item = makeItem({
      DOI: "10.1000/example",
      PMID: "12345678",
    });

    const urls = resolveAllUrls(item);
    expect(urls).toEqual([
      "https://doi.org/10.1000/example",
      "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    ]);
  });

  it("includes additional_urls after standard URLs", () => {
    const item = makeItem({
      URL: "https://journal.com/article",
      custom: {
        additional_urls: ["https://extra.com"],
      },
    });

    const urls = resolveAllUrls(item);
    expect(urls).toEqual(["https://journal.com/article", "https://extra.com"]);
  });

  it("returns empty array when no URLs available", () => {
    const item = makeItem();
    const urls = resolveAllUrls(item);
    expect(urls).toEqual([]);
  });

  it("handles empty additional_urls array", () => {
    const item = makeItem({
      DOI: "10.1000/example",
      custom: {
        additional_urls: [],
      },
    });

    const urls = resolveAllUrls(item);
    expect(urls).toEqual(["https://doi.org/10.1000/example"]);
  });

  it("handles item with only additional_urls", () => {
    const item = makeItem({
      custom: {
        additional_urls: ["https://extra1.com", "https://extra2.com"],
      },
    });

    const urls = resolveAllUrls(item);
    expect(urls).toEqual(["https://extra1.com", "https://extra2.com"]);
  });
});

describe("resolveDefaultUrl", () => {
  it("returns DOI URL when DOI is available", () => {
    const item = makeItem({
      DOI: "10.1000/example",
      URL: "https://journal.com/article",
      PMID: "12345678",
    });

    expect(resolveDefaultUrl(item)).toBe("https://doi.org/10.1000/example");
  });

  it("falls back to URL when DOI is not available", () => {
    const item = makeItem({
      URL: "https://journal.com/article",
      PMID: "12345678",
    });

    expect(resolveDefaultUrl(item)).toBe("https://journal.com/article");
  });

  it("falls back to PMID when DOI and URL are not available", () => {
    const item = makeItem({
      PMID: "12345678",
      PMCID: "PMC9876543",
    });

    expect(resolveDefaultUrl(item)).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
  });

  it("falls back to PMCID when DOI, URL, and PMID are not available", () => {
    const item = makeItem({
      PMCID: "PMC9876543",
    });

    expect(resolveDefaultUrl(item)).toBe("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9876543/");
  });

  it("falls back to first additional_url when no standard fields available", () => {
    const item = makeItem({
      custom: {
        additional_urls: ["https://extra1.com", "https://extra2.com"],
      },
    });

    expect(resolveDefaultUrl(item)).toBe("https://extra1.com");
  });

  it("returns null when no URLs are available", () => {
    const item = makeItem();
    expect(resolveDefaultUrl(item)).toBeNull();
  });

  it("returns null when additional_urls is empty and no standard fields", () => {
    const item = makeItem({
      custom: { additional_urls: [] },
    });
    expect(resolveDefaultUrl(item)).toBeNull();
  });
});

describe("resolveUrlByType", () => {
  it("returns DOI URL for type doi", () => {
    const item = makeItem({ DOI: "10.1000/example" });
    expect(resolveUrlByType(item, "doi")).toBe("https://doi.org/10.1000/example");
  });

  it("returns URL for type url", () => {
    const item = makeItem({ URL: "https://journal.com/article" });
    expect(resolveUrlByType(item, "url")).toBe("https://journal.com/article");
  });

  it("returns PubMed URL for type pubmed", () => {
    const item = makeItem({ PMID: "12345678" });
    expect(resolveUrlByType(item, "pubmed")).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
  });

  it("returns PMC URL for type pmcid", () => {
    const item = makeItem({ PMCID: "PMC9876543" });
    expect(resolveUrlByType(item, "pmcid")).toBe(
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9876543/"
    );
  });

  it("returns null when DOI type is not available", () => {
    const item = makeItem({ URL: "https://journal.com" });
    expect(resolveUrlByType(item, "doi")).toBeNull();
  });

  it("returns null when URL type is not available", () => {
    const item = makeItem({ DOI: "10.1000/example" });
    expect(resolveUrlByType(item, "url")).toBeNull();
  });

  it("returns null when PubMed type is not available", () => {
    const item = makeItem({ DOI: "10.1000/example" });
    expect(resolveUrlByType(item, "pubmed")).toBeNull();
  });

  it("returns null when PMCID type is not available", () => {
    const item = makeItem({ DOI: "10.1000/example" });
    expect(resolveUrlByType(item, "pmcid")).toBeNull();
  });
});
