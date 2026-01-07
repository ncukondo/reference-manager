import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { openWithSystemApp } from "../../../utils/opener.js";
import { fulltextOpen } from "./open.js";

// Mock opener
vi.mock("../../../utils/opener.js", () => ({
  openWithSystemApp: vi.fn(),
}));

// Mock fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

describe("fulltextOpen", () => {
  const mockLibrary = {
    find: vi.fn(),
  } as unknown as ILibrary;

  const fulltextDirectory = "/home/user/.reference-manager/fulltext";

  const itemWithBoth: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      fulltext: {
        pdf: "Smith-2024-uuid.pdf",
        markdown: "Smith-2024-uuid.md",
      },
    },
  };

  const itemWithPdfOnly: CslItem = {
    id: "Jones-2024",
    type: "article-journal",
    title: "Another Article",
    custom: {
      uuid: "223e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      fulltext: {
        pdf: "Jones-2024-uuid.pdf",
      },
    },
  };

  const itemWithMarkdownOnly: CslItem = {
    id: "Brown-2024",
    type: "article-journal",
    title: "Third Article",
    custom: {
      uuid: "323e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      fulltext: {
        markdown: "Brown-2024-uuid.md",
      },
    },
  };

  const itemWithNoFulltext: CslItem = {
    id: "White-2024",
    type: "article-journal",
    title: "No Fulltext Article",
    custom: {
      uuid: "423e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(openWithSystemApp).mockResolvedValue(undefined);
  });

  describe("file priority", () => {
    it("should open PDF when both PDF and Markdown exist and no type specified", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithBoth);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Smith-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(result.openedType).toBe("pdf");
      expect(openWithSystemApp).toHaveBeenCalledWith(`${fulltextDirectory}/Smith-2024-uuid.pdf`);
    });

    it("should open PDF when only PDF exists", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithPdfOnly);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Jones-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(result.openedType).toBe("pdf");
    });

    it("should open Markdown when only Markdown exists", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithMarkdownOnly);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Brown-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(result.openedType).toBe("markdown");
    });
  });

  describe("explicit type option", () => {
    it("should open PDF when --pdf option specified", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithBoth);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Smith-2024",
        type: "pdf",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(result.openedType).toBe("pdf");
      expect(openWithSystemApp).toHaveBeenCalledWith(`${fulltextDirectory}/Smith-2024-uuid.pdf`);
    });

    it("should open Markdown when --markdown option specified", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithBoth);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Smith-2024",
        type: "markdown",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(result.openedType).toBe("markdown");
      expect(openWithSystemApp).toHaveBeenCalledWith(`${fulltextDirectory}/Smith-2024-uuid.md`);
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "NonExistent",
        fulltextDirectory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Reference not found");
    });

    it("should return error when no fulltext attached", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithNoFulltext);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "White-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });

    it("should return error when specified format not attached", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithPdfOnly);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Jones-2024",
        type: "markdown",
        fulltextDirectory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No markdown attached");
    });

    it("should return error when file missing on disk", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithPdfOnly);
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Jones-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("file not found");
      expect(result.error).toContain("metadata exists but file is missing");
    });

    it("should return error when opener fails", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithPdfOnly);
      vi.mocked(openWithSystemApp).mockRejectedValue(new Error("Failed to open file"));

      const result = await fulltextOpen(mockLibrary, {
        identifier: "Jones-2024",
        fulltextDirectory,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to open file");
    });
  });

  describe("identifier types", () => {
    it("should support uuid identifier type", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(itemWithPdfOnly);

      const result = await fulltextOpen(mockLibrary, {
        identifier: "223e4567-e89b-12d3-a456-426614174000",
        idType: "uuid",
        fulltextDirectory,
      });

      expect(result.success).toBe(true);
      expect(mockLibrary.find).toHaveBeenCalledWith("223e4567-e89b-12d3-a456-426614174000", {
        idType: "uuid",
      });
    });
  });
});
