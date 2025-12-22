import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { FulltextIOError, FulltextManager, FulltextNotAttachedError } from "./manager.js";

describe("FulltextManager", () => {
  let testDir: string;
  let fulltextDir: string;
  let sourceDir: string;
  let manager: FulltextManager;

  const createTestItem = (overrides?: Partial<CslItem>): CslItem => ({
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
    ...overrides,
  });

  beforeEach(() => {
    // Create unique test directories
    const uniqueId = randomUUID().slice(0, 8);
    testDir = join(tmpdir(), `refman-test-${uniqueId}`);
    fulltextDir = join(testDir, "fulltext");
    sourceDir = join(testDir, "source");

    mkdirSync(sourceDir, { recursive: true });
    manager = new FulltextManager(fulltextDir);
  });

  afterEach(() => {
    // Clean up test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("ensureDirectory", () => {
    it("creates directory if it does not exist", async () => {
      expect(existsSync(fulltextDir)).toBe(false);
      await manager.ensureDirectory();
      expect(existsSync(fulltextDir)).toBe(true);
    });

    it("succeeds if directory already exists", async () => {
      mkdirSync(fulltextDir, { recursive: true });
      await expect(manager.ensureDirectory()).resolves.not.toThrow();
      expect(existsSync(fulltextDir)).toBe(true);
    });
  });

  describe("attachFile", () => {
    const createSourceFile = (name: string, content: string): string => {
      const path = join(sourceDir, name);
      writeFileSync(path, content);
      return path;
    };

    describe("copy mode (default)", () => {
      it("copies PDF file to fulltext directory", async () => {
        const sourcePath = createSourceFile("paper.pdf", "PDF content");
        const item = createTestItem();

        const result = await manager.attachFile(item, sourcePath, "pdf");

        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(existsSync(join(fulltextDir, result.filename))).toBe(true);
        // Source file should still exist (copy mode)
        expect(existsSync(sourcePath)).toBe(true);
      });

      it("copies Markdown file to fulltext directory", async () => {
        const sourcePath = createSourceFile("notes.md", "# Notes");
        const item = createTestItem();

        const result = await manager.attachFile(item, sourcePath, "markdown");

        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.md");
        expect(existsSync(join(fulltextDir, result.filename))).toBe(true);
        expect(existsSync(sourcePath)).toBe(true);
      });

      it("includes PMID in filename when available", async () => {
        const sourcePath = createSourceFile("paper.pdf", "PDF content");
        const item = createTestItem({ PMID: "12345678" });

        const result = await manager.attachFile(item, sourcePath, "pdf");

        expect(result.filename).toBe(
          "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf"
        );
      });
    });

    describe("move mode", () => {
      it("moves file instead of copying when move option is true", async () => {
        const sourcePath = createSourceFile("paper.pdf", "PDF content");
        const item = createTestItem();

        const result = await manager.attachFile(item, sourcePath, "pdf", {
          move: true,
        });

        expect(existsSync(join(fulltextDir, result.filename))).toBe(true);
        // Source file should be deleted (move mode)
        expect(existsSync(sourcePath)).toBe(false);
      });
    });

    describe("overwrite behavior", () => {
      it("returns existingFile when file already attached", async () => {
        const sourcePath = createSourceFile("paper.pdf", "Original content");
        const item = createTestItem({
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
            },
          },
        });

        // Create existing file
        await manager.ensureDirectory();
        writeFileSync(
          join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf"),
          "Existing content"
        );

        const result = await manager.attachFile(item, sourcePath, "pdf");

        expect(result.existingFile).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(result.overwritten).toBe(false);
      });

      it("overwrites existing file when force option is true", async () => {
        const sourcePath = createSourceFile("paper.pdf", "New content");
        const item = createTestItem({
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
            },
          },
        });

        // Create existing file
        await manager.ensureDirectory();
        const existingPath = join(
          fulltextDir,
          "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf"
        );
        writeFileSync(existingPath, "Existing content");

        const result = await manager.attachFile(item, sourcePath, "pdf", {
          force: true,
        });

        expect(result.overwritten).toBe(true);
        // New file should have same name (id and PMID unchanged)
        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(readFileSync(existingPath, "utf8")).toBe("New content");
      });

      it("generates new filename and deletes old file when force with changed id", async () => {
        const sourcePath = createSourceFile("paper.pdf", "New content");
        // Item with different id than what was used for old filename
        const item = createTestItem({
          id: "Smith-2024a", // Changed from Smith-2024
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf", // Old filename
            },
          },
        });

        // Create existing file with old name
        await manager.ensureDirectory();
        const oldPath = join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        writeFileSync(oldPath, "Existing content");

        const result = await manager.attachFile(item, sourcePath, "pdf", {
          force: true,
        });

        // New filename should reflect new id
        expect(result.filename).toBe("Smith-2024a-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(result.overwritten).toBe(true);
        expect(result.deletedOldFile).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        // Old file should be deleted
        expect(existsSync(oldPath)).toBe(false);
        // New file should exist
        expect(
          existsSync(join(fulltextDir, "Smith-2024a-123e4567-e89b-12d3-a456-426614174000.pdf"))
        ).toBe(true);
      });

      it("generates new filename and deletes old file when force with added PMID", async () => {
        const sourcePath = createSourceFile("paper.pdf", "New content");
        const item = createTestItem({
          PMID: "12345678", // PMID added
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf", // Old filename without PMID
            },
          },
        });

        // Create existing file with old name
        await manager.ensureDirectory();
        const oldPath = join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        writeFileSync(oldPath, "Existing content");

        const result = await manager.attachFile(item, sourcePath, "pdf", {
          force: true,
        });

        // New filename should include PMID
        expect(result.filename).toBe(
          "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf"
        );
        expect(result.overwritten).toBe(true);
        expect(result.deletedOldFile).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        // Old file should be deleted
        expect(existsSync(oldPath)).toBe(false);
        // New file should exist
        expect(
          existsSync(
            join(fulltextDir, "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf")
          )
        ).toBe(true);
      });
    });

    describe("error cases", () => {
      it("throws error if source file does not exist", async () => {
        const item = createTestItem();

        await expect(manager.attachFile(item, "/nonexistent/file.pdf", "pdf")).rejects.toThrow(
          FulltextIOError
        );
      });

      it("throws error if custom.uuid is missing", async () => {
        const sourcePath = createSourceFile("paper.pdf", "PDF content");
        const item: CslItem = {
          id: "Smith-2024",
          type: "article-journal",
        };

        await expect(manager.attachFile(item, sourcePath, "pdf")).rejects.toThrow("Missing uuid");
      });
    });
  });

  describe("getFilePath", () => {
    it("returns full path for attached PDF", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
          },
        },
      });

      const path = manager.getFilePath(item, "pdf");

      expect(path).toBe(join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf"));
    });

    it("returns full path for attached Markdown", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            markdown: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.md",
          },
        },
      });

      const path = manager.getFilePath(item, "markdown");

      expect(path).toBe(join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.md"));
    });

    it("returns null if fulltext not attached", () => {
      const item = createTestItem();

      const pdfPath = manager.getFilePath(item, "pdf");
      const mdPath = manager.getFilePath(item, "markdown");

      expect(pdfPath).toBeNull();
      expect(mdPath).toBeNull();
    });

    it("returns null if custom field is missing", () => {
      const item: CslItem = {
        id: "Smith-2024",
        type: "article-journal",
      };

      const path = manager.getFilePath(item, "pdf");

      expect(path).toBeNull();
    });
  });

  describe("detachFile", () => {
    describe("metadata only (default)", () => {
      it("returns filename for detachment", async () => {
        const item = createTestItem({
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
            },
          },
        });

        // Create the actual file
        await manager.ensureDirectory();
        const filePath = join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        writeFileSync(filePath, "PDF content");

        const result = await manager.detachFile(item, "pdf");

        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(result.deleted).toBe(false);
        // File should still exist (metadata-only detach)
        expect(existsSync(filePath)).toBe(true);
      });

      it("throws FulltextNotAttachedError if type not attached", async () => {
        const item = createTestItem();

        await expect(manager.detachFile(item, "pdf")).rejects.toThrow(FulltextNotAttachedError);
      });
    });

    describe("with delete option", () => {
      it("deletes file when delete option is true", async () => {
        const item = createTestItem({
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
            },
          },
        });

        // Create the actual file
        await manager.ensureDirectory();
        const filePath = join(fulltextDir, "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        writeFileSync(filePath, "PDF content");

        const result = await manager.detachFile(item, "pdf", { delete: true });

        expect(result.deleted).toBe(true);
        expect(existsSync(filePath)).toBe(false);
      });

      it("succeeds even if file does not exist on disk", async () => {
        const item = createTestItem({
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            fulltext: {
              pdf: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
            },
          },
        });

        // Don't create the file - simulating orphaned metadata

        const result = await manager.detachFile(item, "pdf", { delete: true });

        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        // deleted should still be true as we attempted deletion
        expect(result.deleted).toBe(true);
      });
    });
  });

  describe("getAttachedTypes", () => {
    it("returns empty array if no fulltext attached", () => {
      const item = createTestItem();

      const types = manager.getAttachedTypes(item);

      expect(types).toEqual([]);
    });

    it("returns ['pdf'] if only PDF attached", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "file.pdf",
          },
        },
      });

      const types = manager.getAttachedTypes(item);

      expect(types).toEqual(["pdf"]);
    });

    it("returns ['markdown'] if only Markdown attached", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            markdown: "file.md",
          },
        },
      });

      const types = manager.getAttachedTypes(item);

      expect(types).toEqual(["markdown"]);
    });

    it("returns ['pdf', 'markdown'] if both attached", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "file.pdf",
            markdown: "file.md",
          },
        },
      });

      const types = manager.getAttachedTypes(item);

      expect(types).toEqual(["pdf", "markdown"]);
    });
  });

  describe("hasAttachment", () => {
    it("returns false if no fulltext attached", () => {
      const item = createTestItem();

      expect(manager.hasAttachment(item)).toBe(false);
      expect(manager.hasAttachment(item, "pdf")).toBe(false);
      expect(manager.hasAttachment(item, "markdown")).toBe(false);
    });

    it("returns true if any fulltext attached (no type specified)", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "file.pdf",
          },
        },
      });

      expect(manager.hasAttachment(item)).toBe(true);
    });

    it("returns true/false based on specific type", () => {
      const item = createTestItem({
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: {
            pdf: "file.pdf",
          },
        },
      });

      expect(manager.hasAttachment(item, "pdf")).toBe(true);
      expect(manager.hasAttachment(item, "markdown")).toBe(false);
    });
  });
});
