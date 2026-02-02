/**
 * Tests for attachment sync operation
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import {
  type InferredFile,
  type SyncAttachmentOptions,
  suggestRoleFromContext,
  syncAttachments,
} from "./sync.js";

describe("syncAttachments", () => {
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
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
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

  describe("detect new files", () => {
    it("should detect new files in directory", async () => {
      // Add new file to directory
      await writeFile(join(attachDir, "notes.md"), "Notes content");
      await writeFile(join(attachDir, "supplement-data.csv"), "CSV content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.newFiles).toHaveLength(2);
      expect(result.newFiles).toContainEqual(
        expect.objectContaining({ filename: "notes.md", role: "notes" })
      );
      expect(result.newFiles).toContainEqual(
        expect.objectContaining({
          filename: "supplement-data.csv",
          role: "supplement",
          label: "data",
        })
      );
      expect(result.applied).toBe(false);
    });
  });

  describe("infer role from filename", () => {
    it("should infer fulltext role", async () => {
      await writeFile(join(attachDir, "fulltext.md"), "Markdown content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.newFiles).toContainEqual(
        expect.objectContaining({ filename: "fulltext.md", role: "fulltext" })
      );
    });

    it("should infer supplement role with label", async () => {
      await writeFile(join(attachDir, "supplement-table-s1.xlsx"), "Excel content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.newFiles).toContainEqual(
        expect.objectContaining({
          filename: "supplement-table-s1.xlsx",
          role: "supplement",
          label: "table-s1",
        })
      );
    });

    it("should infer notes role with label", async () => {
      await writeFile(join(attachDir, "notes-reading.md"), "Reading notes");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.newFiles).toContainEqual(
        expect.objectContaining({
          filename: "notes-reading.md",
          role: "notes",
          label: "reading",
        })
      );
    });

    it("should infer draft role", async () => {
      await writeFile(join(attachDir, "draft-v1.pdf"), "Draft content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.newFiles).toContainEqual(
        expect.objectContaining({
          filename: "draft-v1.pdf",
          role: "draft",
          label: "v1",
        })
      );
    });

    it("should use 'other' role for unknown patterns", async () => {
      await writeFile(join(attachDir, "random-file.txt"), "Random content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.newFiles).toContainEqual(
        expect.objectContaining({
          filename: "random-file.txt",
          role: "other",
          label: "random-file",
        })
      );
    });
  });

  describe("detect missing files", () => {
    it("should detect files in metadata but not on disk", async () => {
      // Reference has file in metadata that doesn't exist on disk
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "missing.pdf", role: "supplement" },
          ],
        },
      };

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.missingFiles).toEqual(["missing.pdf"]);
    });
  });

  describe("apply changes with --yes", () => {
    it("should add new files to metadata when yes=true", async () => {
      await writeFile(join(attachDir, "notes.md"), "Notes content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalled();
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({ filename: "notes.md", role: "notes" })
      );
    });

    it("should not call update when dry-run", async () => {
      await writeFile(join(attachDir, "notes.md"), "Notes content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
      expect(mockLibrary.update).not.toHaveBeenCalled();
    });
  });

  describe("remove missing with --fix", () => {
    it("should remove missing files from metadata when fix=true", async () => {
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "missing.pdf", role: "supplement" },
          ],
        },
      };

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        fix: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(1);
      expect(updatedItem?.custom?.attachments?.files).not.toContainEqual(
        expect.objectContaining({ filename: "missing.pdf" })
      );
    });

    it("should apply both new and fix when both flags set", async () => {
      await writeFile(join(attachDir, "notes.md"), "Notes content");
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "missing.pdf", role: "supplement" },
          ],
        },
      };

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        fix: true,
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      // Should have fulltext.pdf + notes.md (missing.pdf removed)
      expect(updatedItem?.custom?.attachments?.files).toHaveLength(2);
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({ filename: "fulltext.pdf" })
      );
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({ filename: "notes.md" })
      );
    });
  });

  describe("no changes", () => {
    it("should report no changes when in sync", async () => {
      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.newFiles).toHaveLength(0);
      expect(result.missingFiles).toHaveLength(0);
      expect(result.applied).toBe(false);
    });
  });

  describe("suggestRoleFromContext", () => {
    it("should suggest fulltext for .pdf when no fulltext exists", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("paper.pdf", existingFiles)).toBe("fulltext");
    });

    it("should suggest fulltext for .md when no fulltext exists", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("paper.md", existingFiles)).toBe("fulltext");
    });

    it("should suggest supplement for .pdf when fulltext already exists", () => {
      const existingFiles: InferredFile[] = [{ filename: "fulltext.pdf", role: "fulltext" }];
      expect(suggestRoleFromContext("mmc1.pdf", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for .md when fulltext already exists", () => {
      const existingFiles: InferredFile[] = [{ filename: "fulltext.md", role: "fulltext" }];
      expect(suggestRoleFromContext("readme.md", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for data-like extensions (.xlsx)", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("data.xlsx", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for data-like extensions (.csv)", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("data.csv", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for data-like extensions (.tsv)", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("data.tsv", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for data-like extensions (.zip)", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("archive.zip", existingFiles)).toBe("supplement");
    });

    it("should suggest supplement for data-like extensions (.tar.gz)", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("archive.tar.gz", existingFiles)).toBe("supplement");
    });

    it("should return null for unknown extensions", () => {
      const existingFiles: InferredFile[] = [];
      expect(suggestRoleFromContext("readme.txt", existingFiles)).toBeNull();
    });

    it("should consider fulltext from existing files (not just metadata)", () => {
      const existingFiles: InferredFile[] = [
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "notes.md", role: "notes" },
      ];
      expect(suggestRoleFromContext("another.pdf", existingFiles)).toBe("supplement");
    });

    it("should handle multiple existing fulltext files", () => {
      const existingFiles: InferredFile[] = [
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "fulltext.md", role: "fulltext" },
      ];
      expect(suggestRoleFromContext("extra.pdf", existingFiles)).toBe("supplement");
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      mockLibrary.find = vi.fn().mockResolvedValue(null);

      const options: SyncAttachmentOptions = {
        identifier: "NonExistent",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should return error when no attachments exist", async () => {
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
      };

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no attachments/i);
    });

    it("should return error when directory does not exist", async () => {
      mockReference.custom = {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        attachments: {
          directory: "nonexistent-dir",
          files: [],
        },
      };

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/directory.*not.*exist/i);
    });
  });
});
