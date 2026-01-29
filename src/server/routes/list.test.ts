import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "../../core/library.js";
import { createListRoute } from "./list.js";

// Mock the list operation to avoid actual library operations
vi.mock("../../features/operations/list.js", () => ({
  listReferences: vi.fn(),
}));

import { listReferences } from "../../features/operations/list.js";

const mockListReferences = vi.mocked(listReferences);

describe("List Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let route: ReturnType<typeof createListRoute>;

  beforeEach(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}-${crypto.randomUUID()}.json`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create route with library
    route = createListRoute(library);

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
    it("should list all references and return CslItem[]", async () => {
      mockListReferences.mockReturnValue({
        items: [{ id: "author-2024", type: "article-journal", title: "Test Article" }],
        total: 1,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(1);
      expect(data.items[0].id).toBe("author-2024");
    });

    it("should handle empty library", async () => {
      mockListReferences.mockReturnValue({
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(0);
    });

    it("should pass sort options", async () => {
      mockListReferences.mockReturnValue({
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
          sort: "title",
          order: "asc",
        }),
      });

      await route.fetch(req);

      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ sort: "title", order: "asc" })
      );
    });

    it("should pass pagination options", async () => {
      mockListReferences.mockReturnValue({
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
          limit: 10,
          offset: 5,
        }),
      });

      await route.fetch(req);

      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ limit: 10, offset: 5 })
      );
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
      expect(data.error).toContain("object");
    });

    it("should handle multiple references", async () => {
      mockListReferences.mockReturnValue({
        items: [
          { id: "first", type: "article-journal" },
          { id: "second", type: "article-journal" },
          { id: "third", type: "book" },
        ],
        total: 3,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items).toHaveLength(3);
    });

    it("should work with empty body", async () => {
      mockListReferences.mockReturnValue({
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockListReferences).toHaveBeenCalledWith(library, {});
    });
  });
});
