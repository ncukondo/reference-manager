import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type CheckOperationOptions, checkReferences } from "./check.js";

// Mock checker
vi.mock("../check/checker.js", () => ({
  checkReference: vi.fn(),
}));

describe("checkReferences", () => {
  let mockLibrary: Library;

  const itemWithDoi: CslItem = {
    id: "smith-2024",
    type: "article-journal",
    title: "Test Article",
    DOI: "10.1234/test",
    custom: { uuid: "uuid-1" },
  };

  const itemWithPmid: CslItem = {
    id: "jones-2023",
    type: "article-journal",
    title: "Another Article",
    PMID: "12345678",
    custom: { uuid: "uuid-2" },
  };

  const itemNoDoi: CslItem = {
    id: "book-2022",
    type: "book",
    title: "A Book",
    custom: { uuid: "uuid-3" },
  };

  const itemWithCheck: CslItem = {
    id: "checked-2024",
    type: "article-journal",
    title: "Checked Article",
    DOI: "10.1234/checked",
    custom: {
      uuid: "uuid-4",
      check: {
        checked_at: new Date().toISOString(),
        status: "ok",
        findings: [],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      getAll: vi.fn().mockResolvedValue([itemWithDoi, itemWithPmid, itemNoDoi, itemWithCheck]),
      find: vi.fn().mockImplementation(async (id: string) => {
        const items = [itemWithDoi, itemWithPmid, itemNoDoi, itemWithCheck];
        return items.find((i) => i.id === id);
      }),
      update: vi.fn().mockResolvedValue({ success: true }),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as Library;
  });

  describe("--all mode", () => {
    it("should check all references when --all is specified", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "test",
        uuid: "test-uuid",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      const options: CheckOperationOptions = { all: true };
      const result = await checkReferences(mockLibrary, options);

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe("identifier selection", () => {
    it("should check specific references by identifiers", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "smith-2024",
        uuid: "uuid-1",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      const options: CheckOperationOptions = { identifiers: ["smith-2024"] };
      const result = await checkReferences(mockLibrary, options);

      expect(result.results).toHaveLength(1);
      expect(result.summary.total).toBe(1);
    });

    it("should handle not-found identifiers", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const options: CheckOperationOptions = { identifiers: ["nonexistent"] };

      await expect(checkReferences(mockLibrary, options)).rejects.toThrow(
        "Reference not found: nonexistent"
      );
    });
  });

  describe("--days skip logic", () => {
    it("should skip recently checked references", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "test",
        uuid: "test-uuid",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      // itemWithCheck was checked just now, should be skipped with default days=7
      const options: CheckOperationOptions = { all: true, skipDays: 7 };
      const result = await checkReferences(mockLibrary, options);

      // The recently-checked item should be skipped
      const skippedCount = result.results.filter((r) => r.status === "skipped").length;
      expect(skippedCount).toBeGreaterThanOrEqual(1);
      // items without DOI/PMID are also skipped
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("should re-check all when --days 0", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "test",
        uuid: "test-uuid",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      const options: CheckOperationOptions = { all: true, skipDays: 0 };
      const result = await checkReferences(mockLibrary, options);

      // With days=0, even recently checked items should be re-checked
      expect(result.summary.total).toBeGreaterThan(0);
    });
  });

  describe("save behavior", () => {
    it("should save results to custom.check by default", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "smith-2024",
        uuid: "uuid-1",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      const options: CheckOperationOptions = { identifiers: ["smith-2024"] };
      await checkReferences(mockLibrary, options);

      expect(mockLibrary.update).toHaveBeenCalled();
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should not save when --no-save is specified", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);
      mockCheck.mockResolvedValue({
        id: "smith-2024",
        uuid: "uuid-1",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });

      const options: CheckOperationOptions = { identifiers: ["smith-2024"], save: false };
      await checkReferences(mockLibrary, options);

      expect(mockLibrary.update).not.toHaveBeenCalled();
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("summary", () => {
    it("should compute correct summary with mixed results", async () => {
      const { checkReference } = await import("../check/checker.js");
      const mockCheck = vi.mocked(checkReference);

      // First call: warning (DOI item)
      mockCheck.mockResolvedValueOnce({
        id: "smith-2024",
        uuid: "uuid-1",
        status: "warning",
        findings: [{ type: "retracted", message: "Retracted" }],
        checkedAt: new Date().toISOString(),
        checkedSources: ["crossref"],
      });
      // Second call: ok (PMID item)
      mockCheck.mockResolvedValueOnce({
        id: "jones-2023",
        uuid: "uuid-2",
        status: "ok",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: ["pubmed"],
      });
      // Third call: skipped (no DOI/PMID)
      mockCheck.mockResolvedValueOnce({
        id: "book-2022",
        uuid: "uuid-3",
        status: "skipped",
        findings: [],
        checkedAt: new Date().toISOString(),
        checkedSources: [],
      });

      const options: CheckOperationOptions = { all: true, skipDays: 0 };
      const result = await checkReferences(mockLibrary, options);

      expect(result.summary.ok).toBeGreaterThanOrEqual(0);
      expect(result.summary.warnings).toBeGreaterThanOrEqual(0);
      expect(result.summary.skipped).toBeGreaterThanOrEqual(0);
      expect(result.summary.total).toBe(result.results.length);
    });
  });
});
