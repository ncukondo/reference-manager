/**
 * Tests for importFromInputs() - unified entry point for imports
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/types.js";

// Mock fs module
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock the fetcher module
vi.mock("./fetcher.js", () => ({
  fetchPmids: vi.fn(),
  fetchDoi: vi.fn(),
}));

// Mock the cache module
vi.mock("./cache.js", () => ({
  getPmidFromCache: vi.fn(),
  getDoiFromCache: vi.fn(),
  cachePmidResult: vi.fn(),
  cacheDoiResult: vi.fn(),
  resetCache: vi.fn(),
}));

import { existsSync, readFileSync } from "node:fs";
import { getDoiFromCache, getPmidFromCache } from "./cache.js";
import { fetchDoi, fetchPmids } from "./fetcher.js";
import { importFromInputs } from "./importer.js";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockFetchPmids = vi.mocked(fetchPmids);
const mockFetchDoi = vi.mocked(fetchDoi);
const mockGetPmidFromCache = vi.mocked(getPmidFromCache);
const mockGetDoiFromCache = vi.mocked(getDoiFromCache);

describe("importFromInputs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPmidFromCache.mockReturnValue(null);
    mockGetDoiFromCache.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("file inputs", () => {
    it("should import from existing JSON file", async () => {
      const jsonContent = JSON.stringify([
        { id: "test1", type: "article-journal", title: "Test Article" },
      ]);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(jsonContent);

      const result = await importFromInputs(["/path/to/file.json"], {});

      expect(mockExistsSync).toHaveBeenCalledWith("/path/to/file.json");
      expect(mockReadFileSync).toHaveBeenCalledWith("/path/to/file.json", "utf-8");
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("Test Article");
      }
    });

    it("should import from existing BibTeX file", async () => {
      const bibtexContent = `@article{smith2024,
  title = {BibTeX Article},
  year = {2024}
}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(bibtexContent);

      const result = await importFromInputs(["/path/to/file.bib"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("BibTeX Article");
      }
    });

    it("should import from existing RIS file", async () => {
      const risContent = `TY  - JOUR
TI  - RIS Article
PY  - 2024
ER  - `;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(risContent);

      const result = await importFromInputs(["/path/to/file.ris"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("RIS Article");
      }
    });

    it("should import from multiple files", async () => {
      const json1 = JSON.stringify([{ id: "t1", type: "article-journal", title: "First" }]);
      const json2 = JSON.stringify([{ id: "t2", type: "book", title: "Second" }]);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValueOnce(json1).mockReturnValueOnce(json2);

      const result = await importFromInputs(["/path/to/a.json", "/path/to/b.json"], {});

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
    });

    it("should detect format by content for unknown extension", async () => {
      const jsonContent = JSON.stringify([
        { id: "test1", type: "article-journal", title: "Unknown Ext" },
      ]);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(jsonContent);

      const result = await importFromInputs(["/path/to/data.txt"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("Unknown Ext");
      }
    });

    it("should use explicit format option", async () => {
      const bibtexContent = `@article{test1,
  title = {Explicit Format},
  year = {2024}
}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(bibtexContent);

      const result = await importFromInputs(["/path/to/data.txt"], { format: "bibtex" });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("Explicit Format");
      }
    });

    it("should handle file read error", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = await importFromInputs(["/path/to/protected.json"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      if (!result.results[0].success) {
        expect(result.results[0].error).toContain("Permission denied");
        expect(result.results[0].source).toBe("/path/to/protected.json");
      }
    });
  });

  describe("identifier inputs", () => {
    it("should import from PMID when file does not exist", async () => {
      const mockItem: CslItem = {
        id: "pmid_12345678",
        type: "article-journal",
        title: "PMID Article",
        PMID: "12345678",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

      const result = await importFromInputs(["12345678"], { pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.PMID).toBe("12345678");
      }
    });

    it("should import from DOI when file does not exist", async () => {
      const mockItem: CslItem = {
        id: "doi_10.1000/xyz",
        type: "article-journal",
        title: "DOI Article",
        DOI: "10.1000/xyz",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchDoi.mockResolvedValue({ success: true, item: mockItem });

      const result = await importFromInputs(["10.1000/xyz"], { pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.DOI).toBe("10.1000/xyz");
      }
    });

    it("should import from DOI URL", async () => {
      const mockItem: CslItem = {
        id: "doi_10.1000/xyz",
        type: "article-journal",
        title: "DOI URL Article",
        DOI: "10.1000/xyz",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchDoi.mockResolvedValue({ success: true, item: mockItem });

      const result = await importFromInputs(["https://doi.org/10.1000/xyz"], { pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it("should import multiple identifiers", async () => {
      const pmidItem: CslItem = {
        id: "p1",
        type: "article-journal",
        title: "PMID",
        PMID: "111",
      };
      const doiItem: CslItem = {
        id: "d1",
        type: "article-journal",
        title: "DOI",
        DOI: "10.1000/xyz",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchPmids.mockResolvedValue([{ pmid: "111", success: true, item: pmidItem }]);
      mockFetchDoi.mockResolvedValue({ success: true, item: doiItem });

      const result = await importFromInputs(["111", "10.1000/xyz"], { pubmedConfig: {} });

      expect(result.results).toHaveLength(2);
      expect(result.results.every((r) => r.success)).toBe(true);
    });
  });

  describe("mixed inputs", () => {
    it("should handle both file and identifier inputs", async () => {
      const jsonContent = JSON.stringify([
        { id: "file1", type: "article-journal", title: "File Article" },
      ]);
      const pmidItem: CslItem = {
        id: "p1",
        type: "article-journal",
        title: "PMID Article",
        PMID: "12345678",
      };

      mockExistsSync
        .mockReturnValueOnce(true) // file.json exists
        .mockReturnValueOnce(false); // 12345678 does not exist as file
      mockReadFileSync.mockReturnValue(jsonContent);
      mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: pmidItem }]);

      const result = await importFromInputs(["/path/to/file.json", "12345678"], {
        pubmedConfig: {},
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("File Article");
      }
      if (result.results[1].success) {
        expect(result.results[1].item.PMID).toBe("12345678");
      }
    });

    it("should aggregate results from multiple sources", async () => {
      const jsonContent = JSON.stringify([
        { id: "f1", type: "article-journal", title: "First" },
        { id: "f2", type: "article-journal", title: "Second" },
      ]);
      const doiItem: CslItem = {
        id: "d1",
        type: "article-journal",
        title: "Third",
        DOI: "10.1000/xyz",
      };

      mockExistsSync
        .mockReturnValueOnce(true) // file exists
        .mockReturnValueOnce(false); // DOI not a file
      mockReadFileSync.mockReturnValue(jsonContent);
      mockFetchDoi.mockResolvedValue({ success: true, item: doiItem });

      const result = await importFromInputs(["/path/to/refs.json", "10.1000/xyz"], {
        pubmedConfig: {},
      });

      expect(result.results).toHaveLength(3);
      expect(result.results.filter((r) => r.success)).toHaveLength(3);
    });
  });

  describe("non-existent file as identifier", () => {
    it("should treat non-existent file with file-like extension as error if not valid identifier", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await importFromInputs(["nonexistent.bib"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      if (!result.results[0].success) {
        expect(result.results[0].error).toContain("Cannot interpret");
        expect(result.results[0].source).toBe("nonexistent.bib");
      }
    });

    it("should provide helpful hint for file-like input", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await importFromInputs(["missing.json"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      if (!result.results[0].success) {
        expect(result.results[0].error).toContain("file");
      }
    });
  });

  describe("edge cases", () => {
    it("should return empty results for empty input", async () => {
      const result = await importFromInputs([], {});

      expect(result.results).toHaveLength(0);
    });

    it("should handle input with whitespace-separated identifiers", async () => {
      // Note: importFromInputs receives pre-split inputs,
      // whitespace handling is done at CLI level
      const pmidItem: CslItem = {
        id: "p1",
        type: "article-journal",
        title: "Article",
        PMID: "12345678",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: pmidItem }]);

      const result = await importFromInputs(["12345678"], { pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it("should preserve source information in results", async () => {
      const jsonContent = JSON.stringify([{ id: "test1", type: "article-journal", title: "Test" }]);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(jsonContent);

      const result = await importFromInputs(["/path/to/refs.json"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe("/path/to/refs.json");
    });

    it("should handle partial failures gracefully", async () => {
      const jsonContent = JSON.stringify([{ id: "f1", type: "article-journal", title: "File OK" }]);

      mockExistsSync
        .mockReturnValueOnce(true) // first file exists
        .mockReturnValueOnce(false); // second input not a file
      mockReadFileSync.mockReturnValue(jsonContent);

      // Invalid identifier
      const result = await importFromInputs(["/path/to/ok.json", "invalid-id"], {});

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe("format option behavior", () => {
    it("should default to auto format detection", async () => {
      const jsonContent = JSON.stringify([
        { id: "test1", type: "article-journal", title: "Auto Detect" },
      ]);

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(jsonContent);

      // No format option - should auto-detect
      const result = await importFromInputs(["/path/to/data.json"], {});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it("should respect format option for files", async () => {
      const risContent = `TY  - JOUR
TI  - RIS Content
ER  - `;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(risContent);

      const result = await importFromInputs(["/path/to/data.txt"], { format: "ris" });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      if (result.results[0].success) {
        expect(result.results[0].item.title).toBe("RIS Content");
      }
    });

    it("should use pmid format for identifier-only input", async () => {
      const mockItem: CslItem = {
        id: "p1",
        type: "article-journal",
        title: "PMID Format",
        PMID: "12345678",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchPmids.mockResolvedValue([{ pmid: "12345678", success: true, item: mockItem }]);

      const result = await importFromInputs(["12345678"], { format: "pmid", pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it("should use doi format for identifier-only input", async () => {
      const mockItem: CslItem = {
        id: "d1",
        type: "article-journal",
        title: "DOI Format",
        DOI: "10.1000/xyz",
      };

      mockExistsSync.mockReturnValue(false);
      mockFetchDoi.mockResolvedValue({ success: true, item: mockItem });

      const result = await importFromInputs(["10.1000/xyz"], { format: "doi", pubmedConfig: {} });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });
  });
});
