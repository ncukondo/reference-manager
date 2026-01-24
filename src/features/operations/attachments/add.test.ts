/**
 * Tests for attachment add operation
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { type AddAttachmentOptions, addAttachment } from "./add.js";

describe("addAttachment", () => {
  let tempDir: string;
  let attachmentsBaseDir: string;
  let sourceFile: string;
  let mockLibrary: ILibrary;
  let mockReference: CslItem;
  let updatedItem: CslItem | null;

  beforeEach(async () => {
    // Create temp directories
    tempDir = join(tmpdir(), `refmgr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    attachmentsBaseDir = join(tempDir, "attachments");
    const sourceDir = join(tempDir, "source");

    await mkdir(attachmentsBaseDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    // Create source file
    sourceFile = join(sourceDir, "test.pdf");
    await writeFile(sourceFile, "PDF content");

    // Mock reference
    mockReference = {
      id: "Smith-2024",
      type: "article-journal",
      title: "Test Article",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2024]] },
      custom: {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
      },
    };

    updatedItem = null;

    // Mock library
    mockLibrary = {
      find: vi.fn().mockResolvedValue(mockReference),
      update: vi.fn().mockImplementation(async (_id, updates) => {
        updatedItem = { ...mockReference, ...updates };
        return updatedItem;
      }),
      // Other required methods
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

  describe("copy file to directory", () => {
    it("should copy file and update metadata", async () => {
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe("supplement.pdf");
      expect(result.directory).toMatch(/Smith-2024-123e4567/);

      // Verify library was updated
      expect(mockLibrary.update).toHaveBeenCalled();
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(1);
      expect(updatedItem?.custom?.attachments?.files[0]).toEqual({
        filename: "supplement.pdf",
        role: "supplement",
      });
    });

    it("should generate filename with label", async () => {
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        label: "Table S1",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.filename).toBe("supplement-table-s1.pdf");

      expect(updatedItem?.custom?.attachments?.files[0]).toEqual({
        filename: "supplement-table-s1.pdf",
        role: "supplement",
        label: "Table S1",
      });
    });

    it("should preserve original file when copying", async () => {
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      await addAttachment(mockLibrary, options);

      // Original file should still exist
      const { stat } = await import("node:fs/promises");
      await expect(stat(sourceFile)).resolves.toBeDefined();
    });
  });

  describe("move file option", () => {
    it("should move file instead of copy when move=true", async () => {
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        move: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(true);

      // Original file should not exist
      const { stat } = await import("node:fs/promises");
      await expect(stat(sourceFile)).rejects.toThrow();
    });
  });

  describe("metadata update", () => {
    it("should preserve existing attachments when adding new", async () => {
      // Mock reference with existing attachment
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "notes.md", role: "notes" }],
        },
      };

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      await addAttachment(mockLibrary, options);

      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
      expect(updatedItem?.custom?.attachments?.files).toEqual([
        { filename: "notes.md", role: "notes" },
        { filename: "supplement.pdf", role: "supplement" },
      ]);
    });
  });

  describe("fulltext role constraint", () => {
    it("should allow one fulltext PDF and one fulltext Markdown", async () => {
      // Mock reference with existing fulltext PDF
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      };

      // Create a markdown source file
      const mdFile = join(tempDir, "source", "test.md");
      await writeFile(mdFile, "# Markdown content");

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: mdFile,
        role: "fulltext",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
    });

    it("should reject third fulltext file when same format exists", async () => {
      // Mock reference with existing fulltext PDF and MD
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

      // Try to add another PDF - should reject because PDF already exists
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "fulltext",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      // Rejects with "PDF already exists" rather than "max 2" because same format exists
      expect(result.error).toMatch(/fulltext.*pdf.*exists/i);
    });

    it("should reject second fulltext PDF", async () => {
      // Mock reference with existing fulltext PDF
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      };

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "fulltext",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/fulltext.*pdf.*exists/i);
    });
  });

  describe("overwrite with --force", () => {
    it("should fail when file exists without force", async () => {
      // Mock reference with existing attachment
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "supplement.pdf", role: "supplement" }],
        },
      };

      // Create the existing attachment directory and file
      const attachDir = join(attachmentsBaseDir, "Smith-2024-123e4567");
      await mkdir(attachDir, { recursive: true });
      await writeFile(join(attachDir, "supplement.pdf"), "existing");

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.existingFile).toBe("supplement.pdf");
      expect(result.requiresConfirmation).toBe(true);
    });

    it("should overwrite when force=true", async () => {
      // Mock reference with existing attachment
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "supplement.pdf", role: "supplement" }],
        },
      };

      // Create the existing attachment directory and file
      const attachDir = join(attachmentsBaseDir, "Smith-2024-123e4567");
      await mkdir(attachDir, { recursive: true });
      await writeFile(join(attachDir, "supplement.pdf"), "existing");

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        force: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.overwritten).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      mockLibrary.find = vi.fn().mockResolvedValue(null);

      const options: AddAttachmentOptions = {
        identifier: "NonExistent",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should return error when source file does not exist", async () => {
      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: "/nonexistent/file.pdf",
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|does not exist/i);
    });

    it("should return error when reference has no UUID", async () => {
      mockReference.custom = undefined;

      const options: AddAttachmentOptions = {
        identifier: "Smith-2024",
        filePath: sourceFile,
        role: "supplement",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await addAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/uuid/i);
    });
  });
});
