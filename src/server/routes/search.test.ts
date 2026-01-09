import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "../../core/library.js";
import { createSearchRoute } from "./search.js";

// Mock the search operation to avoid actual library operations
vi.mock("../../features/operations/search.js", () => ({
  searchReferences: vi.fn(),
}));

import { searchReferences } from "../../features/operations/search.js";

const mockSearchReferences = vi.mocked(searchReferences);

describe("Search Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let route: ReturnType<typeof createSearchRoute>;

  beforeEach(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}.json`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create route with library
    route = createSearchRoute(library);

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
    it("should search references with query and return CslItem[]", async () => {
      mockSearchReferences.mockReturnValue({
        items: [{ id: "author-2024", type: "article-journal", title: "Test Article" }],
        total: 1,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "author:Author",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe("author-2024");
    });

    it("should handle empty query", async () => {
      mockSearchReferences.mockReturnValue({
        items: [
          { id: "first", type: "article-journal" },
          { id: "second", type: "book" },
        ],
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(2);
    });

    it("should handle no matches", async () => {
      mockSearchReferences.mockReturnValue({
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "nonexistent",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(0);
    });

    it("should pass pagination options", async () => {
      mockSearchReferences.mockReturnValue({
        items: [],
        total: 0,
        limit: 10,
        offset: 5,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          limit: 10,
          offset: 5,
        }),
      });

      await route.fetch(req);

      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ limit: 10, offset: 5 })
      );
    });

    it("should pass sort options", async () => {
      mockSearchReferences.mockReturnValue({
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          sort: "title",
          order: "asc",
        }),
      });

      await route.fetch(req);

      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ sort: "title", order: "asc" })
      );
    });

    it("should return 400 for missing query", async () => {
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

    it("should return 400 for non-string query", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: 123 }),
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
      expect(data.error).toBe("Invalid JSON");
    });

    it("should return 400 for non-object body", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("just a string"),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should handle complex queries", async () => {
      mockSearchReferences.mockReturnValue({
        items: [
          { id: "match1", type: "article-journal" },
          { id: "match2", type: "article-journal" },
        ],
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "author:Smith year:2024",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ query: "author:Smith year:2024" })
      );
    });
  });
});
