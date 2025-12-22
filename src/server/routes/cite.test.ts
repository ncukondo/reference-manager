import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "../../core/library.js";
import { createCiteRoute } from "./cite.js";

// Mock the cite operation to avoid actual citation generation
vi.mock("../../features/operations/cite.js", () => ({
  citeReferences: vi.fn(),
}));

import { citeReferences } from "../../features/operations/cite.js";

const mockCiteReferences = vi.mocked(citeReferences);

describe("Cite Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let route: ReturnType<typeof createCiteRoute>;

  beforeEach(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}.json`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create route with library
    route = createCiteRoute(library);

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
    it("should generate citations for identifiers", async () => {
      // Mock successful citation generation
      mockCiteReferences.mockResolvedValue({
        results: [
          {
            success: true,
            identifier: "author2024",
            citation: "Author, T. (2024). Test Article. Journal of Testing, 1(1), 1-10.",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["author2024"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].success).toBe(true);
      expect(data.results[0].identifier).toBe("author2024");
      expect(data.results[0].citation).toContain("Author");
    });

    it("should handle multiple identifiers", async () => {
      mockCiteReferences.mockResolvedValue({
        results: [
          {
            success: true,
            identifier: "first2024",
            citation: "First, A. (2024). First Article.",
          },
          {
            success: true,
            identifier: "second2024",
            citation: "Second, B. (2024). Second Article.",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["first2024", "second2024"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(2);
    });

    it("should handle not found identifiers", async () => {
      mockCiteReferences.mockResolvedValue({
        results: [
          {
            success: false,
            identifier: "notfound2024",
            error: "Reference not found: notfound2024",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["notfound2024"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].success).toBe(false);
      expect(data.results[0].error).toContain("not found");
    });

    it("should pass byUuid option", async () => {
      mockCiteReferences.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["some-uuid"],
          byUuid: true,
        }),
      });

      await route.fetch(req);

      expect(mockCiteReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ byUuid: true })
      );
    });

    it("should pass inText option", async () => {
      mockCiteReferences.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["author2024"],
          inText: true,
        }),
      });

      await route.fetch(req);

      expect(mockCiteReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ inText: true })
      );
    });

    it("should pass style option", async () => {
      mockCiteReferences.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["author2024"],
          style: "chicago",
        }),
      });

      await route.fetch(req);

      expect(mockCiteReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ style: "chicago" })
      );
    });

    it("should pass locale option", async () => {
      mockCiteReferences.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["author2024"],
          locale: "ja-JP",
        }),
      });

      await route.fetch(req);

      expect(mockCiteReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ locale: "ja-JP" })
      );
    });

    it("should pass format option", async () => {
      mockCiteReferences.mockResolvedValue({ results: [] });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["author2024"],
          format: "html",
        }),
      });

      await route.fetch(req);

      expect(mockCiteReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ format: "html" })
      );
    });

    it("should return 400 for missing identifiers", async () => {
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

    it("should return 400 for empty identifiers array", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: [] }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 for non-string identifiers", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: [123, "valid"] }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("string");
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

    it("should handle partial success", async () => {
      mockCiteReferences.mockResolvedValue({
        results: [
          {
            success: true,
            identifier: "found2024",
            citation: "Found, A. (2024). Found Article.",
          },
          {
            success: false,
            identifier: "notfound2024",
            error: "Reference not found",
          },
        ],
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifiers: ["found2024", "notfound2024"],
        }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(true);
      expect(data.results[1].success).toBe(false);
    });
  });
});
