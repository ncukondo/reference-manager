import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { type FulltextAttachOptions, fulltextAttach } from "./attach.js";

// Mock the addAttachment operation
vi.mock("../attachments/add.js", () => ({
  addAttachment: vi.fn(),
}));

import { addAttachment } from "../attachments/add.js";

const mockedAddAttachment = vi.mocked(addAttachment);

describe("fulltextAttach", () => {
  let mockLibrary: Library;

  const createItem = (
    id: string,
    attachments?: { directory?: string; files?: Array<{ filename: string; role: string }> }
  ): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      ...(attachments && { attachments }),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock library behavior
    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
    } as unknown as Library;
  });

  describe("reference lookup", () => {
    it("should find reference by id when idType is 'id'", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          identifier: "test-id",
          idType: "id",
        })
      );
    });

    it("should find reference by uuid when idType is 'uuid'", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      await fulltextAttach(mockLibrary, {
        identifier: "test-uuid",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        idType: "uuid",
      });

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          identifier: "test-uuid",
          idType: "uuid",
        })
      );
    });

    it("should return error when reference not found", async () => {
      mockedAddAttachment.mockResolvedValue({
        success: false,
        error: "Reference 'nonexistent' not found",
      });

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
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("pdf");
      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          filePath: "/path/to/file.pdf",
          role: "fulltext",
        })
      );
    });

    it("should detect markdown type from .md extension", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.md",
        overwritten: false,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.md",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("markdown");
      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          filePath: "/path/to/file.md",
          role: "fulltext",
        })
      );
    });

    it("should use explicit type when provided", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.txt",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("pdf");
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
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe("fulltext.pdf");
      expect(result.type).toBe("pdf");
      expect(result.overwritten).toBe(false);
    });

    it("should pass move option to addAttachment", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        move: true,
      });

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          move: true,
        })
      );
    });

    it("should pass force option to addAttachment", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: true,
      });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
        force: true,
      });

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          force: true,
        })
      );
    });
  });

  describe("existing file handling", () => {
    it("should return requiresConfirmation when existing file and not forced", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: false,
        existingFile: "fulltext.pdf",
        requiresConfirmation: true,
      });

      const result = await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.existingFile).toBe("fulltext.pdf");
    });

    it("should return overwritten=true when force overwrites", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
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
    });
  });

  describe("error handling", () => {
    it("should handle addAttachment errors", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: false,
        error: "File not found",
      });

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
      mockedAddAttachment.mockRejectedValue(new Error("Unexpected error"));

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
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.md",
        overwritten: false,
      });

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

  describe("attachments system integration", () => {
    it("should use fulltext role when calling addAttachment", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedAddAttachment.mockResolvedValue({
        success: true,
        filename: "fulltext.pdf",
        overwritten: false,
      });

      await fulltextAttach(mockLibrary, {
        identifier: "test-id",
        filePath: "/path/to/file.pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(mockedAddAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          role: "fulltext",
          attachmentsDirectory: "/fulltext",
        })
      );
    });
  });
});
