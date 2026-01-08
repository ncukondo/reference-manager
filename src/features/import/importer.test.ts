/**
 * Importer orchestration tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/types.js";

// Mock the fetcher module
vi.mock("./fetcher.js", () => ({
  fetchPmids: vi.fn(),
  fetchDoi: vi.fn(),
  fetchIsbn: vi.fn(),
}));

// Mock the cache module
vi.mock("./cache.js", () => ({
  getPmidFromCache: vi.fn(),
  getDoiFromCache: vi.fn(),
  getIsbnFromCache: vi.fn(),
  cachePmidResult: vi.fn(),
  cacheDoiResult: vi.fn(),
  cacheIsbnResult: vi.fn(),
  resetCache: vi.fn(),
}));

import { getDoiFromCache, getIsbnFromCache, getPmidFromCache } from "./cache.js";
import { fetchDoi, fetchIsbn, fetchPmids } from "./fetcher.js";
import { importFromContent, importFromIdentifiers } from "./importer.js";

const mockFetchPmids = vi.mocked(fetchPmids);
const mockFetchDoi = vi.mocked(fetchDoi);
const mockFetchIsbn = vi.mocked(fetchIsbn);
const mockGetPmidFromCache = vi.mocked(getPmidFromCache);
const mockGetDoiFromCache = vi.mocked(getDoiFromCache);
const mockGetIsbnFromCache = vi.mocked(getIsbnFromCache);

describe("importer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPmidFromCache.mockReturnValue(null);
    mockGetDoiFromCache.mockReturnValue(null);
    mockGetIsbnFromCache.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("importFromContent", () => {
    describe("JSON format", () => {
      it("should parse valid CSL-JSON array", async () => {
        const content = JSON.stringify([
          {
            id: "smith2024",
            type: "article-journal",
            title: "Test Article",
          },
        ]);

        const result = await importFromContent(content, "json", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.id).toBe("smith2024");
          expect(result.results[0].item.title).toBe("Test Article");
        }
      });

      it("should parse valid CSL-JSON single object", async () => {
        const content = JSON.stringify({
          id: "jones2023",
          type: "book",
          title: "Test Book",
        });

        const result = await importFromContent(content, "json", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.id).toBe("jones2023");
        }
      });

      it("should handle invalid JSON", async () => {
        const content = "{ invalid json }";

        const result = await importFromContent(content, "json", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toContain("JSON");
        }
      });

      it("should handle empty JSON array", async () => {
        const content = "[]";

        const result = await importFromContent(content, "json", {});

        expect(result.results).toHaveLength(0);
      });
    });

    describe("BibTeX format", () => {
      it("should parse valid BibTeX", async () => {
        const content = `@article{smith2024,
  author = {Smith, John},
  title = {Test Article},
  journal = {Test Journal},
  year = {2024}
}`;

        const result = await importFromContent(content, "bibtex", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Test Article");
        }
      });

      it("should parse multiple BibTeX entries", async () => {
        const content = `@article{smith2024,
  title = {First Article},
  year = {2024}
}
@book{jones2023,
  title = {First Book},
  year = {2023}
}`;

        const result = await importFromContent(content, "bibtex", {});

        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);
      });

      it("should handle empty BibTeX", async () => {
        const content = "";

        const result = await importFromContent(content, "bibtex", {});

        expect(result.results).toHaveLength(0);
      });
    });

    describe("RIS format", () => {
      it("should parse valid RIS", async () => {
        const content = `TY  - JOUR
TI  - Test Article
AU  - Smith, John
PY  - 2024
ER  - `;

        const result = await importFromContent(content, "ris", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Test Article");
        }
      });

      it("should handle empty RIS", async () => {
        const content = "";

        const result = await importFromContent(content, "ris", {});

        expect(result.results).toHaveLength(0);
      });
    });

    describe("NBIB format", () => {
      it("should parse valid NBIB", async () => {
        const content = `PMID- 12345678
TI  - Test Article
FAU - Smith, John
JT  - Test Journal
DP  - 2024`;

        const result = await importFromContent(content, "nbib", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Test Article");
          expect(result.results[0].source).toBe("nbib");
        }
      });

      it("should parse multiple NBIB entries", async () => {
        const content = `PMID- 11111111
TI  - First Article
DP  - 2024

PMID- 22222222
TI  - Second Article
DP  - 2023`;

        const result = await importFromContent(content, "nbib", {});

        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);
      });

      it("should handle empty NBIB", async () => {
        const content = "";

        const result = await importFromContent(content, "nbib", {});

        expect(result.results).toHaveLength(0);
      });

      it("should auto-detect NBIB format by PMID- prefix", async () => {
        const content = `PMID- 12345678
TI  - Auto Detected Article
DP  - 2024`;

        const result = await importFromContent(content, "auto", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Auto Detected Article");
        }
      });
    });

    describe("auto detection", () => {
      it("should auto-detect JSON format", async () => {
        const content = JSON.stringify([
          { id: "test1", type: "article-journal", title: "Auto Test" },
        ]);

        const result = await importFromContent(content, "auto", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
      });

      it("should auto-detect BibTeX format", async () => {
        const content = `@article{test1,
  title = {Auto Test},
  year = {2024}
}`;

        const result = await importFromContent(content, "auto", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
      });

      it("should return error for unknown format", async () => {
        const content = "This is just plain text that cannot be parsed";

        const result = await importFromContent(content, "auto", {});

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toContain("detect");
        }
      });
    });
  });

  describe("importFromIdentifiers", () => {
    describe("PMID fetching", () => {
      it("should fetch single PMID", async () => {
        const mockItem: CslItem = {
          id: "pmid_12345678",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

        const result = await importFromIdentifiers(["12345678"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.PMID).toBe("12345678");
          expect(result.results[0].source).toBe("12345678");
        }
      });

      it("should fetch multiple PMIDs", async () => {
        const mockItems: CslItem[] = [
          { id: "p1", type: "article-journal", title: "First", PMID: "111" },
          { id: "p2", type: "article-journal", title: "Second", PMID: "222" },
        ];

        mockFetchPmids.mockResolvedValue([
          { pmid: "111", success: true, item: mockItems[0] },
          { pmid: "222", success: true, item: mockItems[1] },
        ]);

        const result = await importFromIdentifiers(["111", "222"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.every((r) => r.success)).toBe(true);
      });

      it("should handle PMID not found", async () => {
        mockFetchPmids.mockResolvedValue([
          { pmid: "99999999", success: false, error: "Not found" },
        ]);

        const result = await importFromIdentifiers(["99999999"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toBe("Not found");
          expect(result.results[0].source).toBe("99999999");
        }
      });

      it("should use cached PMID result", async () => {
        const cachedItem: CslItem = {
          id: "cached",
          type: "article-journal",
          title: "Cached Article",
          PMID: "12345678",
        };

        mockGetPmidFromCache.mockReturnValue(cachedItem);

        const result = await importFromIdentifiers(["12345678"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Cached Article");
        }
        expect(mockFetchPmids).not.toHaveBeenCalled();
      });
    });

    describe("DOI fetching", () => {
      it("should fetch single DOI", async () => {
        const mockItem: CslItem = {
          id: "doi_10.1000/xyz",
          type: "article-journal",
          title: "DOI Article",
          DOI: "10.1000/xyz",
        };

        mockFetchDoi.mockResolvedValue({ success: true, item: mockItem });

        const result = await importFromIdentifiers(["10.1000/xyz"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.DOI).toBe("10.1000/xyz");
          expect(result.results[0].source).toBe("10.1000/xyz");
        }
      });

      it("should normalize DOI URL before fetching", async () => {
        const mockItem: CslItem = {
          id: "doi_10.1000/xyz",
          type: "article-journal",
          title: "DOI Article",
          DOI: "10.1000/xyz",
        };

        mockFetchDoi.mockResolvedValue({ success: true, item: mockItem });

        const result = await importFromIdentifiers(["https://doi.org/10.1000/xyz"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        // fetchDoi should be called with normalized DOI
        expect(mockFetchDoi).toHaveBeenCalledWith("10.1000/xyz");
      });

      it("should handle DOI not found", async () => {
        mockFetchDoi.mockResolvedValue({
          success: false,
          error: "DOI not found",
        });

        const result = await importFromIdentifiers(["10.9999/notfound"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toBe("DOI not found");
        }
      });

      it("should use cached DOI result", async () => {
        const cachedItem: CslItem = {
          id: "cached_doi",
          type: "article-journal",
          title: "Cached DOI Article",
          DOI: "10.1000/xyz",
        };

        mockGetDoiFromCache.mockReturnValue(cachedItem);

        const result = await importFromIdentifiers(["10.1000/xyz"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Cached DOI Article");
        }
        expect(mockFetchDoi).not.toHaveBeenCalled();
      });
    });

    describe("ISBN fetching", () => {
      it("should fetch single ISBN with prefix", async () => {
        const mockItem: CslItem = {
          id: "isbn_9784000000000",
          type: "book",
          title: "ISBN Book",
          ISBN: "9784000000000",
        };

        mockFetchIsbn.mockResolvedValue({ success: true, item: mockItem });

        const result = await importFromIdentifiers(["ISBN:978-4-00-000000-0"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.ISBN).toBe("9784000000000");
          expect(result.results[0].source).toBe("9784000000000");
        }
        // fetchIsbn should be called with normalized ISBN
        expect(mockFetchIsbn).toHaveBeenCalledWith("9784000000000");
      });

      it("should fetch ISBN-10 with prefix", async () => {
        const mockItem: CslItem = {
          id: "isbn_400000000X",
          type: "book",
          title: "ISBN-10 Book",
          ISBN: "400000000X",
        };

        mockFetchIsbn.mockResolvedValue({ success: true, item: mockItem });

        const result = await importFromIdentifiers(["isbn:4-00-000000-X"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        // fetchIsbn should be called with normalized ISBN-10
        expect(mockFetchIsbn).toHaveBeenCalledWith("400000000X");
      });

      it("should handle ISBN not found", async () => {
        mockFetchIsbn.mockResolvedValue({
          success: false,
          error: "No data returned for ISBN 9789999999999",
        });

        const result = await importFromIdentifiers(["ISBN:9789999999999"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toContain("ISBN");
          expect(result.results[0].source).toBe("9789999999999");
        }
      });

      it("should use cached ISBN result", async () => {
        const cachedItem: CslItem = {
          id: "cached_isbn",
          type: "book",
          title: "Cached ISBN Book",
          ISBN: "9784000000000",
        };

        mockGetIsbnFromCache.mockReturnValue(cachedItem);

        const result = await importFromIdentifiers(["ISBN:9784000000000"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        if (result.results[0].success) {
          expect(result.results[0].item.title).toBe("Cached ISBN Book");
        }
        expect(mockFetchIsbn).not.toHaveBeenCalled();
      });

      it("should fetch multiple ISBNs", async () => {
        const mockItems: CslItem[] = [
          { id: "i1", type: "book", title: "First Book", ISBN: "9784000000001" },
          { id: "i2", type: "book", title: "Second Book", ISBN: "9784000000002" },
        ];

        mockFetchIsbn
          .mockResolvedValueOnce({ success: true, item: mockItems[0] })
          .mockResolvedValueOnce({ success: true, item: mockItems[1] });

        const result = await importFromIdentifiers(["ISBN:9784000000001", "ISBN:9784000000002"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.every((r) => r.success)).toBe(true);
      });
    });

    describe("mixed identifiers", () => {
      it("should handle mixed PMID and DOI", async () => {
        const pmidItem: CslItem = {
          id: "p1",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };
        const doiItem: CslItem = {
          id: "d1",
          type: "article-journal",
          title: "DOI Article",
          DOI: "10.1000/xyz",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: pmidItem }]);
        mockFetchDoi.mockResolvedValue({ success: true, item: doiItem });

        const result = await importFromIdentifiers(["12345678", "10.1000/xyz"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.every((r) => r.success)).toBe(true);
      });

      it("should handle mixed PMID, DOI, and ISBN", async () => {
        const pmidItem: CslItem = {
          id: "p1",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };
        const doiItem: CslItem = {
          id: "d1",
          type: "article-journal",
          title: "DOI Article",
          DOI: "10.1000/xyz",
        };
        const isbnItem: CslItem = {
          id: "i1",
          type: "book",
          title: "ISBN Book",
          ISBN: "9784000000000",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: pmidItem }]);
        mockFetchDoi.mockResolvedValue({ success: true, item: doiItem });
        mockFetchIsbn.mockResolvedValue({ success: true, item: isbnItem });

        const result = await importFromIdentifiers(
          ["12345678", "10.1000/xyz", "ISBN:9784000000000"],
          { pubmedConfig: {} }
        );

        expect(result.results).toHaveLength(3);
        expect(result.results.every((r) => r.success)).toBe(true);
      });

      it("should handle partial failure", async () => {
        const pmidItem: CslItem = {
          id: "p1",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: pmidItem }]);
        mockFetchDoi.mockResolvedValue({
          success: false,
          error: "DOI not found",
        });

        const result = await importFromIdentifiers(["12345678", "10.9999/bad"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
      });
    });

    describe("invalid identifiers", () => {
      it("should return error for unrecognized identifier", async () => {
        const result = await importFromIdentifiers(["not-a-valid-id"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(false);
        if (!result.results[0].success) {
          expect(result.results[0].error).toContain("Cannot interpret");
        }
      });

      it("should handle empty input", async () => {
        const result = await importFromIdentifiers([], { pubmedConfig: {} });

        expect(result.results).toHaveLength(0);
      });
    });

    describe("PMID prefix support", () => {
      it("should fetch PMID with PMID: prefix", async () => {
        const mockItem: CslItem = {
          id: "pmid_12345678",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

        const result = await importFromIdentifiers(["PMID:12345678"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        // fetchPmids should be called with normalized PMID (without prefix)
        expect(mockFetchPmids).toHaveBeenCalledWith(["12345678"], {});
      });

      it("should fetch PMID with pmid: prefix (lowercase)", async () => {
        const mockItem: CslItem = {
          id: "pmid_12345678",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

        const result = await importFromIdentifiers(["pmid:12345678"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        expect(mockFetchPmids).toHaveBeenCalledWith(["12345678"], {});
      });

      it("should fetch PMID with PMID: prefix and space after colon", async () => {
        const mockItem: CslItem = {
          id: "pmid_12345678",
          type: "article-journal",
          title: "PMID Article",
          PMID: "12345678",
        };

        mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

        const result = await importFromIdentifiers(["PMID: 12345678"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(1);
        expect(result.results[0].success).toBe(true);
        expect(mockFetchPmids).toHaveBeenCalledWith(["12345678"], {});
      });

      it("should handle mixed prefixed and non-prefixed PMIDs", async () => {
        const mockItems: CslItem[] = [
          { id: "p1", type: "article-journal", title: "First", PMID: "111" },
          { id: "p2", type: "article-journal", title: "Second", PMID: "222" },
        ];

        mockFetchPmids.mockResolvedValue([
          { pmid: "111", success: true, item: mockItems[0] },
          { pmid: "222", success: true, item: mockItems[1] },
        ]);

        const result = await importFromIdentifiers(["PMID:111", "222"], {
          pubmedConfig: {},
        });

        expect(result.results).toHaveLength(2);
        expect(result.results.every((r) => r.success)).toBe(true);
        // Both should be normalized to just the number
        expect(mockFetchPmids).toHaveBeenCalledWith(["111", "222"], {});
      });
    });
  });
});
