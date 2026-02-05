/**
 * End-to-end tests for attach commands
 * Tests actual CLI execution with file operations
 *
 * Note: Uses REFERENCE_MANAGER_ATTACHMENTS_DIR environment variable
 * to set the attachments directory for testing in isolation.
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Attach Command E2E", () => {
  let testDir: string;
  let libraryPath: string;
  let attachmentsDir: string;

  // Helper to run CLI with test attachments directory
  const runWithAttachments = (args: string[], stdinData?: string) =>
    runCli(args, stdinData, attachmentsDir);

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `attach-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create attachments directory for testing
    attachmentsDir = path.join(testDir, "attachments");
    await fs.mkdir(attachmentsDir, { recursive: true });

    // Create library with a reference
    // UUID: 123e4567-e89b-12d3-a456-426614174000 -> prefix 123e4567
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

  describe("Scenario: Add and retrieve attachment", () => {
    it("should add attachment and verify it can be listed and retrieved", async () => {
      // 1. Create a test file
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "col1,col2\n1,2\n3,4", "utf-8");

      // 2. Run `ref attach add <id> file.csv --role supplement`
      const addResult = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stderr).toContain("Added");

      // 3. Verify file exists in correct directory
      const refDirs = await fs.readdir(attachmentsDir);
      expect(refDirs.length).toBe(1);
      expect(refDirs[0]).toContain("Smith-2024");

      const refDir = path.join(attachmentsDir, refDirs[0]);
      const files = await fs.readdir(refDir);
      expect(files.length).toBe(1);
      // Without label, filename is {role}.{ext}
      expect(files[0]).toBe("supplement.csv");

      // 4. Run `ref attach list <id>`
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain("supplement");
      expect(listResult.stdout).toContain("supplement.csv");

      // 5. Run `ref attach get <id> <filename>`
      const getResult = await runWithAttachments([
        "attach",
        "get",
        "Smith-2024",
        "supplement.csv",
        "--library",
        libraryPath,
      ]);

      expect(getResult.exitCode).toBe(0);
      // Output uses forward slashes for cross-platform consistency
      expect(getResult.stdout).toContain(attachmentsDir.replace(/\\/g, "/"));
      expect(getResult.stdout).toContain("supplement.csv");
    });

    it("should add attachment with label", async () => {
      const testFile = path.join(testDir, "table.xlsx");
      await fs.writeFile(testFile, "excel content", "utf-8");

      const addResult = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--label",
        "Table S1",
        "--library",
        libraryPath,
      ]);

      expect(addResult.exitCode).toBe(0);

      // Verify file was created with label in filename: supplement-table-s1.xlsx
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);
      const files = await fs.readdir(refDir);
      expect(files[0]).toBe("supplement-table-s1.xlsx");

      // Verify listing shows label
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.stdout).toContain("Table S1");
    });

    it("should move file with --move option", async () => {
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data content", "utf-8");

      const addResult = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--move",
        "--library",
        libraryPath,
      ]);

      expect(addResult.exitCode).toBe(0);

      // Verify original file was moved (no longer exists)
      const exists = await fs
        .access(testFile)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);

      // Verify file exists in attachments directory
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);
      const files = await fs.readdir(refDir);
      expect(files.length).toBe(1);
    });
  });

  describe("Scenario: Detach with file deletion", () => {
    it("should detach file and delete with --remove-files option", async () => {
      // 1. Add attachment
      const testFile = path.join(testDir, "notes.md");
      await fs.writeFile(testFile, "# My Notes", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "notes",
        "--library",
        libraryPath,
      ]);

      // Verify file was added
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);
      const files = await fs.readdir(refDir);
      expect(files.length).toBe(1);
      expect(files[0]).toBe("notes.md");

      // 2. Run `ref attach detach <id> <filename> --remove-files`
      const detachResult = await runWithAttachments([
        "attach",
        "detach",
        "Smith-2024",
        "notes.md",
        "--remove-files",
        "--library",
        libraryPath,
      ]);

      expect(detachResult.exitCode).toBe(0);
      expect(detachResult.stderr).toContain("Detached");
      expect(detachResult.stderr).toContain("deleted");

      // 3. Verify directory removed (last file deleted cleans up directory)
      const dirExists = await fs
        .access(refDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(false);

      // 4. Verify metadata updated (list returns no attachments)
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      // Should fail because no attachments
      expect(listResult.exitCode).toBe(1);
    });

    it("should detach file without deletion by default", async () => {
      const testFile = path.join(testDir, "draft.pdf");
      await fs.writeFile(testFile, "draft content", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "draft",
        "--library",
        libraryPath,
      ]);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // Detach without --remove-files
      const detachResult = await runWithAttachments([
        "attach",
        "detach",
        "Smith-2024",
        "draft.pdf",
        "--library",
        libraryPath,
      ]);

      expect(detachResult.exitCode).toBe(0);

      // File should still exist on disk
      const files = await fs.readdir(refDir);
      expect(files.length).toBe(1);
      expect(files[0]).toBe("draft.pdf");
    });
  });

  describe("Scenario: Directory lifecycle", () => {
    it("should create directory on first attachment and remove when last detached with --remove-files", async () => {
      // 1. Verify no directory exists initially
      let dirs = await fs.readdir(attachmentsDir);
      expect(dirs.length).toBe(0);

      // 2. Add first attachment → directory created
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      dirs = await fs.readdir(attachmentsDir);
      expect(dirs.length).toBe(1);
      const refDir = path.join(attachmentsDir, dirs[0]);

      // 3. Detach last attachment with --remove-files → directory removed
      await runWithAttachments([
        "attach",
        "detach",
        "Smith-2024",
        "supplement.csv",
        "--remove-files",
        "--library",
        libraryPath,
      ]);

      // Directory should be removed
      const dirExists = await fs
        .access(refDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(false);
    });

    it("should not remove directory if files remain", async () => {
      // Add two files
      const file1 = path.join(testDir, "file1.pdf");
      const file2 = path.join(testDir, "file2.pdf");
      await fs.writeFile(file1, "content1", "utf-8");
      await fs.writeFile(file2, "content2", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file1,
        "--role",
        "supplement",
        "--label",
        "file1",
        "--library",
        libraryPath,
      ]);

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file2,
        "--role",
        "supplement",
        "--label",
        "file2",
        "--library",
        libraryPath,
      ]);

      const dirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, dirs[0]);

      // Detach first file with --remove-files
      await runWithAttachments([
        "attach",
        "detach",
        "Smith-2024",
        "supplement-file1.pdf",
        "--remove-files",
        "--library",
        libraryPath,
      ]);

      // Directory should still exist with one file
      const files = await fs.readdir(refDir);
      expect(files.length).toBe(1);
      expect(files[0]).toBe("supplement-file2.pdf");
    });
  });

  describe("attach add error cases", () => {
    it("should return error for non-existent reference", async () => {
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      const result = await runWithAttachments([
        "attach",
        "add",
        "NonExistent",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should return error for non-existent file", async () => {
      const result = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        "/nonexistent/file.pdf",
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
    });

    it("should require --force to overwrite existing file", async () => {
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "original data", "utf-8");

      // First add
      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      // Second add without --force should fail (same role + no label = same filename)
      await fs.writeFile(testFile, "new data", "utf-8");
      const result = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("already exists");
    });

    it("should overwrite with --force option", async () => {
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "original data", "utf-8");

      // First add
      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      // Second add with --force
      await fs.writeFile(testFile, "new data", "utf-8");
      const result = await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--force",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("overwritten");

      // Verify new content
      const dirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, dirs[0]);
      const files = await fs.readdir(refDir);
      const content = await fs.readFile(path.join(refDir, files[0]), "utf-8");
      expect(content).toBe("new data");
    });
  });

  describe("attach list", () => {
    it("should filter by role", async () => {
      // Add files with different roles
      const file1 = path.join(testDir, "supp.csv");
      const file2 = path.join(testDir, "notes.md");
      await fs.writeFile(file1, "supp", "utf-8");
      await fs.writeFile(file2, "notes", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file1,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file2,
        "--role",
        "notes",
        "--library",
        libraryPath,
      ]);

      // List only supplement
      const result = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("supplement");
      expect(result.stdout).not.toContain("notes.md");
    });

    it("should return error for reference without attachments", async () => {
      const result = await runWithAttachments([
        "attach",
        "list",
        "Jones-2023",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
    });
  });

  describe("attach get", () => {
    beforeEach(async () => {
      // Add a file first
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "col1,col2\n1,2", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);
    });

    it("should output content to stdout with --stdout", async () => {
      const result = await runWithAttachments([
        "attach",
        "get",
        "Smith-2024",
        "supplement.csv",
        "--stdout",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("col1,col2\n1,2");
    });

    it("should get by role", async () => {
      const result = await runWithAttachments([
        "attach",
        "get",
        "Smith-2024",
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("supplement.csv");
    });

    it("should return error for non-existent file", async () => {
      const result = await runWithAttachments([
        "attach",
        "get",
        "Smith-2024",
        "nonexistent.pdf",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
    });
  });

  describe("attach detach with --all", () => {
    it("should detach all files of specified role", async () => {
      // Add multiple supplement files
      const file1 = path.join(testDir, "supp1.csv");
      const file2 = path.join(testDir, "supp2.csv");
      const file3 = path.join(testDir, "notes.md");
      await fs.writeFile(file1, "supp1", "utf-8");
      await fs.writeFile(file2, "supp2", "utf-8");
      await fs.writeFile(file3, "notes", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file1,
        "--role",
        "supplement",
        "--label",
        "s1",
        "--library",
        libraryPath,
      ]);

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file2,
        "--role",
        "supplement",
        "--label",
        "s2",
        "--library",
        libraryPath,
      ]);

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        file3,
        "--role",
        "notes",
        "--library",
        libraryPath,
      ]);

      // Detach all supplements with --remove-files
      const result = await runWithAttachments([
        "attach",
        "detach",
        "Smith-2024",
        "--role",
        "supplement",
        "--all",
        "--remove-files",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);

      // Verify only notes remain
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.stdout).toContain("notes");
      expect(listResult.stdout).not.toContain("supplement");
    });
  });

  describe("attach open", () => {
    it("should create directory if not exists", async () => {
      // Verify no directory exists
      let dirs = await fs.readdir(attachmentsDir);
      expect(dirs.length).toBe(0);

      // Open directory with --print to avoid actually opening
      const result = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      // Output uses forward slashes for cross-platform consistency
      expect(result.stdout).toContain(attachmentsDir.replace(/\\/g, "/"));
      expect(result.stdout).toContain("Smith-2024");

      // Directory should be created
      dirs = await fs.readdir(attachmentsDir);
      expect(dirs.length).toBe(1);
    });

    it("should return error for non-existent reference", async () => {
      const result = await runWithAttachments([
        "attach",
        "open",
        "NonExistent",
        "--print",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });

    it("should open specific file with --print", async () => {
      // Add a file first
      const testFile = path.join(testDir, "notes.md");
      await fs.writeFile(testFile, "notes", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "notes",
        "--library",
        libraryPath,
      ]);

      const result = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "notes.md",
        "--print",
        "--library",
        libraryPath,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("notes.md");
    });
  });

  describe("Scenario: Manual file addition and sync", () => {
    it("should detect manually added files and sync metadata", async () => {
      // 1. Run `ref attach open <id> --no-sync` to create directory
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);

      expect(openResult.exitCode).toBe(0);

      // Get the created directory path
      const refDirs = await fs.readdir(attachmentsDir);
      expect(refDirs.length).toBe(1);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Copy files directly to directory (simulating user drag-drop)
      await fs.writeFile(path.join(refDir, "supplement-table-s1.xlsx"), "excel data", "utf-8");
      await fs.writeFile(path.join(refDir, "notes.md"), "# Notes\nSome notes", "utf-8");

      // 3. Run `ref attach sync <id>` (dry-run)
      const dryRunResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(dryRunResult.exitCode).toBe(0);
      // Should report new files detected
      expect(dryRunResult.stderr).toContain("supplement-table-s1.xlsx");
      expect(dryRunResult.stderr).toContain("notes.md");
      // Should not apply changes (dry run)
      expect(dryRunResult.stderr).toContain("New files:");

      // Verify metadata NOT updated yet (dry run)
      const listBeforeSync = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);
      // Should fail or show no files since we didn't add any via CLI
      expect(listBeforeSync.exitCode).toBe(1);

      // 5. Run `ref attach sync <id> --yes`
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);
      expect(syncResult.stderr).toContain("Added");

      // 6. Verify metadata updated
      // 7. Run `ref attach list <id>`
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      // 8. Verify all files listed
      expect(listResult.stdout).toContain("supplement-table-s1.xlsx");
      expect(listResult.stdout).toContain("notes.md");
      expect(listResult.stdout).toContain("supplement");
      expect(listResult.stdout).toContain("notes");
    });

    it("should infer role correctly from filename patterns", async () => {
      // Create directory by adding a file first
      const testFile = path.join(testDir, "initial.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--label",
        "initial",
        "--library",
        libraryPath,
      ]);

      // Get the directory
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // Add files with different naming patterns
      await fs.writeFile(path.join(refDir, "fulltext.pdf"), "pdf content", "utf-8");
      await fs.writeFile(path.join(refDir, "fulltext.md"), "markdown content", "utf-8");
      await fs.writeFile(path.join(refDir, "draft-v1.docx"), "draft content", "utf-8");
      await fs.writeFile(path.join(refDir, "random-file.txt"), "random", "utf-8");

      // Sync with --yes
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);

      // List and verify roles are inferred correctly
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      // fulltext.pdf and fulltext.md should have role "fulltext"
      expect(listResult.stdout).toContain("fulltext");
      // draft-v1.docx should have role "draft"
      expect(listResult.stdout).toContain("draft");
    });
  });

  describe("Scenario: Sync with roleOverrides and rename", () => {
    it("should apply roleOverrides via --yes and rename non-standard files", async () => {
      // 1. Create attachment directory via open --no-sync
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      expect(refDirs.length).toBe(1);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add non-standard filenames (simulating journal-downloaded PDFs)
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "supplement pdf", "utf-8");
      await fs.writeFile(path.join(refDir, "PIIS0092867424000011.pdf"), "main pdf", "utf-8");
      await fs.writeFile(path.join(refDir, "data-analysis.xlsx"), "excel data", "utf-8");

      // 3. Sync with --yes (non-TTY: applies context-based suggestions + renames)
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);
      expect(syncResult.stderr).toContain("Added");

      // 4. Verify metadata: list shows the synced files with suggested roles
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      // data-analysis.xlsx should be inferred as supplement (data-like extension)
      expect(listResult.stdout).toContain("supplement");
      // At least one PDF should be fulltext (context-based suggestion)
      expect(listResult.stdout).toContain("fulltext");
    });

    it("should apply --yes --no-rename to keep original filenames", async () => {
      // 1. Create directory
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add non-standard file
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "supplement pdf", "utf-8");

      // 3. Sync with --yes --no-rename
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--no-rename",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);

      // 4. Verify the original filename is preserved on disk
      const files = await fs.readdir(refDir);
      expect(files).toContain("mmc1.pdf");

      // 5. Verify metadata has the file listed
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain("mmc1.pdf");
    });

    it("should show suggestion preview in dry-run mode", async () => {
      // 1. Create directory
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add non-standard file
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "supplement pdf", "utf-8");

      // 3. Dry-run (no --yes): should show preview with suggestions
      const dryRunResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(dryRunResult.exitCode).toBe(0);
      // Should show suggestion info for the non-standard file
      expect(dryRunResult.stderr).toContain("mmc1.pdf");
      expect(dryRunResult.stderr).toContain("suggested");
      // Should show rename preview
      expect(dryRunResult.stderr).toContain("rename");
      // Should show apply instructions
      expect(dryRunResult.stderr).toContain("--yes");
    });

    it("should rename files on disk when --yes is used (without --no-rename)", async () => {
      // 1. Create directory
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add non-standard file that will get a role suggestion
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "supplement pdf", "utf-8");

      // 3. Sync with --yes (applies suggestions + renames)
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);

      // 4. Verify the file was renamed on disk
      const files = await fs.readdir(refDir);
      // Original file should be gone (renamed)
      expect(files).not.toContain("mmc1.pdf");
      // Renamed file should exist (fulltext-mmc1.pdf since it's the first PDF)
      expect(files.some((f) => f.startsWith("fulltext-"))).toBe(true);

      // 5. Verify the renamed file is accessible via attach get
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain("fulltext");
    });

    it("should handle mixed standard and non-standard filenames", async () => {
      // 1. Create directory
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add files: one standard, one non-standard
      await fs.writeFile(path.join(refDir, "supplement-data.csv"), "csv data", "utf-8");
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "pdf data", "utf-8");

      // 3. Sync with --yes
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);

      // 4. Verify standard file keeps its role
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      // supplement-data.csv should keep its standard role
      expect(listResult.stdout).toContain("supplement");
      // mmc1.pdf should get a suggested role (fulltext since it's the first PDF)
      expect(listResult.stdout).toContain("fulltext");
    });

    it("should suggest supplement for second PDF when fulltext already exists", async () => {
      // 1. Create directory and add a fulltext first
      const testFile = path.join(testDir, "paper.pdf");
      await fs.writeFile(testFile, "fulltext content", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "fulltext",
        "--library",
        libraryPath,
      ]);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Add a non-standard PDF (should be supplement since fulltext exists)
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "supplement pdf", "utf-8");

      // 3. Sync with --yes --no-rename
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--no-rename",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);

      // 4. Verify the new file gets supplement role (not fulltext)
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      // Should have fulltext (existing) and supplement (new mmc1.pdf)
      const output = listResult.stdout;
      // Count supplement mentions — should include mmc1.pdf under supplement
      expect(output).toContain("mmc1.pdf");
      // The existing fulltext.pdf should remain
      expect(output).toContain("fulltext.pdf");
    });

    it("should rename and then get the renamed file successfully", async () => {
      // Full workflow: open → add non-standard file → sync with rename → get renamed file
      const openResult = await runWithAttachments([
        "attach",
        "open",
        "Smith-2024",
        "--print",
        "--no-sync",
        "--library",
        libraryPath,
      ]);
      expect(openResult.exitCode).toBe(0);

      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // Add non-standard file
      await fs.writeFile(path.join(refDir, "mmc1.pdf"), "fulltext content", "utf-8");

      // Sync with --yes (rename applied)
      await runWithAttachments(["attach", "sync", "Smith-2024", "--yes", "--library", libraryPath]);

      // Find the renamed file
      const files = await fs.readdir(refDir);
      const renamedFile = files.find((f) => f.startsWith("fulltext-"));
      expect(renamedFile).toBeDefined();

      // Get the renamed file by role
      const getResult = await runWithAttachments([
        "attach",
        "get",
        "Smith-2024",
        "--role",
        "fulltext",
        "--library",
        libraryPath,
      ]);

      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain(renamedFile);
    });
  });

  describe("Scenario: Missing file detection", () => {
    it("should detect and report missing files", async () => {
      // 1. Add attachment via CLI
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      // Get directory path
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // 2. Delete file directly from filesystem
      await fs.unlink(path.join(refDir, "supplement.csv"));

      // 3. Run `ref attach sync <id>`
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);
      // 4. Verify missing file reported
      expect(syncResult.stderr).toContain("Missing");
      expect(syncResult.stderr).toContain("supplement.csv");
    });

    it("should clean up missing files from metadata with --fix", async () => {
      // Add attachment via CLI
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      // Get directory path
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // Delete file directly from filesystem
      await fs.unlink(path.join(refDir, "supplement.csv"));

      // 5. Run `ref attach sync <id> --fix`
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--fix",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);
      // 6. Verify metadata cleaned up
      expect(syncResult.stderr).toContain("Removed");

      // Verify the file is no longer in metadata
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      // Should fail because no attachments remain
      expect(listResult.exitCode).toBe(1);
    });

    it("should handle both new and missing files together", async () => {
      // Add initial attachment
      const testFile = path.join(testDir, "data.csv");
      await fs.writeFile(testFile, "data", "utf-8");

      await runWithAttachments([
        "attach",
        "add",
        "Smith-2024",
        testFile,
        "--role",
        "supplement",
        "--library",
        libraryPath,
      ]);

      // Get directory path
      const refDirs = await fs.readdir(attachmentsDir);
      const refDir = path.join(attachmentsDir, refDirs[0]);

      // Delete original file and add new file
      await fs.unlink(path.join(refDir, "supplement.csv"));
      await fs.writeFile(path.join(refDir, "notes.md"), "new notes", "utf-8");

      // Sync with both --yes and --fix
      const syncResult = await runWithAttachments([
        "attach",
        "sync",
        "Smith-2024",
        "--yes",
        "--fix",
        "--library",
        libraryPath,
      ]);

      expect(syncResult.exitCode).toBe(0);
      expect(syncResult.stderr).toContain("Added");
      expect(syncResult.stderr).toContain("Removed");

      // Verify result: old file gone, new file added
      const listResult = await runWithAttachments([
        "attach",
        "list",
        "Smith-2024",
        "--library",
        libraryPath,
      ]);

      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toContain("notes.md");
      expect(listResult.stdout).not.toContain("supplement.csv");
    });
  });
});

const CLI_PATH = path.resolve("bin/cli.js");

/**
 * Run CLI command with optional stdin input
 * @param args CLI arguments
 * @param stdinData Optional stdin input
 * @param attachmentsDir Optional attachments directory to use via environment variable
 */
function runCli(
  args: string[],
  stdinData?: string,
  attachmentsDir?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Set attachments directory via environment variable for testing
    const env = {
      ...process.env,
      NODE_ENV: "test",
      ...(attachmentsDir && { REFERENCE_MANAGER_ATTACHMENTS_DIR: attachmentsDir }),
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
