import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { type FulltextAttachOptions, fulltextAttach } from "./attach.js";

// Mock the FulltextManager
vi.mock("../../fulltext/index.js", () => ({
  FulltextManager: vi.fn(),
  FulltextIOError: class extends Error {
    name = "FulltextIOError";
  },
}));

// Mock the update operation
vi.mock("../update.js", () => ({
  updateReference: vi.fn(),
}));

import { FulltextIOError, FulltextManager } from "../../fulltext/index.js";
import { updateReference } from "../update.js";

const mockedUpdateReference = vi.mocked(updateReference);

describe("fulltextAttach", () => {
  let mockLibrary: Library;
  let mockManager: {
    attachFile: ReturnType<typeof vi.fn>;
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
      attachFile: vi.fn(),
    };

    vi.mocked(FulltextManager).mockImplementation(() => mockManager as unknown as FulltextManager);

    // Default mock library behavior
    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
    } as unknown as Library;
  });

  describe("reference lookup", () => {
    it("should find reference by id when byUuid is false", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-id", { byUuid: false });
    });

    it("should find reference by uuid when byUuid is true", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-uuid",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        byUuid: true,
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { byUuid: true });
    });

    it("should return error when reference not found", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

      const result = await fulltextAttach(mockLibrary, {
        identifier: "nonexistent",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reference 'nonexistent' not found");
    });
  });

  describe("file type detection", () => {
    it("should detect pdf type from file extension", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockManager.attachFile).toHaveBeenCalledWith(item, "/path/to/file.pdf", "pdf", {});
    });

    it("should detect markdown type from .md extension", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.md", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.md",
        fulltextDirectory: "/fulltext",
      });

      expect(mockManager.attachFile).toHaveBeenCalledWith(item, "/path/to/file.md", "markdown", {});
    });

    it("should use explicit type when provided", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.txt",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockManager.attachFile).toHaveBeenCalledWith(item, "/path/to/file.txt", "pdf", {});
    });

    it("should return error when file type cannot be detected", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.txt",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot detect file type");
    });
  });

  describe("attach operations", () => {
    it("should attach file successfully", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test-id.pdf", overwritten: false });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("test-id.pdf");
      expect(result.type).toBe("pdf");
      expect(result.overwritten).toBe(false);
    });

    it("should pass move option to manager", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        move: true,
      });

      expect(mockManager.attachFile).toHaveBeenCalledWith(item, "/path/to/file.pdf", "pdf", {
        move: true,
      });
    });

    it("should pass force option to manager", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test.pdf", overwritten: true });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        force: true,
      });

      expect(mockManager.attachFile).toHaveBeenCalledWith(item, "/path/to/file.pdf", "pdf", {
        force: true,
      });
    });
  });

  describe("existing file handling", () => {
    it("should return requiresConfirmation when existing file and not forced", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({
        filename: "test.pdf",
        existingFile: "/fulltext/existing.pdf",
        overwritten: false,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.existingFile).toBe("/fulltext/existing.pdf");
    });

    it("should update metadata when overwritten", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({
        filename: "test-id.pdf",
        overwritten: true,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        force: true,
      });

      expect(result.success).toBe(true);
      expect(result.overwritten).toBe(true);
      expect(mockedUpdateReference).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          identifier: "test-id",
          byUuid: false,
        })
      );
    });
  });

  describe("metadata update", () => {
    it("should update fulltext metadata after successful attach", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test-id.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedUpdateReference).toHaveBeenCalledWith(mockLibrary, {
        identifier: "test-id",
        updates: {
          custom: {
            fulltext: { pdf: "test-id.pdf" },
          },
        },
        byUuid: false,
      });
    });

    it("should preserve existing fulltext entries when adding new type", async () => {
      const item = createItem("test-id", { markdown: "existing.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test-id.pdf", overwritten: false });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedUpdateReference).toHaveBeenCalledWith(mockLibrary, {
        identifier: "test-id",
        updates: {
          custom: {
            fulltext: { markdown: "existing.md", pdf: "test-id.pdf" },
          },
        },
        byUuid: false,
      });
    });
  });

  describe("error handling", () => {
    it("should handle FulltextIOError", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockRejectedValue(new FulltextIOError("File not found"));

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should rethrow unexpected errors", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockRejectedValue(new Error("Unexpected error"));

      await expect(
        fulltextAttach(mockLibrary, {
          identifier: "test-id",
          filePath: "/path/to/file.pdf",
          fulltextDirectory: "/fulltext",
        })
      ).rejects.toThrow("Unexpected error");
    });

    it("should return error when no file path provided and no type specified", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      } as FulltextAttachOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot detect file type");
    });
  });

  describe("stdin content support", () => {
    it("should handle stdin content with explicit type", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.attachFile.mockResolvedValue({ filename: "test-id.md", overwritten: false });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        stdinContent: Buffer.from("# Test content"),
        type: "markdown",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("markdown");
    });

    it("should return error when stdin without explicit type", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        stdinContent: Buffer.from("content"),
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("File type must be specified");
    });
  });
});
