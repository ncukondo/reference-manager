import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Library } from "../../core/library.js";
import { createCheckRoute } from "./check.js";

// Mock the check operation
vi.mock("../../features/operations/check.js", () => ({
  checkReferences: vi.fn(),
}));

import { checkReferences } from "../../features/operations/check.js";

const mockCheckReferences = vi.mocked(checkReferences);

describe("Check Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let route: ReturnType<typeof createCheckRoute>;

  beforeEach(async () => {
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}-${crypto.randomUUID()}.json`);
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);
    route = createCheckRoute(library);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.unlink(testLibraryPath);
    } catch {
      // Ignore
    }
  });

  describe("POST /", () => {
    it("should check specified identifiers", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: ["smith-2024"] }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].status).toBe("ok");
      expect(data.summary.total).toBe(1);
    });

    it("should check all references when all=true", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockCheckReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ all: true })
      );
    });

    it("should pass skipDays option", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: ["test-2024"], skipDays: 30 }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockCheckReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ skipDays: 30 })
      );
    });

    it("should pass save option", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: ["test-2024"], save: false }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockCheckReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ save: false })
      );
    });

    it("should pass metadata option", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: ["test-2024"], metadata: false }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      expect(mockCheckReferences).toHaveBeenCalledWith(
        library,
        expect.objectContaining({ metadata: false })
      );
    });

    it("should return 400 for invalid JSON", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("should return 400 when no identifiers or all flag", async () => {
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

    it("should return warning results", async () => {
      mockCheckReferences.mockResolvedValue({
        results: [
          {
            id: "retracted-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              {
                type: "retracted",
                message: "This article was retracted",
                details: { retractionDoi: "10.1234/retraction" },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      });

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: ["retracted-2024"] }),
      });

      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results[0].status).toBe("warning");
      expect(data.results[0].findings[0].type).toBe("retracted");
      expect(data.summary.warnings).toBe(1);
    });
  });
});
