import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import { createAddRoute } from "./add.js";

// Mock the importer to avoid network calls
vi.mock("../../features/import/importer.js", () => ({
  importFromInputs: vi.fn(),
}));

import { importFromInputs } from "../../features/import/importer.js";

const mockImportFromInputs = vi.mocked(importFromInputs);

describe("Add Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let config: Config;
  let route: ReturnType<typeof createAddRoute>;

  beforeEach(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}.json`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create minimal config
    config = {
      library: testLibraryPath,
      logLevel: "info",
      backup: { enabled: true, maxBackups: 5 },
      watch: { enabled: false, debounceMs: 1000 },
      server: { host: "127.0.0.1", port: 0 },
      citation: { style: "apa", locale: "en-US", format: "text" },
      pubmed: {},
    };

    // Create route with library and config
    route = createAddRoute(library, config);

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test library
    try {
      await fs.unlink(testLibraryPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("POST /", () => {
    it("should add references from identifiers", async () => {
      // Mock successful import
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/test",
            success: true,
            item: {
              id: "author2024",
              type: "article-journal",
              title: "Test Article",
              author: [{ family: "Author", given: "Test" }],
              DOI: "10.1000/test",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/test"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(1);
      expect(data.added[0].id).toBe("author2024");
      expect(data.added[0].title).toBe("Test Article");
      expect(data.failed).toHaveLength(0);
      expect(data.skipped).toHaveLength(0);
    });

    it("should return failed items when import fails", async () => {
      // Mock failed import
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "99999999",
            success: false,
            error: "Not found",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["99999999"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(0);
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].source).toBe("99999999");
      expect(data.failed[0].error).toBe("Not found");
    });

    it("should skip duplicates when force is false", async () => {
      // Add existing reference
      library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        author: [{ family: "Author", given: "Test" }],
        DOI: "10.1000/existing",
      });

      // Mock import returning the same reference
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/existing",
            success: true,
            item: {
              id: "existing2024",
              type: "article-journal",
              title: "Existing Article",
              author: [{ family: "Author", given: "Test" }],
              DOI: "10.1000/existing",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/existing"],
          options: { force: false },
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(0);
      expect(data.skipped).toHaveLength(1);
      expect(data.skipped[0].source).toBe("10.1000/existing");
    });

    it("should add duplicates when force is true", async () => {
      // Add existing reference
      library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        author: [{ family: "Author", given: "Test" }],
        DOI: "10.1000/existing",
      });

      // Mock import returning the same reference
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/existing",
            success: true,
            item: {
              id: "newid2024",
              type: "article-journal",
              title: "Existing Article",
              author: [{ family: "Author", given: "Test" }],
              DOI: "10.1000/existing",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/existing"],
          options: { force: true },
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(1);
      expect(data.skipped).toHaveLength(0);
    });

    it("should pass format option to importer", async () => {
      mockImportFromInputs.mockResolvedValue({
        results: [],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["some-content"],
          options: { format: "bibtex" },
        }),
      });

      await route.fetch(req);

      expect(mockImportFromInputs).toHaveBeenCalledWith(
        ["some-content"],
        expect.objectContaining({ format: "bibtex" })
      );
    });

    it("should return 400 for missing inputs", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 for empty inputs array", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: [] }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should handle multiple inputs with all success", async () => {
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/first",
            success: true,
            item: {
              id: "first2024",
              type: "article-journal",
              title: "First Article",
              author: [{ family: "First", given: "Author" }],
            },
          },
          {
            source: "10.1000/second",
            success: true,
            item: {
              id: "second2024",
              type: "article-journal",
              title: "Second Article",
              author: [{ family: "Second", given: "Author" }],
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/first", "10.1000/second"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(2);
      expect(data.failed).toHaveLength(0);
      expect(data.skipped).toHaveLength(0);
    });

    it("should handle partial success with some failures", async () => {
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/success",
            success: true,
            item: {
              id: "success2024",
              type: "article-journal",
              title: "Success Article",
              author: [{ family: "Author", given: "Test" }],
            },
          },
          {
            source: "99999999",
            success: false,
            error: "Not found",
          },
          {
            source: "10.1000/another",
            success: true,
            item: {
              id: "another2024",
              type: "article-journal",
              title: "Another Article",
              author: [{ family: "Another", given: "Author" }],
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/success", "99999999", "10.1000/another"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(2);
      expect(data.added[0].id).toBe("success2024");
      expect(data.added[1].id).toBe("another2024");
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].source).toBe("99999999");
      expect(data.failed[0].error).toBe("Not found");
      expect(data.skipped).toHaveLength(0);
    });

    it("should handle partial success with some skipped (duplicates)", async () => {
      // Add existing reference
      library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        author: [{ family: "Existing", given: "Author" }],
        DOI: "10.1000/existing",
      });

      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/new",
            success: true,
            item: {
              id: "new2024",
              type: "article-journal",
              title: "New Article",
              author: [{ family: "New", given: "Author" }],
            },
          },
          {
            source: "10.1000/existing",
            success: true,
            item: {
              id: "existing2024",
              type: "article-journal",
              title: "Existing Article",
              author: [{ family: "Existing", given: "Author" }],
              DOI: "10.1000/existing",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/new", "10.1000/existing"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(1);
      expect(data.added[0].id).toBe("new2024");
      expect(data.failed).toHaveLength(0);
      expect(data.skipped).toHaveLength(1);
      expect(data.skipped[0].source).toBe("10.1000/existing");
      expect(data.skipped[0].existingId).toBe("existing2024");
    });

    it("should handle mixed results: added, failed, and skipped", async () => {
      // Add existing reference
      library.add({
        id: "existing2024",
        type: "article-journal",
        title: "Existing Article",
        author: [{ family: "Existing", given: "Author" }],
        DOI: "10.1000/existing",
      });

      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/new",
            success: true,
            item: {
              id: "new2024",
              type: "article-journal",
              title: "New Article",
              author: [{ family: "New", given: "Author" }],
            },
          },
          {
            source: "99999999",
            success: false,
            error: "PMID not found",
          },
          {
            source: "10.1000/existing",
            success: true,
            item: {
              id: "existing2024",
              type: "article-journal",
              title: "Existing Article",
              author: [{ family: "Existing", given: "Author" }],
              DOI: "10.1000/existing",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/new", "99999999", "10.1000/existing"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(1);
      expect(data.added[0].id).toBe("new2024");
      expect(data.failed).toHaveLength(1);
      expect(data.failed[0].source).toBe("99999999");
      expect(data.skipped).toHaveLength(1);
      expect(data.skipped[0].source).toBe("10.1000/existing");
    });

    it("should return 200 with empty added when all fail", async () => {
      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "99999999",
            success: false,
            error: "Not found",
          },
          {
            source: "88888888",
            success: false,
            error: "Network error",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["99999999", "88888888"],
        }),
      });

      const res = await route.fetch(req);

      // Still 200 because the request was processed successfully
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(0);
      expect(data.failed).toHaveLength(2);
      expect(data.skipped).toHaveLength(0);
    });

    it("should return 200 with empty added when all skipped", async () => {
      // Add existing references
      library.add({
        id: "first2024",
        type: "article-journal",
        title: "First Article",
        author: [{ family: "First", given: "Author" }],
        DOI: "10.1000/first",
      });
      library.add({
        id: "second2024",
        type: "article-journal",
        title: "Second Article",
        author: [{ family: "Second", given: "Author" }],
        DOI: "10.1000/second",
      });

      mockImportFromInputs.mockResolvedValue({
        results: [
          {
            source: "10.1000/first",
            success: true,
            item: {
              id: "first2024",
              type: "article-journal",
              title: "First Article",
              author: [{ family: "First", given: "Author" }],
              DOI: "10.1000/first",
            },
          },
          {
            source: "10.1000/second",
            success: true,
            item: {
              id: "second2024",
              type: "article-journal",
              title: "Second Article",
              author: [{ family: "Second", given: "Author" }],
              DOI: "10.1000/second",
            },
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: ["10.1000/first", "10.1000/second"],
        }),
      });

      const res = await route.fetch(req);

      // Still 200 because the request was processed successfully
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.added).toHaveLength(0);
      expect(data.failed).toHaveLength(0);
      expect(data.skipped).toHaveLength(2);
    });
  });
});
