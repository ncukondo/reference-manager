/**
 * Tests for attachment get operation
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { type GetAttachmentOptions, getAttachment } from "./get.js";

// Helper to normalize paths (output uses forward slashes)
const normalizePath = (p: string) => p.replace(/\\/g, "/");

describe("getAttachment", () => {
  let tempDir: string;
  let attachmentsBaseDir: string;
  let mockLibrary: ILibrary;

  const baseReference: CslItem = {
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
        ],
      },
    },
  };

  beforeEach(async () => {
    tempDir = join(tmpdir(), `refmgr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    attachmentsBaseDir = join(tempDir, "attachments");

    // Create attachment directory with files
    const attachDir = join(attachmentsBaseDir, "Smith-2024-123e4567");
    await mkdir(attachDir, { recursive: true });
    await writeFile(join(attachDir, "fulltext.pdf"), "PDF content");
    await writeFile(join(attachDir, "supplement-table-s1.xlsx"), "Excel content");

    mockLibrary = {
      find: vi.fn().mockResolvedValue(baseReference),
      update: vi.fn(),
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

  describe("get file path", () => {
    it("should return file path for existing attachment", async () => {
      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toBe(
        normalizePath(join(attachmentsBaseDir, "Smith-2024-123e4567", "fulltext.pdf"))
      );
    });

    it("should return error when file not in metadata", async () => {
      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "nonexistent.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it("should return error when reference not found", async () => {
      mockLibrary.find = vi.fn().mockResolvedValue(null);

      const options: GetAttachmentOptions = {
        identifier: "NonExistent",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });

  describe("get file content (stdout)", () => {
    it("should return file content when stdout=true", async () => {
      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
        stdout: true,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.content).toBeInstanceOf(Buffer);
      expect(result.content?.toString()).toBe("PDF content");
    });

    it("should return error when file does not exist on disk", async () => {
      // Remove the file from disk but keep in metadata
      await rm(join(attachmentsBaseDir, "Smith-2024-123e4567", "fulltext.pdf"));

      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory: attachmentsBaseDir,
        stdout: true,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|does not exist/i);
    });
  });

  describe("get by role", () => {
    it("should return first file matching role", async () => {
      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        role: "fulltext",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.path).toContain("fulltext.pdf");
    });

    it("should return error when no file matches role", async () => {
      const options: GetAttachmentOptions = {
        identifier: "Smith-2024",
        role: "notes",
        attachmentsDirectory: attachmentsBaseDir,
      };

      const result = await getAttachment(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no.*notes/i);
    });
  });
});
