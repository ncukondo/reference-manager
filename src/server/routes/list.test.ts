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
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}.json`);

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
    it("should list all references with default format", async () => {
      mockListReferences.mockReturnValue({
        items: ["Author, T. (2024). Test Article. Journal, 1(1), 1-10."],
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
      expect(data.items[0]).toContain("Author");
    });

    it("should handle empty library", async () => {
      mockListReferences.mockReturnValue({
        items: [],
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

    it("should pass format option", async () => {
      mockListReferences.mockReturnValue({ items: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
        }),
      });

      await route.fetch(req);

      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "json" })
      );
    });

    it("should pass bibtex format option", async () => {
      mockListReferences.mockReturnValue({ items: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "bibtex",
        }),
      });

      await route.fetch(req);

      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "bibtex" })
      );
    });

    it("should pass ids-only format option", async () => {
      mockListReferences.mockReturnValue({ items: ["author2024"] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "ids-only",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "ids-only" })
      );
    });

    it("should pass uuid format option", async () => {
      mockListReferences.mockReturnValue({
        items: ["550e8400-e29b-41d4-a716-446655440000"],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "uuid",
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockListReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "uuid" })
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
          "First, A. (2024). First Article.",
          "Second, B. (2024). Second Article.",
          "Third, C. (2024). Third Article.",
        ],
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
      mockListReferences.mockReturnValue({ items: [] });

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
