import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextDetach } from "./detach.js";

// Mock the FulltextManager
vi.mock("../../fulltext/index.js", () => ({
  FulltextManager: vi.fn(),
  FulltextNotAttachedError: class extends Error {
    name = "FulltextNotAttachedError";
  },
  FulltextIOError: class extends Error {
    name = "FulltextIOError";
  },
}));

// Mock the update operation
vi.mock("../update.js", () => ({
  updateReference: vi.fn(),
}));

import {
  FulltextIOError,
  FulltextManager,
  FulltextNotAttachedError,
} from "../../fulltext/index.js";
import { updateReference } from "../update.js";

const mockedUpdateReference = vi.mocked(updateReference);

describe("fulltextDetach", () => {
  let mockLibrary: Library;
  let mockManager: {
    detachFile: ReturnType<typeof vi.fn>;
    getAttachedTypes: ReturnType<typeof vi.fn>;
  };

  const createItem = (id: string, fulltext?: { pdf?: string; markdown?: string }): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      ...(fulltext && { fulltext }),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockManager = {
      detachFile: vi.fn(),
      getAttachedTypes: vi.fn(),
    };

    vi.mocked(FulltextManager).mockImplementation(() => mockManager as unknown as FulltextManager);

    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
    } as unknown as Library;
  });

  describe("reference lookup", () => {
    it("should find reference by id when byUuid is false", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-id", { byUuid: false });
    });

    it("should find reference by uuid when byUuid is true", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      await fulltextDetach(mockLibrary, {
        identifier: "test-uuid",
        fulltextDirectory: "/fulltext",
        byUuid: true,
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { byUuid: true });
    });

    it("should return error when reference not found", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "nonexistent",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reference 'nonexistent' not found");
    });
  });

  describe("detach operations", () => {
    it("should detach pdf successfully", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(result.deleted).toBeUndefined();
    });

    it("should detach specific type when type option is provided", async () => {
      const item = createItem("test-id", { pdf: "test.pdf", markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(mockManager.detachFile).toHaveBeenCalledTimes(1);
    });

    it("should detach all types when no type specified", async () => {
      const item = createItem("test-id", { pdf: "test.pdf", markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf", "markdown"]);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf", "markdown"]);
      expect(mockManager.detachFile).toHaveBeenCalledTimes(2);
    });

    it("should delete files when delete option is true", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockResolvedValue({ deleted: true });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        delete: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(result.deleted).toEqual(["pdf"]);
      expect(mockManager.detachFile).toHaveBeenCalledWith(item, "pdf", { delete: true });
    });

    it("should return error when no fulltext attached", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue([]);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });
  });

  describe("metadata update", () => {
    it("should update metadata after detaching", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedUpdateReference).toHaveBeenCalledWith(mockLibrary, {
        identifier: "test-id",
        updates: {
          custom: { fulltext: undefined },
        },
        byUuid: false,
      });
    });

    it("should preserve remaining fulltext entries", async () => {
      const item = createItem("test-id", { pdf: "test.pdf", markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.detachFile.mockResolvedValue({ deleted: false });

      await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedUpdateReference).toHaveBeenCalledWith(mockLibrary, {
        identifier: "test-id",
        updates: {
          custom: { fulltext: { markdown: "test.md" } },
        },
        byUuid: false,
      });
    });
  });

  describe("error handling", () => {
    it("should handle FulltextNotAttachedError", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockRejectedValue(new FulltextNotAttachedError("File not attached"));

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not attached");
    });

    it("should handle FulltextIOError", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockRejectedValue(new FulltextIOError("Delete failed"));

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("should rethrow unexpected errors", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.detachFile.mockRejectedValue(new Error("Unexpected error"));

      await expect(
        fulltextDetach(mockLibrary, {
          identifier: "test-id",
          fulltextDirectory: "/fulltext",
        })
      ).rejects.toThrow("Unexpected error");
    });
  });
});
