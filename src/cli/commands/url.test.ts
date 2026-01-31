import { describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { type UrlCommandResult, executeUrlCommand, formatUrlOutput } from "./url.js";

// Mock openWithSystemApp
vi.mock("../../utils/opener.js", () => ({
  openWithSystemApp: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Helper to create a minimal CslItem for testing.
 */
function makeItem(id: string, overrides: Partial<CslItem> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    ...overrides,
  };
}

/**
 * Create a mock execution context with given items.
 */
function createMockContext(items: CslItem[]) {
  return {
    mode: "local" as const,
    library: {
      find: vi.fn(async (identifier: string, options?: { idType?: string }) => {
        if (options?.idType === "uuid") {
          return items.find((i) => i.custom?.uuid === identifier);
        }
        return items.find((i) => i.id === identifier);
      }),
      getAll: vi.fn(async () => items),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      save: vi.fn(),
      search: vi.fn(),
      list: vi.fn(),
      cite: vi.fn(),
      import: vi.fn(),
      attachAdd: vi.fn(),
      attachList: vi.fn(),
      attachGet: vi.fn(),
      attachDetach: vi.fn(),
      attachSync: vi.fn(),
      attachOpen: vi.fn(),
    },
  };
}

describe("executeUrlCommand", () => {
  it("resolves all URLs for a single identifier", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        URL: "https://journal.com/article",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], {}, context);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("smith2023");
    expect(result.results[0].urls).toEqual([
      "https://doi.org/10.1000/example",
      "https://journal.com/article",
    ]);
    expect(result.results[0].error).toBeUndefined();
  });

  it("resolves URLs for multiple identifiers", async () => {
    const items = [
      makeItem("smith2023", { DOI: "10.1000/example" }),
      makeItem("jones2024", { URL: "https://other.com" }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023", "jones2024"], {}, context);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].urls).toEqual(["https://doi.org/10.1000/example"]);
    expect(result.results[1].urls).toEqual(["https://other.com"]);
  });

  it("returns error for not-found reference", async () => {
    const context = createMockContext([]);

    const result = await executeUrlCommand(["nonexistent"], {}, context);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].error).toBe("Reference not found: nonexistent");
    expect(result.results[0].urls).toEqual([]);
  });

  it("returns error when no URLs available", async () => {
    const items = [makeItem("smith2023")];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], {}, context);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].error).toBe("No URLs available for smith2023");
    expect(result.results[0].urls).toEqual([]);
  });

  it("applies --default filter to return only best URL", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        URL: "https://journal.com",
        PMID: "12345678",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { default: true }, context);

    expect(result.results[0].urls).toEqual(["https://doi.org/10.1000/example"]);
  });

  it("applies --doi filter", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        URL: "https://journal.com",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { doi: true }, context);

    expect(result.results[0].urls).toEqual(["https://doi.org/10.1000/example"]);
  });

  it("applies --pubmed filter", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        PMID: "12345678",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { pubmed: true }, context);

    expect(result.results[0].urls).toEqual(["https://pubmed.ncbi.nlm.nih.gov/12345678/"]);
  });

  it("applies --pmcid filter", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        PMCID: "PMC9876543",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { pmcid: true }, context);

    expect(result.results[0].urls).toEqual([
      "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9876543/",
    ]);
  });

  it("returns error when filtered type is not available", async () => {
    const items = [makeItem("smith2023", { URL: "https://journal.com" })];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { doi: true }, context);

    expect(result.results[0].error).toBe("No DOI URL for smith2023");
    expect(result.results[0].urls).toEqual([]);
  });

  it("uses UUID lookup when --uuid is set", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        custom: { uuid: "abc-123" },
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["abc-123"], { uuid: true }, context);

    expect(context.library.find).toHaveBeenCalledWith("abc-123", { idType: "uuid" });
    expect(result.results[0].urls).toEqual(["https://doi.org/10.1000/example"]);
  });

  it("calls openWithSystemApp when --open is set", async () => {
    const { openWithSystemApp } = await import("../../utils/opener.js");
    const items = [makeItem("smith2023", { DOI: "10.1000/example" })];
    const context = createMockContext(items);

    await executeUrlCommand(["smith2023"], { open: true }, context);

    expect(openWithSystemApp).toHaveBeenCalledWith("https://doi.org/10.1000/example");
  });

  it("--open implies --default if no other filter", async () => {
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        URL: "https://journal.com",
      }),
    ];
    const context = createMockContext(items);

    const result = await executeUrlCommand(["smith2023"], { open: true }, context);

    // Should only return the default (best) URL
    expect(result.results[0].urls).toEqual(["https://doi.org/10.1000/example"]);
  });

  it("--open with --pubmed opens pubmed URL", async () => {
    const { openWithSystemApp } = await import("../../utils/opener.js");
    const items = [
      makeItem("smith2023", {
        DOI: "10.1000/example",
        PMID: "12345678",
      }),
    ];
    const context = createMockContext(items);

    await executeUrlCommand(["smith2023"], { open: true, pubmed: true }, context);

    expect(openWithSystemApp).toHaveBeenCalledWith("https://pubmed.ncbi.nlm.nih.gov/12345678/");
  });
});

describe("formatUrlOutput", () => {
  it("formats single ID without filter as URLs only (one per line)", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: ["https://doi.org/10.1000/example", "https://journal.com/article"],
        },
      ],
    };

    const output = formatUrlOutput(result, {});
    expect(output).toBe("https://doi.org/10.1000/example\nhttps://journal.com/article");
  });

  it("formats multiple IDs without filter as TSV (id\\turl)", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: ["https://doi.org/10.1000/example", "https://journal.com/article"],
        },
        {
          id: "jones2024",
          urls: ["https://doi.org/10.2000/other"],
        },
      ],
    };

    const output = formatUrlOutput(result, {});
    expect(output).toBe(
      "smith2023\thttps://doi.org/10.1000/example\nsmith2023\thttps://journal.com/article\njones2024\thttps://doi.org/10.2000/other"
    );
  });

  it("formats with filter as plain URLs regardless of ID count", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: ["https://doi.org/10.1000/example"],
        },
        {
          id: "jones2024",
          urls: ["https://doi.org/10.2000/other"],
        },
      ],
    };

    const output = formatUrlOutput(result, { default: true });
    expect(output).toBe("https://doi.org/10.1000/example\nhttps://doi.org/10.2000/other");
  });

  it("formats with --doi filter as plain URLs", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: ["https://doi.org/10.1000/example"],
        },
      ],
    };

    const output = formatUrlOutput(result, { doi: true });
    expect(output).toBe("https://doi.org/10.1000/example");
  });

  it("returns empty string when all results have errors", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: [],
          error: "No URLs available for smith2023",
        },
      ],
    };

    const output = formatUrlOutput(result, {});
    expect(output).toBe("");
  });

  it("skips error results in output", () => {
    const result: UrlCommandResult = {
      results: [
        {
          id: "smith2023",
          urls: ["https://doi.org/10.1000/example"],
        },
        {
          id: "missing",
          urls: [],
          error: "Reference not found: missing",
        },
      ],
    };

    const output = formatUrlOutput(result, { default: true });
    expect(output).toBe("https://doi.org/10.1000/example");
  });
});
