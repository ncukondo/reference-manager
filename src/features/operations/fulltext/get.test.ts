import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextGet } from "./get.js";

// Mock fs/promises for readFile
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";

const mockedReadFile = vi.mocked(readFile);

describe("fulltextGet", () => {
  let mockLibrary: Library;

  const createItem = (
    id: string,
    attachments?: {
      directory?: string;
      files?: Array<{ filename: string; role: string; label?: string }>;
    }
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

    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
    } as unknown as Library;
  });

  describe("reference lookup", () => {
    it("should find reference by id when idType is 'id'", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-id", { idType: "id" });
    });

    it("should find reference by uuid when idType is 'uuid'", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      await fulltextGet(mockLibrary, {
        identifier: "test-uuid",
        fulltextDirectory: "/fulltext",
        idType: "uuid",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { idType: "uuid" });
    });

    it("should return error when reference not found", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

      const result = await fulltextGet(mockLibrary, {
        identifier: "nonexistent",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reference 'nonexistent' not found");
    });
  });

  describe("path mode", () => {
    it("should return pdf path when pdf is attached", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test-id-12345678/fulltext.pdf");
    });

    it("should return markdown path when markdown is attached", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.md", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.markdown).toBe("/fulltext/test-id-12345678/fulltext.md");
    });

    it("should return both paths when both are attached", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test-id-12345678/fulltext.pdf");
      expect(result.paths?.markdown).toBe("/fulltext/test-id-12345678/fulltext.md");
    });

    it("should return only specified type when type option is provided", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test-id-12345678/fulltext.pdf");
      expect(result.paths?.markdown).toBeUndefined();
    });

    it("should return error when no fulltext attached", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });

    it("should return error when only non-fulltext attachments exist", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "supplement.pdf", role: "supplement" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });
  });

  describe("preferredType option", () => {
    it("should list markdown path first when preferredType is markdown", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        preferredType: "markdown",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths).toBeDefined();
      const pathKeys = Object.keys(result.paths ?? {});
      expect(pathKeys[0]).toBe("markdown");
      expect(pathKeys[1]).toBe("pdf");
    });

    it("should list PDF path first when preferredType is undefined (backward compatible)", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths).toBeDefined();
      const pathKeys = Object.keys(result.paths ?? {});
      expect(pathKeys[0]).toBe("pdf");
    });

    it("should list PDF path first when preferredType is pdf", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.md", role: "fulltext" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        preferredType: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths).toBeDefined();
      const pathKeys = Object.keys(result.paths ?? {});
      expect(pathKeys[0]).toBe("pdf");
    });
  });

  describe("stdout mode", () => {
    it("should return content when stdout and type are specified", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.md", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedReadFile.mockResolvedValue(Buffer.from("# Test content"));

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "markdown",
        stdout: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.content?.toString()).toBe("# Test content");
    });

    it("should return error when specified type is not attached", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "markdown",
        stdout: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No markdown fulltext attached");
    });

    it("should return error when file read fails", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.md", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedReadFile.mockRejectedValue(new Error("File not found"));

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "markdown",
        stdout: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No markdown fulltext attached");
    });

    it("should return error when no attachments exist for stdout mode", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        stdout: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No pdf fulltext attached");
    });
  });

  describe("attachments system integration", () => {
    it("should only return files with fulltext role", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "supplement.pdf", role: "supplement" },
          { filename: "notes.md", role: "notes" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test-id-12345678/fulltext.pdf");
      expect(result.paths?.markdown).toBeUndefined();
    });
  });
});
