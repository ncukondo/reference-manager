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
    it("should search references with query", async () => {
      mockSearchReferences.mockReturnValue({
        items: ["Author, T. (2024). Test Article. Journal, 1(1), 1-10."],
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
      expect(data.items[0]).toContain("Author");
    });

    it("should handle empty query", async () => {
      mockSearchReferences.mockReturnValue({
        items: ["First", "Second"],
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

    it("should pass format option", async () => {
      mockSearchReferences.mockReturnValue({ items: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          format: "json",
        }),
      });

      await route.fetch(req);

      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "json" })
      );
    });

    it("should pass bibtex format option", async () => {
      mockSearchReferences.mockReturnValue({ items: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          format: "bibtex",
        }),
      });

      await route.fetch(req);

      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "bibtex" })
      );
    });

    it("should pass ids-only format option", async () => {
      mockSearchReferences.mockReturnValue({ items: ["author2024"] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          format: "ids-only",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "ids-only" })
      );
    });

    it("should pass uuid format option", async () => {
      mockSearchReferences.mockReturnValue({
        items: ["550e8400-e29b-41d4-a716-446655440000"],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          format: "uuid",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockSearchReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "uuid" })
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
        items: ["Match 1", "Match 2"],
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
