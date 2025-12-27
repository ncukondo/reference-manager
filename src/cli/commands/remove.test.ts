import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { RemoveResult } from "../../features/operations/remove.js";
import {
  deleteFulltextFiles,
  formatFulltextWarning,
  formatRemoveOutput,
  getFulltextAttachmentTypes,
} from "./remove.js";

// Mock FulltextManager
const mockDetachFile = vi.fn();
const mockHasAttachment = vi.fn();
const mockGetAttachedTypes = vi.fn();

vi.mock("../../features/fulltext/index.js", () => ({
  FulltextManager: vi.fn().mockImplementation(() => ({
    detachFile: mockDetachFile,
    hasAttachment: mockHasAttachment,
    getAttachedTypes: mockGetAttachedTypes,
  })),
}));

// Mock fs/promises for deleteFulltextFiles test
const mockUnlink = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", () => ({
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

describe("remove command", () => {
  describe("formatRemoveOutput", () => {
    const createItem = (id: string, title: string): CslItem => ({
      id,
      type: "article",
      title,
      custom: {
        uuid: "test-uuid",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    });

    it("should format successful removal with item", () => {
      const result: RemoveResult = {
        removed: true,
        removedItem: createItem("Smith-2020", "Test Article"),
      };

      const output = formatRemoveOutput(result, "Smith-2020");

      expect(output).toBe("Removed: [Smith-2020] Test Article");
    });

    it("should format successful removal without title", () => {
      const item = createItem("Smith-2020", "");
      item.title = undefined;
      const result: RemoveResult = {
        removed: true,
        removedItem: item,
      };

      const output = formatRemoveOutput(result, "Smith-2020");

      expect(output).toBe("Removed: [Smith-2020] (no title)");
    });

    it("should format not found result", () => {
      const result: RemoveResult = {
        removed: false,
      };

      const output = formatRemoveOutput(result, "NonExistent");

      expect(output).toBe("Reference not found: NonExistent");
    });

    it("should format removal without item details", () => {
      const result: RemoveResult = {
        removed: true,
      };

      const output = formatRemoveOutput(result, "test-uuid");

      expect(output).toBe("Removed reference: test-uuid");
    });
  });

  describe("getFulltextAttachmentTypes", () => {
    it("should return empty array when no fulltext attached", () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const types = getFulltextAttachmentTypes(item);

      expect(types).toEqual([]);
    });

    it("should return pdf when only pdf attached", () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-uuid.pdf",
          },
        },
      };

      const types = getFulltextAttachmentTypes(item);

      expect(types).toEqual(["pdf"]);
    });

    it("should return markdown when only markdown attached", () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            markdown: "Smith-2024-uuid.md",
          },
        },
      };

      const types = getFulltextAttachmentTypes(item);

      expect(types).toEqual(["markdown"]);
    });

    it("should return both types when both attached", () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-uuid.pdf",
            markdown: "Smith-2024-uuid.md",
          },
        },
      };

      const types = getFulltextAttachmentTypes(item);

      expect(types).toEqual(["pdf", "markdown"]);
    });
  });

  describe("formatFulltextWarning", () => {
    it("should format warning for pdf only", () => {
      const warning = formatFulltextWarning(["pdf"]);

      expect(warning).toContain("fulltext");
      expect(warning).toContain("PDF");
      expect(warning).toContain("--force");
    });

    it("should format warning for markdown only", () => {
      const warning = formatFulltextWarning(["markdown"]);

      expect(warning).toContain("fulltext");
      expect(warning).toContain("Markdown");
      expect(warning).toContain("--force");
    });

    it("should format warning for both types", () => {
      const warning = formatFulltextWarning(["pdf", "markdown"]);

      expect(warning).toContain("fulltext");
      expect(warning).toContain("PDF");
      expect(warning).toContain("Markdown");
      expect(warning).toContain("--force");
    });
  });

  describe("deleteFulltextFiles", () => {
    const fulltextDirectory = "/home/user/.reference-manager/fulltext";

    beforeEach(() => {
      mockUnlink.mockClear();
    });

    it("should delete pdf file when pdf attached", async () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-uuid.pdf",
          },
        },
      };

      await deleteFulltextFiles(item, fulltextDirectory);

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(fulltextDirectory, "Smith-2024-uuid.pdf"));
    });

    it("should delete markdown file when markdown attached", async () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            markdown: "Smith-2024-uuid.md",
          },
        },
      };

      await deleteFulltextFiles(item, fulltextDirectory);

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(fulltextDirectory, "Smith-2024-uuid.md"));
    });

    it("should delete both files when both attached", async () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-uuid.pdf",
            markdown: "Smith-2024-uuid.md",
          },
        },
      };

      await deleteFulltextFiles(item, fulltextDirectory);

      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(fulltextDirectory, "Smith-2024-uuid.pdf"));
      expect(mockUnlink).toHaveBeenCalledWith(path.join(fulltextDirectory, "Smith-2024-uuid.md"));
    });

    it("should not call unlink when no fulltext attached", async () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      await deleteFulltextFiles(item, fulltextDirectory);

      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should ignore errors when file doesn't exist", async () => {
      mockUnlink.mockRejectedValueOnce(new Error("ENOENT: no such file"));

      const item: CslItem = {
        id: "Smith-2024",
        type: "article",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-uuid.pdf",
          },
        },
      };

      // Should not throw
      await expect(deleteFulltextFiles(item, fulltextDirectory)).resolves.toBeUndefined();
    });
  });
});
