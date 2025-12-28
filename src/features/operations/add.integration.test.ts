/**
 * Integration tests for add command
 * Tests actual file I/O and library operations with real files
 * Network calls (PMID/DOI fetch) are mocked
 */
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "../../core/library.js";
import { addReferences } from "./add.js";

// Mock only the fetcher to avoid network calls
vi.mock("../import/fetcher.js", () => ({
  fetchPmids: vi.fn(),
  fetchDoi: vi.fn(),
}));

// Mock cache to avoid state leakage between tests
vi.mock("../import/cache.js", () => ({
  getPmidFromCache: vi.fn(() => null),
  getDoiFromCache: vi.fn(() => null),
  cachePmidResult: vi.fn(),
  cacheDoiResult: vi.fn(),
  resetCache: vi.fn(),
}));

import { fetchDoi, fetchPmids } from "../import/fetcher.js";

const mockFetchPmids = vi.mocked(fetchPmids);
const mockFetchDoi = vi.mocked(fetchDoi);

describe("Add Integration Tests", () => {
  let testDir: string;
  let libraryPath: string;
  let library: Library;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `add-integration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create empty library
    libraryPath = path.join(testDir, "library.json");
    await fs.writeFile(libraryPath, "[]", "utf-8");
    library = await Library.load(libraryPath);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("End-to-end file import", () => {
    describe("JSON files", () => {
      it("should import single reference from JSON file", async () => {
        const jsonPath = path.join(testDir, "refs.json");
        await fs.writeFile(
          jsonPath,
          JSON.stringify([
            {
              id: "smith2024",
              type: "article-journal",
              title: "Test Article",
              author: [{ family: "Smith", given: "John" }],
              issued: { "date-parts": [[2024]] },
            },
          ]),
          "utf-8"
        );

        const result = await addReferences([jsonPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].id).toBe("smith2024");
        expect(result.added[0].title).toBe("Test Article");
        expect(result.failed).toHaveLength(0);
        expect(result.skipped).toHaveLength(0);

        // Verify library persistence
        const reloadedLibrary = await Library.load(libraryPath);
        expect(await reloadedLibrary.getAll()).toHaveLength(1);
      });

      it("should import multiple references from JSON file", async () => {
        const jsonPath = path.join(testDir, "multi.json");
        await fs.writeFile(
          jsonPath,
          JSON.stringify([
            { id: "ref1", type: "article-journal", title: "First Article" },
            { id: "ref2", type: "book", title: "Second Book" },
            { id: "ref3", type: "article-journal", title: "Third Article" },
          ]),
          "utf-8"
        );

        const result = await addReferences([jsonPath], library, {});

        expect(result.added).toHaveLength(3);
        expect(result.added.map((r) => r.id)).toEqual(["ref1", "ref2", "ref3"]);

        // Verify persistence
        const reloadedLibrary = await Library.load(libraryPath);
        expect(await reloadedLibrary.getAll()).toHaveLength(3);
      });

      it("should import from multiple JSON files", async () => {
        const file1 = path.join(testDir, "file1.json");
        const file2 = path.join(testDir, "file2.json");

        await fs.writeFile(
          file1,
          JSON.stringify([{ id: "from1", type: "article-journal", title: "From File 1" }]),
          "utf-8"
        );
        await fs.writeFile(
          file2,
          JSON.stringify([{ id: "from2", type: "book", title: "From File 2" }]),
          "utf-8"
        );

        const result = await addReferences([file1, file2], library, {});

        expect(result.added).toHaveLength(2);
        expect(result.added.map((r) => r.id)).toContain("from1");
        expect(result.added.map((r) => r.id)).toContain("from2");
      });
    });

    describe("BibTeX files", () => {
      it("should import from BibTeX file", async () => {
        const bibPath = path.join(testDir, "refs.bib");
        await fs.writeFile(
          bibPath,
          `@article{jones2024,
  author = {Jones, Alice},
  title = {BibTeX Import Test},
  journal = {Test Journal},
  year = {2024}
}`,
          "utf-8"
        );

        const result = await addReferences([bibPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("BibTeX Import Test");
        expect(result.failed).toHaveLength(0);
      });

      it("should import multiple entries from BibTeX file", async () => {
        const bibPath = path.join(testDir, "multi.bib");
        await fs.writeFile(
          bibPath,
          `@article{art1,
  title = {First Article},
  year = {2024}
}

@book{book1,
  title = {First Book},
  year = {2023}
}`,
          "utf-8"
        );

        const result = await addReferences([bibPath], library, {});

        expect(result.added).toHaveLength(2);
        expect(result.added.map((r) => r.title)).toContain("First Article");
        expect(result.added.map((r) => r.title)).toContain("First Book");
      });
    });

    describe("RIS files", () => {
      it("should import from RIS file", async () => {
        const risPath = path.join(testDir, "refs.ris");
        await fs.writeFile(
          risPath,
          `TY  - JOUR
TI  - RIS Import Test
AU  - Brown, Bob
PY  - 2024
ER  - `,
          "utf-8"
        );

        const result = await addReferences([risPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("RIS Import Test");
        expect(result.failed).toHaveLength(0);
      });

      it("should import multiple entries from RIS file", async () => {
        const risPath = path.join(testDir, "multi.ris");
        await fs.writeFile(
          risPath,
          `TY  - JOUR
TI  - First RIS Article
PY  - 2024
ER  -

TY  - BOOK
TI  - First RIS Book
PY  - 2023
ER  - `,
          "utf-8"
        );

        const result = await addReferences([risPath], library, {});

        expect(result.added).toHaveLength(2);
        expect(result.added.map((r) => r.title)).toContain("First RIS Article");
        expect(result.added.map((r) => r.title)).toContain("First RIS Book");
      });
    });

    describe("format detection by content", () => {
      it("should detect JSON format from content", async () => {
        const txtPath = path.join(testDir, "data.txt");
        await fs.writeFile(
          txtPath,
          JSON.stringify([{ id: "detected", type: "article-journal", title: "Detected JSON" }]),
          "utf-8"
        );

        const result = await addReferences([txtPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("Detected JSON");
      });

      it("should detect BibTeX format from content", async () => {
        const txtPath = path.join(testDir, "data.txt");
        await fs.writeFile(
          txtPath,
          `@article{bibtex2024,
  title = {Detected BibTeX},
  year = {2024}
}`,
          "utf-8"
        );

        const result = await addReferences([txtPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("Detected BibTeX");
      });

      it("should detect RIS format from content", async () => {
        const txtPath = path.join(testDir, "data.txt");
        await fs.writeFile(
          txtPath,
          `TY  - JOUR
TI  - Detected RIS
PY  - 2024
ER  - `,
          "utf-8"
        );

        const result = await addReferences([txtPath], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("Detected RIS");
      });
    });

    describe("explicit format option", () => {
      it("should use explicit bibtex format", async () => {
        const txtPath = path.join(testDir, "data.txt");
        await fs.writeFile(
          txtPath,
          `@article{explicit2024,
  title = {Explicit Format},
  year = {2024}
}`,
          "utf-8"
        );

        const result = await addReferences([txtPath], library, { format: "bibtex" });

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("Explicit Format");
      });
    });
  });

  describe("End-to-end identifier import", () => {
    describe("PMID import", () => {
      it("should import from single PMID", async () => {
        mockFetchPmids.mockResolvedValue([
          {
            pmid: "12345678",
            success: true,
            item: {
              id: "author2024",
              type: "article-journal",
              title: "PMID Article",
              PMID: "12345678",
            },
          },
        ]);

        const result = await addReferences(["12345678"], library, { pubmedConfig: {} });

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("PMID Article");
        expect(mockFetchPmids).toHaveBeenCalledWith(["12345678"], expect.any(Object));
      });

      it("should import from multiple PMIDs", async () => {
        mockFetchPmids.mockResolvedValue([
          {
            pmid: "11111111",
            success: true,
            item: { id: "first", type: "article-journal", title: "First" },
          },
          {
            pmid: "22222222",
            success: true,
            item: { id: "second", type: "article-journal", title: "Second" },
          },
        ]);

        const result = await addReferences(["11111111", "22222222"], library, { pubmedConfig: {} });

        expect(result.added).toHaveLength(2);
      });
    });

    describe("DOI import", () => {
      it("should import from DOI", async () => {
        mockFetchDoi.mockResolvedValue({
          success: true,
          item: {
            id: "doi2024",
            type: "article-journal",
            title: "DOI Article",
            DOI: "10.1000/test",
          },
        });

        const result = await addReferences(["10.1000/test"], library, {});

        expect(result.added).toHaveLength(1);
        expect(result.added[0].title).toBe("DOI Article");
      });

      it("should import from DOI URL format", async () => {
        mockFetchDoi.mockResolvedValue({
          success: true,
          item: {
            id: "doiurl2024",
            type: "article-journal",
            title: "DOI URL Article",
            DOI: "10.1000/xyz",
          },
        });

        const result = await addReferences(["https://doi.org/10.1000/xyz"], library, {});

        expect(result.added).toHaveLength(1);
        expect(mockFetchDoi).toHaveBeenCalledWith("10.1000/xyz");
      });
    });
  });

  describe("Mixed input types", () => {
    it("should handle file and identifier inputs together", async () => {
      // Create file
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([{ id: "fromfile", type: "article-journal", title: "From File" }]),
        "utf-8"
      );

      // Mock PMID fetch
      mockFetchPmids.mockResolvedValue([
        {
          pmid: "12345678",
          success: true,
          item: { id: "frompmid", type: "article-journal", title: "From PMID" },
        },
      ]);

      const result = await addReferences([jsonPath, "12345678"], library, { pubmedConfig: {} });

      expect(result.added).toHaveLength(2);
      expect(result.added.map((r) => r.title)).toContain("From File");
      expect(result.added.map((r) => r.title)).toContain("From PMID");
    });

    it("should handle multiple file formats and identifiers", async () => {
      // Create JSON file
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([{ id: "json1", type: "article-journal", title: "JSON Article" }]),
        "utf-8"
      );

      // Create BibTeX file
      const bibPath = path.join(testDir, "refs.bib");
      await fs.writeFile(
        bibPath,
        `@article{bib1,
  title = {BibTeX Article},
  year = {2024}
}`,
        "utf-8"
      );

      // Mock DOI fetch
      mockFetchDoi.mockResolvedValue({
        success: true,
        item: { id: "doi1", type: "article-journal", title: "DOI Article" },
      });

      const result = await addReferences([jsonPath, bibPath, "10.1000/test"], library, {});

      expect(result.added).toHaveLength(3);
      expect(result.added.map((r) => r.title)).toContain("JSON Article");
      expect(result.added.map((r) => r.title)).toContain("BibTeX Article");
      expect(result.added.map((r) => r.title)).toContain("DOI Article");
    });
  });

  describe("Error cases", () => {
    it("should handle non-existent file with file-like extension", async () => {
      const result = await addReferences([path.join(testDir, "nonexistent.json")], library, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain("Cannot interpret");
    });

    it("should handle invalid identifier", async () => {
      const result = await addReferences(["not-a-valid-id"], library, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
    });

    it("should handle PMID fetch failure", async () => {
      mockFetchPmids.mockResolvedValue([
        {
          pmid: "99999999",
          success: false,
          error: "Not found",
        },
      ]);

      const result = await addReferences(["99999999"], library, { pubmedConfig: {} });

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].source).toBe("99999999");
      expect(result.failed[0].error).toBe("Not found");
    });

    it("should handle DOI fetch failure", async () => {
      mockFetchDoi.mockResolvedValue({
        success: false,
        error: "DOI not found",
      });

      const result = await addReferences(["10.1000/invalid"], library, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe("DOI not found");
    });

    it("should handle empty JSON file", async () => {
      const jsonPath = path.join(testDir, "empty.json");
      await fs.writeFile(jsonPath, "[]", "utf-8");

      const result = await addReferences([jsonPath], library, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });

    it("should handle malformed JSON file", async () => {
      const jsonPath = path.join(testDir, "malformed.json");
      await fs.writeFile(jsonPath, "{ invalid json }", "utf-8");

      const result = await addReferences([jsonPath], library, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain("parse");
    });

    it("should handle partial success (some succeed, some fail)", async () => {
      // Create valid JSON file
      const jsonPath = path.join(testDir, "valid.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([{ id: "valid", type: "article-journal", title: "Valid" }]),
        "utf-8"
      );

      // Mock PMID failure
      mockFetchPmids.mockResolvedValue([
        {
          pmid: "99999999",
          success: false,
          error: "Not found",
        },
      ]);

      const result = await addReferences([jsonPath, "99999999"], library, { pubmedConfig: {} });

      expect(result.added).toHaveLength(1);
      expect(result.added[0].title).toBe("Valid");
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].source).toBe("99999999");
    });
  });

  describe("Duplicate detection", () => {
    it("should skip duplicates when force is false", async () => {
      // Add existing reference
      await library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        DOI: "10.1000/existing",
      });
      await library.save();

      // Try to add reference with same DOI
      const jsonPath = path.join(testDir, "dup.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "new2024",
            type: "article-journal",
            title: "New Article",
            DOI: "10.1000/existing",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], library, { force: false });

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].existingId).toBe("existing2024");
    });

    it("should add duplicates when force is true", async () => {
      // Add existing reference
      await library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        DOI: "10.1000/existing",
      });
      await library.save();

      // Try to add reference with same DOI
      const jsonPath = path.join(testDir, "dup.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "new2024",
            type: "article-journal",
            title: "New Article",
            DOI: "10.1000/existing",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], library, { force: true });

      expect(result.added).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });

    it("should skip ISBN duplicates for book type", async () => {
      // Add existing book
      await library.add({
        id: "book2024",
        type: "book",
        title: "Existing Book",
        ISBN: "9784000000000",
      });
      await library.save();

      // Try to add book with same ISBN
      const jsonPath = path.join(testDir, "dup-book.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "newbook2024",
            type: "book",
            title: "Different Title Same ISBN",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], library, { force: false });

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].existingId).toBe("book2024");
    });

    it("should allow different chapters with same ISBN", async () => {
      // Add first chapter
      await library.add({
        id: "chapter1",
        type: "chapter",
        title: "Chapter 1: Introduction",
        ISBN: "9784000000000",
      });
      await library.save();

      // Add different chapter from same book
      const jsonPath = path.join(testDir, "chapter2.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "chapter2",
            type: "chapter",
            title: "Chapter 2: Advanced Topics",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], library, { force: false });

      expect(result.added).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });

    it("should detect ISBN duplicate after library reload", async () => {
      // Add first book
      await library.add({
        id: "book2024",
        type: "book",
        title: "Existing Book",
        ISBN: "9784000000001",
      });
      await library.save();

      // Reload library from file (simulating CLI restart)
      const { Library } = await import("../../core/library.js");
      const reloadedLibrary = await Library.load(libraryPath);

      // Verify ISBN is preserved after reload
      const items = await reloadedLibrary.getAll();
      expect(items[0].ISBN).toBe("9784000000001");

      // Try to add book with same ISBN
      const jsonPath = path.join(testDir, "dup-book-reload.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "newbook2024",
            type: "book",
            title: "Different Title Same ISBN",
            ISBN: "9784000000001",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], reloadedLibrary, { force: false });

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].existingId).toBe("book2024");
    });
  });

  describe("ID collision resolution", () => {
    it("should resolve ID collision by appending suffix", async () => {
      // Add existing reference
      await library.add({
        id: "smith2024",
        type: "article-journal",
        title: "First Smith",
        DOI: "10.1000/first",
      });
      await library.save();

      // Add new reference with same ID but different content
      const jsonPath = path.join(testDir, "collision.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "smith2024",
            type: "article-journal",
            title: "Second Smith",
            DOI: "10.1000/second",
          },
        ]),
        "utf-8"
      );

      const result = await addReferences([jsonPath], library, {});

      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe("smith2024a");
      expect(result.added[0].idChanged).toBe(true);
      expect(result.added[0].originalId).toBe("smith2024");
    });
  });

  describe("Library persistence", () => {
    it("should persist changes to library file", async () => {
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          { id: "persist1", type: "article-journal", title: "Persist Test 1" },
          { id: "persist2", type: "book", title: "Persist Test 2" },
        ]),
        "utf-8"
      );

      await addReferences([jsonPath], library, {});

      // Reload library from file
      const reloadedLibrary = await Library.load(libraryPath);
      const items = await reloadedLibrary.getAll();

      expect(items).toHaveLength(2);
      expect(items.map((item) => item.title)).toContain("Persist Test 1");
      expect(items.map((item) => item.title)).toContain("Persist Test 2");
    });

    it("should not save when nothing was added", async () => {
      mockFetchPmids.mockResolvedValue([
        {
          pmid: "99999999",
          success: false,
          error: "Not found",
        },
      ]);

      // Get file modification time before
      const statBefore = await fs.stat(libraryPath);

      // Small delay to ensure different mtime if file is modified
      await new Promise((resolve) => setTimeout(resolve, 10));

      await addReferences(["99999999"], library, { pubmedConfig: {} });

      // Get file modification time after
      const statAfter = await fs.stat(libraryPath);

      // File should not have been modified
      expect(statAfter.mtimeMs).toBe(statBefore.mtimeMs);
    });
  });
});
