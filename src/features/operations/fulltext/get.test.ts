import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextGet } from "./get.js";

// Mock the FulltextManager
vi.mock("../../fulltext/index.js", () => ({
  FulltextManager: vi.fn(),
}));

// Mock fs/promises for readFile
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { FulltextManager } from "../../fulltext/index.js";

const mockedReadFile = vi.mocked(readFile);

describe("fulltextGet", () => {
  let mockLibrary: Library;
  let mockManager: {
    getFilePath: ReturnType<typeof vi.fn>;
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
      getFilePath: vi.fn(),
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
      mockManager.getFilePath.mockReturnValue("/fulltext/test.pdf");

      await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-id", { byUuid: false });
    });

    it("should find reference by uuid when byUuid is true", async () => {
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.pdf");

      await fulltextGet(mockLibrary, {
        identifier: "test-uuid",
        fulltextDirectory: "/fulltext",
        byUuid: true,
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { byUuid: true });
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
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf"]);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.pdf");

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test.pdf");
    });

    it("should return markdown path when markdown is attached", async () => {
      const item = createItem("test-id", { markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["markdown"]);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.md");

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.markdown).toBe("/fulltext/test.md");
    });

    it("should return both paths when both are attached", async () => {
      const item = createItem("test-id", { pdf: "test.pdf", markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue(["pdf", "markdown"]);
      mockManager.getFilePath.mockImplementation((_, type) => {
        if (type === "pdf") return "/fulltext/test.pdf";
        if (type === "markdown") return "/fulltext/test.md";
        return undefined;
      });

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test.pdf");
      expect(result.paths?.markdown).toBe("/fulltext/test.md");
    });

    it("should return only specified type when type option is provided", async () => {
      const item = createItem("test-id", { pdf: "test.pdf", markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.pdf");

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.paths?.pdf).toBe("/fulltext/test.pdf");
      expect(result.paths?.markdown).toBeUndefined();
    });

    it("should return error when no fulltext attached", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getAttachedTypes.mockReturnValue([]);

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });
  });

  describe("stdout mode", () => {
    it("should return content when stdout and type are specified", async () => {
      const item = createItem("test-id", { markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.md");
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
      const item = createItem("test-id", { pdf: "test.pdf" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getFilePath.mockReturnValue(undefined);

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
      const item = createItem("test-id", { markdown: "test.md" });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockManager.getFilePath.mockReturnValue("/fulltext/test.md");
      mockedReadFile.mockRejectedValue(new Error("File not found"));

      const result = await fulltextGet(mockLibrary, {
        identifier: "test-id",
        type: "markdown",
        stdout: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to read file");
    });
  });
});
