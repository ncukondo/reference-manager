/**
 * Tests for attachment detach operation
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { type DetachAttachmentOptions, detachAttachment } from "./detach.js";

describe("detachAttachment", () => {
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
    await writeFile(join(attachDir, "supplement-table-s1.xlsx"), "Excel content");
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
            { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
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
      save: vi.fn().mockResolvedValue(undefined),
      getPath: vi.fn(),
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      reload: vi.fn(),
      getReferences: vi.fn(),
      getOptions: vi.fn(),
    } as unknown as ILibrary;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("remove from metadata only", () => {
    it("should remove attachment from metadata but keep file", async () => {
      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "notes.md",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["notes.md"]);
      expect(result.deleted).toEqual([]);

      // File should still exist
      const files = await readdir(attachDir);
      expect(files).toContain("notes.md");

      // Metadata should be updated
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
      expect(updatedItem?.custom?.attachments?.files).not.toContainEqual({
        filename: "notes.md",
        role: "notes",
      });
    });
  });

  describe("delete file with --delete", () => {
    it("should remove file from disk when delete=true", async () => {
      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "notes.md",
        delete: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["notes.md"]);
      expect(result.deleted).toEqual(["notes.md"]);

      // File should be deleted
      const files = await readdir(attachDir);
      expect(files).not.toContain("notes.md");
    });
  });

  describe("remove all files of role with --all", () => {
    it("should detach all files of specified role", async () => {
      // Add another supplement
      mockReference.custom = {
        ...mockReference.custom,
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
            { filename: "supplement-figure-s1.png", role: "supplement", label: "Figure S1" },
            { filename: "notes.md", role: "notes" },
          ],
        },
      };
      await writeFile(join(attachDir, "supplement-figure-s1.png"), "PNG content");

      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        role: "supplement",
        all: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.detached).toHaveLength(2);
      expect(result.detached).toContain("supplement-table-s1.xlsx");
      expect(result.detached).toContain("supplement-figure-s1.png");

      // Metadata should only have fulltext and notes
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
    });

    it("should delete all files of role when delete=true", async () => {
      mockReference.custom = {
        ...mockReference.custom,
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
            { filename: "supplement-figure-s1.png", role: "supplement", label: "Figure S1" },
            { filename: "notes.md", role: "notes" },
          ],
        },
      };
      await writeFile(join(attachDir, "supplement-figure-s1.png"), "PNG content");

      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        role: "supplement",
        all: true,
        delete: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.deleted).toHaveLength(2);

      // Files should be deleted
      const files = await readdir(attachDir);
      expect(files).not.toContain("supplement-table-s1.xlsx");
      expect(files).not.toContain("supplement-figure-s1.png");
    });
  });

  describe("directory cleanup when last file removed", () => {
    it("should delete directory when last file removed with delete=true", async () => {
      // Reference with single file
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      };

      // Remove other files from disk
      await rm(join(attachDir, "supplement-table-s1.xlsx"));
      await rm(join(attachDir, "notes.md"));

      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        delete: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.directoryDeleted).toBe(true);

      // Directory should be deleted
      await expect(readdir(attachDir)).rejects.toThrow();
    });

    it("should not delete directory when files remain", async () => {
      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "notes.md",
        delete: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.directoryDeleted).toBeFalsy();

      // Directory should still exist
      const files = await readdir(attachDir);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      mockLibrary.find = vi.fn().mockResolvedValue(null);

      const options: DetachAttachmentOptions = {
        identifier: "NonExistent",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should return error when file not in metadata", async () => {
      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "nonexistent.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should return error when no filename or role specified", async () => {
      const options: DetachAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await detachAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/filename or role/i);
    });
  });
});
