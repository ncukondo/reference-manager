/**
 * End-to-end tests for add command
 * Tests actual CLI execution with stdin handling
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Add Command E2E", () => {
  let testDir: string;
  let libraryPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `add-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create empty library
    libraryPath = path.join(testDir, "library.json");
    await fs.writeFile(libraryPath, "[]", "utf-8");
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("stdin handling", () => {
    it("should read JSON from stdin", async () => {
      const jsonData = JSON.stringify([
        { id: "stdin1", type: "article-journal", title: "From Stdin" },
      ]);

      const result = await runCli(["add", "--library", libraryPath], jsonData);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("From Stdin");
    });

    it("should read multiple references from stdin", async () => {
      const jsonData = JSON.stringify([
        { id: "stdin1", type: "article-journal", title: "First Stdin" },
        { id: "stdin2", type: "book", title: "Second Stdin" },
      ]);

      const result = await runCli(["add", "--library", libraryPath], jsonData);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 2 reference");
    });

    it("should read BibTeX from stdin with explicit format", async () => {
      const bibtexData = `@article{bibtex2024,
  title = {BibTeX from Stdin},
  year = {2024}
}`;

      const result = await runCli(
        ["add", "--library", libraryPath, "--format", "bibtex"],
        bibtexData
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("BibTeX from Stdin");
    });

    it("should read RIS from stdin with explicit format", async () => {
      const risData = `TY  - JOUR
TI  - RIS from Stdin
PY  - 2024
ER  - `;

      const result = await runCli(["add", "--library", libraryPath, "--format", "ris"], risData);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("RIS from Stdin");
    });
  });

  describe("file import via CLI", () => {
    it("should import from JSON file", async () => {
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([{ id: "file1", type: "article-journal", title: "From File" }]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, jsonPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("From File");
    });

    it("should import from BibTeX file", async () => {
      const bibPath = path.join(testDir, "refs.bib");
      await fs.writeFile(
        bibPath,
        `@article{bib2024,
  title = {BibTeX Article},
  year = {2024}
}`,
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, bibPath]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("BibTeX Article");
    });

    it("should import from multiple files", async () => {
      const file1 = path.join(testDir, "file1.json");
      const file2 = path.join(testDir, "file2.json");

      await fs.writeFile(
        file1,
        JSON.stringify([{ id: "f1", type: "article-journal", title: "First File" }]),
        "utf-8"
      );
      await fs.writeFile(
        file2,
        JSON.stringify([{ id: "f2", type: "book", title: "Second File" }]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, file1, file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 2 reference");
    });
  });


  describe("identifier input via CLI", () => {
    it("should recognize ISBN identifier with prefix", async () => {
      // Use a well-known ISBN that should resolve
      const result = await runCli([
        "add",
        "--library",
        libraryPath,
        "ISBN:9780596517748",
      ]);

      // Should attempt to fetch (may succeed or fail depending on network/API)
      // The key is that it should NOT show "not a valid PMID or DOI" error
      expect(result.stderr).not.toContain("not a valid PMID or DOI");
      expect(result.stderr).not.toContain("not a valid PMID, DOI, or ISBN");
    });

    it("should recognize ISBN-13 without prefix", async () => {
      const result = await runCli([
        "add",
        "--library",
        libraryPath,
        "9780596517748",
      ]);

      expect(result.stderr).not.toContain("not a valid PMID or DOI");
      expect(result.stderr).not.toContain("not a valid PMID, DOI, or ISBN");
    });

    it("should show updated error message for invalid identifier", async () => {
      const result = await runCli([
        "add",
        "--library",
        libraryPath,
        "invalid-identifier-12345",
      ]);

      // Should show the updated error message that includes ISBN (truncated in non-verbose mode)
      // Old message was "not a valid PMID or DOI", new message starts with "not a valid PMID,"
      expect(result.stderr).not.toContain("not a valid PMID or DOI");
      expect(result.stderr).toContain("not a valid PMID,");
    });
  });

  describe("exit codes", () => {
    it("should return exit code 0 on success", async () => {
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([{ id: "success1", type: "article-journal", title: "Success" }]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, jsonPath]);

      expect(result.exitCode).toBe(0);
    });

    it("should return exit code 1 when all inputs fail", async () => {
      // Non-existent file that looks like an identifier but isn't valid
      const result = await runCli(["add", "--library", libraryPath, "invalid-identifier"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Failed");
    });

    it("should return exit code 0 for empty input (no stdin, no files)", async () => {
      // Use runCli with empty stdin to test no-input case
      const result = await runCli(["add", "--library", libraryPath], "");

      // With no stdin and no files, should complete with 0
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 0 reference");
    });

    it("should return exit code 0 for partial success", async () => {
      const validFile = path.join(testDir, "valid.json");
      await fs.writeFile(
        validFile,
        JSON.stringify([{ id: "valid1", type: "article-journal", title: "Valid" }]),
        "utf-8"
      );

      const result = await runCli([
        "add",
        "--library",
        libraryPath,
        validFile,
        "invalid-identifier",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).toContain("Failed");
    });
  });

  describe("output formatting", () => {
    it("should show added references in output", async () => {
      const jsonPath = path.join(testDir, "refs.json");
      await fs.writeFile(
        jsonPath,
        JSON.stringify([
          {
            id: "smith2024",
            type: "article-journal",
            title: "Machine Learning Paper",
            author: [{ family: "Smith" }],
            issued: { "date-parts": [[2024]] },
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, jsonPath]);

      // generateId creates author-year format in lowercase
      expect(result.stderr).toContain("smith-2024");
      expect(result.stderr).toContain("Machine Learning Paper");
    });

    it("should show failure details with --verbose", async () => {
      const result = await runCli([
        "add",
        "--library",
        libraryPath,
        "--verbose",
        "not-valid-input",
      ]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Failed");
      // Verbose output should contain more details
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe("duplicate handling", () => {
    it("should skip duplicates by default", async () => {
      // Add first reference
      const file1 = path.join(testDir, "first.json");
      await fs.writeFile(
        file1,
        JSON.stringify([
          {
            id: "dup2024",
            type: "article-journal",
            title: "Duplicate Test",
            DOI: "10.1000/duplicate",
          },
        ]),
        "utf-8"
      );

      await runCli(["add", "--library", libraryPath, file1]);

      // Try to add same reference again
      const file2 = path.join(testDir, "second.json");
      await fs.writeFile(
        file2,
        JSON.stringify([
          {
            id: "dup2024new",
            type: "article-journal",
            title: "Duplicate Test New",
            DOI: "10.1000/duplicate",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Skipped 1 duplicate");
    });

    it("should add duplicates with --force", async () => {
      // Add first reference
      const file1 = path.join(testDir, "first.json");
      await fs.writeFile(
        file1,
        JSON.stringify([
          {
            id: "force2024",
            type: "article-journal",
            title: "Force Test",
            DOI: "10.1000/force",
          },
        ]),
        "utf-8"
      );

      await runCli(["add", "--library", libraryPath, file1]);

      // Add same reference with --force
      const file2 = path.join(testDir, "second.json");
      await fs.writeFile(
        file2,
        JSON.stringify([
          {
            id: "force2024new",
            type: "article-journal",
            title: "Force Test New",
            DOI: "10.1000/force",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, "--force", file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).not.toContain("Skipped");
    });

    it("should detect ISBN duplicates for book type", async () => {
      // Add first book with ISBN
      const file1 = path.join(testDir, "book1.json");
      await fs.writeFile(
        file1,
        JSON.stringify([
          {
            id: "book2024",
            type: "book",
            title: "Introduction to Programming",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      await runCli(["add", "--library", libraryPath, file1]);

      // Try to add book with same ISBN (different title)
      const file2 = path.join(testDir, "book2.json");
      await fs.writeFile(
        file2,
        JSON.stringify([
          {
            id: "book2024new",
            type: "book",
            title: "Different Title Same ISBN",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Skipped 1 duplicate");
    });

    it("should allow different chapters with same ISBN", async () => {
      // Add first chapter
      const file1 = path.join(testDir, "chapter1.json");
      await fs.writeFile(
        file1,
        JSON.stringify([
          {
            id: "chapter1",
            type: "chapter",
            title: "Chapter 1: Introduction",
            "container-title": "Programming Book",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      await runCli(["add", "--library", libraryPath, file1]);

      // Add different chapter from same book
      const file2 = path.join(testDir, "chapter2.json");
      await fs.writeFile(
        file2,
        JSON.stringify([
          {
            id: "chapter2",
            type: "chapter",
            title: "Chapter 2: Advanced Topics",
            "container-title": "Programming Book",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Added 1 reference");
      expect(result.stderr).not.toContain("Skipped");
    });

    it("should detect duplicate chapters with same ISBN and title", async () => {
      // Add first chapter
      const file1 = path.join(testDir, "chapter1.json");
      await fs.writeFile(
        file1,
        JSON.stringify([
          {
            id: "chapter1",
            type: "chapter",
            title: "Chapter 1: Introduction",
            "container-title": "Programming Book",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      await runCli(["add", "--library", libraryPath, file1]);

      // Try to add same chapter again
      const file2 = path.join(testDir, "chapter2.json");
      await fs.writeFile(
        file2,
        JSON.stringify([
          {
            id: "chapter1new",
            type: "chapter",
            title: "Chapter 1: Introduction",
            "container-title": "Programming Book",
            ISBN: "9784000000000",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "--library", libraryPath, file2]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Skipped 1 duplicate");
    });
  });
});

const CLI_PATH = path.resolve("bin/reference-manager.js");

/**
 * Run CLI command with stdin input
 */
function runCli(
  args: string[],
  stdinData?: string
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("node", [CLI_PATH, ...args], {
      env: { ...process.env, NODE_ENV: "test" },
    });

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
