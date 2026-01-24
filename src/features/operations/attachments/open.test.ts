/**
 * Tests for attachment open operation
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { type OpenAttachmentOptions, openAttachment } from "./open.js";

// Mock the opener module
vi.mock("../../../utils/opener.js", () => ({
  openWithSystemApp: vi.fn().mockResolvedValue(undefined),
}));

describe("openAttachment", () => {
  let tempDir: string;
  let attachmentsBaseDir: string;
  let attachDir: string;
  let mockLibrary: ILibrary;
  let mockReference: CslItem;
  let updatedItem: CslItem | null;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `refmgr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    attachmentsBaseDir = join(tempDir, "attachments");
    attachDir = join(attachmentsBaseDir, "Smith-2024-123e4567");

    await mkdir(attachDir, { recursive: true });
    await writeFile(join(attachDir, "fulltext.pdf"), "PDF content");
    await writeFile(join(attachDir, "notes.md"), "Notes content");

    mockReference = {
      id: "Smith-2024",
      type: "article-journal",
      title: "Test Article",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2024]] },
      custom: {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "notes.md", role: "notes" },
          ],
        },
      },
    };

    updatedItem = null;

    mockLibrary = {
      find: vi.fn().mockResolvedValue(mockReference),
      update: vi.fn().mockImplementation(async (_id, updates) => {
        updatedItem = { ...mockReference, ...updates };
        return updatedItem;
      }),
      getPath: vi.fn(),
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      reload: vi.fn(),
      getReferences: vi.fn(),
      getOptions: vi.fn(),
    } as unknown as ILibrary;

    // Clear mock calls
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("open directory", () => {
    it("should open attachments directory", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(attachDir);
      expect(openWithSystemApp).toHaveBeenCalledWith(attachDir);
    });

    it("should return path without opening when print=true", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        print: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(attachDir);
      expect(openWithSystemApp).not.toHaveBeenCalled();
    });
  });

  describe("open specific file", () => {
    it("should open specific file by filename", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(join(attachDir, "fulltext.pdf"));
      expect(openWithSystemApp).toHaveBeenCalledWith(join(attachDir, "fulltext.pdf"));
    });

    it("should return error when file not found", async () => {
      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "nonexistent.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe("open by role", () => {
    it("should open file by role", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        role: "notes",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(join(attachDir, "notes.md"));
      expect(openWithSystemApp).toHaveBeenCalledWith(join(attachDir, "notes.md"));
    });

    it("should return error when no file matches role", async () => {
      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no.*supplement/i);
    });

    it("should open first file when multiple files match role", async () => {
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "fulltext.md", role: "fulltext" },
          ],
        },
      };
      await writeFile(join(attachDir, "fulltext.md"), "Markdown content");

      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        role: "fulltext",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      // Should open first matching file
      expect(openWithSystemApp).toHaveBeenCalled();
    });
  });

  describe("create directory if not exists", () => {
    it("should create directory when it does not exist", async () => {
      // Remove existing directory
      await rm(attachDir, { recursive: true });

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.directoryCreated).toBe(true);

      // Verify directory was created
      const entries = await readdir(attachmentsBaseDir);
      expect(entries).toContain("Smith-2024-123e4567");
    });

    it("should not create directory when reference has no uuid", async () => {
      mockReference.custom = {};
      await rm(attachDir, { recursive: true });

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/uuid/i);
    });
  });

  describe("print path option", () => {
    it("should return directory path with print=true", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        print: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(attachDir);
      expect(openWithSystemApp).not.toHaveBeenCalled();
    });

    it("should return file path with print=true and filename", async () => {
      const { openWithSystemApp } = await import("../../../utils/opener.js");

      const options: OpenAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        print: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(join(attachDir, "fulltext.pdf"));
      expect(openWithSystemApp).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      mockLibrary.find = vi.fn().mockResolvedValue(null);

      const options: OpenAttachmentOptions = {
        identifier: "NonExistent",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await openAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });
});
