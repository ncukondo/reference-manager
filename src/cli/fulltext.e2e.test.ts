/**
 * End-to-end tests for fulltext commands
 * Tests actual CLI execution with file operations
 *
 * Note: Uses REFERENCE_MANAGER_FULLTEXT_DIR environment variable
 * to set the fulltext directory for testing in isolation.
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Fulltext Command E2E", () => {
  let testDir: string;
  let libraryPath: string;
  let fulltextDir: string;

  // Helper to run CLI with test fulltext directory
  const runWithFulltext = (args: string[], stdinData?: string) =>
    runCli(args, stdinData, fulltextDir);

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `fulltext-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create fulltext directory for testing
    fulltextDir = path.join(testDir, "fulltext");
    await fs.mkdir(fulltextDir, { recursive: true });

    // Create library with a reference
    libraryPath = path.join(testDir, "library.json");
    const library = [
      {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
      {
        id: "Jones-2023",
        type: "book",
        title: "Another Reference",
        author: [{ family: "Jones", given: "Jane" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "987e6543-e21b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), "utf-8");
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("fulltext attach", () => {
    it("should attach a PDF file to a reference", async () => {
      // Create a test PDF file
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content here", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Attached pdf:");

      // Verify the file was copied to fulltext directory
      const files = await fs.readdir(fulltextDir);
      expect(files.length).toBe(1);
      expect(files[0]).toContain("Smith-2024");
      expect(files[0]).toContain(".pdf");
    });

    it("should attach a Markdown file to a reference", async () => {
      const mdPath = path.join(testDir, "notes.md");
      await fs.writeFile(mdPath, "# Notes\n\nSome content", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        mdPath,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Attached markdown:");

      // Verify the file was copied
      const files = await fs.readdir(fulltextDir);
      expect(files.length).toBe(1);
      expect(files[0]).toContain(".md");
    });

    it("should attach with explicit --pdf flag", async () => {
      const filePath = path.join(testDir, "document.txt");
      await fs.writeFile(filePath, "Some content", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        "--pdf",
        filePath,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Attached pdf:");
    });

    it("should return error for non-existent reference", async () => {
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "NonExistent",
        pdfPath,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should return error for undetectable file type", async () => {
      const txtPath = path.join(testDir, "document.txt");
      await fs.writeFile(txtPath, "Some content", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        txtPath,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Cannot detect file type");
    });

    it("should move file with --move option", async () => {
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--move",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Attached pdf:");

      // Verify original file was moved (no longer exists)
      const exists = await fs
        .access(pdfPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it("should require confirmation when file already attached", async () => {
      // First attachment
      const pdf1 = path.join(testDir, "paper1.pdf");
      await fs.writeFile(pdf1, "First PDF", "utf-8");

      await runWithFulltext(["fulltext", "attach", "Smith-2024", pdf1, "--library", libraryPath]);

      // Second attachment without --force
      const pdf2 = path.join(testDir, "paper2.pdf");
      await fs.writeFile(pdf2, "Second PDF", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdf2,
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("already attached");
      expect(result.stderr).toContain("--force");
    });

    it("should overwrite with --force option", async () => {
      // First attachment
      const pdf1 = path.join(testDir, "paper1.pdf");
      await fs.writeFile(pdf1, "First PDF", "utf-8");

      await runWithFulltext(["fulltext", "attach", "Smith-2024", pdf1, "--library", libraryPath]);

      // Second attachment with --force
      const pdf2 = path.join(testDir, "paper2.pdf");
      await fs.writeFile(pdf2, "Second PDF", "utf-8");

      const result = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdf2,
        "--force",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("overwritten");
    });

    it("should attach from stdin with explicit type", async () => {
      const result = await runWithFulltext(
        ["fulltext", "attach", "Smith-2024", "--markdown", "--library", libraryPath],
        "# Notes from stdin"
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Attached markdown:");
    });
  });

  describe("fulltext get", () => {
    beforeEach(async () => {
      // Attach a PDF file first
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content here", "utf-8");

      await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);
    });

    it("should get file path for attached PDF", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--pdf",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("pdf:");
      expect(result.stdout).toContain(fulltextDir);
    });

    it("should get all attached file paths", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("pdf:");
    });

    it("should output content to stdout with --stdout", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--pdf",
        "--stdout",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("PDF content here");
    });

    it("should return error for non-existent reference", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "NonExistent",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should return error for reference without fulltext", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "Jones-2023",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No fulltext attached");
    });

    it("should return error for non-attached type", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--markdown",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No fulltext");
    });
  });

  describe("fulltext detach", () => {
    beforeEach(async () => {
      // Attach both PDF and Markdown files
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");
      await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);

      const mdPath = path.join(testDir, "notes.md");
      await fs.writeFile(mdPath, "# Notes", "utf-8");
      await runWithFulltext(["fulltext", "attach", "Smith-2024", mdPath, "--library", libraryPath]);
    });

    it("should detach PDF only", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "detach",
        "Smith-2024",
        "--pdf",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Detached pdf");

      // Verify file still exists on disk (not deleted)
      const files = await fs.readdir(fulltextDir);
      expect(files.length).toBe(2); // Both files still exist
    });

    it("should detach and delete with --delete option", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "detach",
        "Smith-2024",
        "--pdf",
        "--delete",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("deleted");

      // Verify PDF was deleted
      const files = await fs.readdir(fulltextDir);
      expect(files.length).toBe(1); // Only markdown remains
      expect(files[0]).toContain(".md");
    });

    it("should detach all attached files", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "detach",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Detached pdf");
      expect(result.stderr).toContain("Detached markdown");
    });

    it("should return error for non-existent reference", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "detach",
        "NonExistent",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should return error for reference without fulltext", async () => {
      const result = await runWithFulltext([
        "fulltext",
        "detach",
        "Jones-2023",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("No fulltext");
    });
  });

  describe("fulltext workflow", () => {
    it("should complete full attach-get-detach workflow", async () => {
      // 1. Attach a PDF
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF workflow test content", "utf-8");

      const attachResult = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);
      expect(attachResult.exitCode).toBe(0);

      // 2. Get the file path
      const getResult = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--pdf",
        "--library",
        libraryPath,
      ]);
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain("pdf:");

      // 3. Get content via stdout
      const contentResult = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--pdf",
        "--stdout",
        "--library",
        libraryPath,
      ]);
      expect(contentResult.exitCode).toBe(0);
      expect(contentResult.stdout).toBe("PDF workflow test content");

      // 4. Detach and delete
      const detachResult = await runWithFulltext([
        "fulltext",
        "detach",
        "Smith-2024",
        "--pdf",
        "--delete",
        "--library",
        libraryPath,
      ]);
      expect(detachResult.exitCode).toBe(0);

      // 5. Verify get now fails
      const getAfterResult = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);
      expect(getAfterResult.exitCode).toBe(1);
      expect(getAfterResult.stderr).toContain("No fulltext");
    });

    it("should attach both PDF and Markdown to same reference", async () => {
      // Attach PDF
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");
      const pdfResult = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);
      expect(pdfResult.exitCode).toBe(0);

      // Attach Markdown
      const mdPath = path.join(testDir, "notes.md");
      await fs.writeFile(mdPath, "# Notes", "utf-8");
      const mdResult = await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        mdPath,
        "--library",
        libraryPath,
      ]);
      expect(mdResult.exitCode).toBe(0);

      // Get both paths
      const getResult = await runWithFulltext([
        "fulltext",
        "get",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain("pdf:");
      expect(getResult.stdout).toContain("markdown:");
    });
  });

  describe("remove command integration", () => {
    it("should warn when removing reference with fulltext attached", async () => {
      // First attach a PDF
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");

      await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);

      // Try to remove without --force (non-TTY mode)
      const result = await runWithFulltext(["remove", "Smith-2024", "--library", libraryPath]);

      // Should require --force when fulltext attached in non-TTY
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("fulltext");
    });

    it("should remove reference and delete fulltext with --force", async () => {
      // First attach a PDF
      const pdfPath = path.join(testDir, "paper.pdf");
      await fs.writeFile(pdfPath, "PDF content", "utf-8");

      await runWithFulltext([
        "fulltext",
        "attach",
        "Smith-2024",
        pdfPath,
        "--library",
        libraryPath,
      ]);

      // Remove with --force
      const result = await runWithFulltext([
        "remove",
        "Smith-2024",
        "--force",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Removed");
      expect(result.stderr).toContain("Deleted fulltext");

      // Verify fulltext file was deleted
      const files = await fs.readdir(fulltextDir);
      expect(files.length).toBe(0);
    });
  });
});

const CLI_PATH = path.resolve("bin/reference-manager.js");

/**
 * Run CLI command with optional stdin input
 * @param args CLI arguments
 * @param stdinData Optional stdin input
 * @param fulltextDir Optional fulltext directory to use via environment variable
 */
function runCli(
  args: string[],
  stdinData?: string,
  fulltextDir?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Set fulltext directory via environment variable for testing
    const env = {
      ...process.env,
      NODE_ENV: "test",
      ...(fulltextDir && { REFERENCE_MANAGER_FULLTEXT_DIR: fulltextDir }),
    };

    const proc = spawn("node", [CLI_PATH, ...args], { env });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
      });
    });

    if (stdinData) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }
  });
}
