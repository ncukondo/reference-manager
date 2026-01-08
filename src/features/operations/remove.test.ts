import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import {
  type RemoveOperationOptions,
  getFulltextAttachmentTypes,
  removeReference,
} from "./remove.js";

// Mock Library
vi.mock("../../core/library.js");

// Mock fs/promises
const mockUnlink = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", () => ({
  unlink: (...args: unknown[]) => mockUnlink(...args),
}));

describe("getFulltextAttachmentTypes", () => {
  it("should return empty array when no fulltext", () => {
    const item: CslItem = {
      id: "test",
      type: "article-journal",
      custom: { uuid: "uuid-1", created_at: "", timestamp: "" },
    };
    expect(getFulltextAttachmentTypes(item)).toEqual([]);
  });

  it("should return empty array when fulltext is empty", () => {
    const item: CslItem = {
      id: "test",
      type: "article-journal",
      custom: { uuid: "uuid-1", created_at: "", timestamp: "", fulltext: {} },
    };
    expect(getFulltextAttachmentTypes(item)).toEqual([]);
  });

  it("should return ['pdf'] when only pdf exists", () => {
    const item: CslItem = {
      id: "test",
      type: "article-journal",
      custom: { uuid: "uuid-1", created_at: "", timestamp: "", fulltext: { pdf: "test.pdf" } },
    };
    expect(getFulltextAttachmentTypes(item)).toEqual(["pdf"]);
  });

  it("should return ['markdown'] when only markdown exists", () => {
    const item: CslItem = {
      id: "test",
      type: "article-journal",
      custom: { uuid: "uuid-1", created_at: "", timestamp: "", fulltext: { markdown: "test.md" } },
    };
    expect(getFulltextAttachmentTypes(item)).toEqual(["markdown"]);
  });

  it("should return ['pdf', 'markdown'] when both exist", () => {
    const item: CslItem = {
      id: "test",
      type: "article-journal",
      custom: {
        uuid: "uuid-1",
        created_at: "",
        timestamp: "",
        fulltext: { pdf: "test.pdf", markdown: "test.md" },
      },
    };
    expect(getFulltextAttachmentTypes(item)).toEqual(["pdf", "markdown"]);
  });
});

describe("removeReference", () => {
  let mockLibrary: Library;
  const mockItem: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    custom: { uuid: "uuid-1", created_at: "", timestamp: "" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      remove: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as Library;
  });

  describe("remove by ID", () => {
    it("should remove reference by ID successfully", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "smith-2023", idType: "id" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.removedItem).toEqual(mockItem);
      expect(mockLibrary.remove).toHaveBeenCalledWith("smith-2023", { idType: "id" });
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when ID not found", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({ removed: false });

      const options: RemoveOperationOptions = { identifier: "nonexistent", idType: "id" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(mockLibrary.remove).toHaveBeenCalledWith("nonexistent", { idType: "id" });
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("remove by UUID", () => {
    it("should remove reference by UUID successfully", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "uuid-1", idType: "uuid" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.removedItem).toEqual(mockItem);
      expect(mockLibrary.remove).toHaveBeenCalledWith("uuid-1", { idType: "uuid" });
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when UUID not found", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({ removed: false });

      const options: RemoveOperationOptions = { identifier: "nonexistent-uuid", idType: "uuid" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(mockLibrary.remove).toHaveBeenCalledWith("nonexistent-uuid", { idType: "uuid" });
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("idType default", () => {
    it("should use idType='id' by default", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "smith-2023" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(mockLibrary.remove).toHaveBeenCalledWith("smith-2023", { idType: "id" });
    });
  });

  describe("fulltext deletion", () => {
    const mockItemWithFulltext: CslItem = {
      id: "smith-2023",
      type: "article-journal",
      title: "Test Article",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: {
        uuid: "uuid-1",
        created_at: "",
        timestamp: "",
        fulltext: { pdf: "uuid-1.pdf", markdown: "uuid-1.md" },
      },
    };

    it("should not delete fulltext when deleteFulltext is false", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItemWithFulltext,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        fulltextDirectory: "/path/to/fulltext",
        deleteFulltext: false,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toBeUndefined();
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should not delete fulltext when fulltextDirectory is not provided", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItemWithFulltext,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        deleteFulltext: true,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toBeUndefined();
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should delete fulltext files when deleteFulltext is true", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItemWithFulltext,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        fulltextDirectory: "/path/to/fulltext",
        deleteFulltext: true,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toEqual(["pdf", "markdown"]);
      expect(mockUnlink).toHaveBeenCalledTimes(2);
      expect(mockUnlink).toHaveBeenCalledWith("/path/to/fulltext/uuid-1.pdf");
      expect(mockUnlink).toHaveBeenCalledWith("/path/to/fulltext/uuid-1.md");
    });

    it("should return deletedFulltextTypes only when files exist", async () => {
      const mockItemWithPdfOnly: CslItem = {
        ...mockItem,
        custom: {
          uuid: "uuid-1",
          created_at: "",
          timestamp: "",
          fulltext: { pdf: "uuid-1.pdf" },
        },
      };
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItemWithPdfOnly,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        fulltextDirectory: "/path/to/fulltext",
        deleteFulltext: true,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toEqual(["pdf"]);
      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith("/path/to/fulltext/uuid-1.pdf");
    });

    it("should not include deletedFulltextTypes when item has no fulltext", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        fulltextDirectory: "/path/to/fulltext",
        deleteFulltext: true,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toBeUndefined();
      expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("should ignore unlink errors (file not found)", async () => {
      mockUnlink.mockRejectedValueOnce(new Error("ENOENT"));
      mockUnlink.mockResolvedValueOnce(undefined);
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItemWithFulltext,
      });

      const options: RemoveOperationOptions = {
        identifier: "smith-2023",
        fulltextDirectory: "/path/to/fulltext",
        deleteFulltext: true,
      };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.deletedFulltextTypes).toEqual(["pdf", "markdown"]);
      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });
  });
});
