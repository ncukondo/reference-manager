/**
 * Tests for attachment sync operation
 */

import { access, mkdir, rm, writeFile } from "node:fs/promises";
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

  describe("roleOverrides", () => {
    it("should apply role overrides when yes=true", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement", label: "table-s1" },
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "mmc1.pdf",
          role: "supplement",
          label: "table-s1",
        })
      );
    });

    it("should override only specific files, others keep inferred role", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");
      await writeFile(join(attachDir, "notes-reading.md"), "Notes content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      // mmc1.pdf should have overridden role
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "mmc1.pdf",
          role: "supplement",
        })
      );
      // notes-reading.md should keep inferred role
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "notes-reading.md",
          role: "notes",
          label: "reading",
        })
      );
    });

    it("should ignore overrides in dry-run mode", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);
      expect(mockLibrary.update).not.toHaveBeenCalled();
    });

    it("should gracefully ignore overrides for non-existent filenames", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "nonexistent.pdf": { role: "fulltext" },
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);
      // mmc1.pdf should keep its inferred role (other)
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "mmc1.pdf",
          role: "other",
        })
      );
    });

    it("should apply override with role only (no label)", async () => {
      await writeFile(join(attachDir, "PIIS0092867424000011.pdf"), "Paper content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "PIIS0092867424000011.pdf": { role: "fulltext" },
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      const file = updatedItem?.custom?.attachments?.files?.find(
        (f: { filename: string }) => f.filename === "PIIS0092867424000011.pdf"
      );
      expect(file).toBeDefined();
      expect(file?.role).toBe("fulltext");
      expect(file?.label).toBeUndefined();
    });
  });

  describe("renames", () => {
    it("should rename file on disk and update metadata when renames provided", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
        },
        renames: {
          "mmc1.pdf": "supplement-mmc1.pdf",
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);

      // Verify file was renamed on disk
      await expect(access(join(attachDir, "supplement-mmc1.pdf"))).resolves.toBeUndefined();
      await expect(access(join(attachDir, "mmc1.pdf"))).rejects.toThrow();

      // Verify metadata uses the new filename
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "supplement-mmc1.pdf",
          role: "supplement",
        })
      );
    });

    it("should skip rename when target file already exists (conflict)", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");
      await writeFile(join(attachDir, "supplement-mmc1.pdf"), "Existing file");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
        },
        renames: {
          "mmc1.pdf": "supplement-mmc1.pdf",
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);

      // Both files still exist on disk (rename was skipped)
      await expect(access(join(attachDir, "mmc1.pdf"))).resolves.toBeUndefined();
      await expect(access(join(attachDir, "supplement-mmc1.pdf"))).resolves.toBeUndefined();

      // Metadata should use the original filename (rename was skipped)
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "mmc1.pdf",
          role: "supplement",
        })
      );
    });

    it("should keep original filename in metadata when no renames provided", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
        },
        // No renames — equivalent to --no-rename
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(true);

      // File should not be renamed
      await expect(access(join(attachDir, "mmc1.pdf"))).resolves.toBeUndefined();

      // Metadata should use the original filename
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({
          filename: "mmc1.pdf",
          role: "supplement",
        })
      );
    });

    it("should rename multiple files in a single sync", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Content 1");
      await writeFile(join(attachDir, "PIIS123.pdf"), "Content 2");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory: attachmentsBaseDir,
        roleOverrides: {
          "mmc1.pdf": { role: "supplement" },
          "PIIS123.pdf": { role: "fulltext" },
        },
        renames: {
          "mmc1.pdf": "supplement-mmc1.pdf",
          "PIIS123.pdf": "fulltext-PIIS123.pdf",
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);

      // Verify both files renamed on disk
      await expect(access(join(attachDir, "supplement-mmc1.pdf"))).resolves.toBeUndefined();
      await expect(access(join(attachDir, "fulltext-PIIS123.pdf"))).resolves.toBeUndefined();

      // Verify metadata
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({ filename: "supplement-mmc1.pdf", role: "supplement" })
      );
      expect(updatedItem?.custom?.attachments?.files).toContainEqual(
        expect.objectContaining({ filename: "fulltext-PIIS123.pdf", role: "fulltext" })
      );
    });

    it("should not rename files in dry-run mode", async () => {
      await writeFile(join(attachDir, "mmc1.pdf"), "Supplement content");

      const options: SyncAttachmentOptions = {
        identifier: "Smith-2024",
        // no yes: true — dry-run
        attachmentsDirectory: attachmentsBaseDir,
        renames: {
          "mmc1.pdf": "supplement-mmc1.pdf",
        },
      };

      const result = await syncAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.applied).toBe(false);

      // File should not be renamed
      await expect(access(join(attachDir, "mmc1.pdf"))).resolves.toBeUndefined();
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
