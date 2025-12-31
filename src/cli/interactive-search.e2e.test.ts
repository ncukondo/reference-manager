/**
 * End-to-end tests for interactive search command
 *
 * Note: Full interactive testing is not possible in CI/automated tests.
 * These tests verify:
 * 1. CLI option parsing (-i, --interactive)
 * 2. TTY detection and error handling
 * 3. Option conflict validation
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

/**
 * Run CLI command and return result
 * Note: runs without TTY (stdin is not a terminal)
 */
function runCli(
  args: string[],
  options: { cwd?: string } = {}
): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      cwd: options.cwd,
      // Important: stdio 'pipe' means stdin is NOT a TTY
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

describe("Interactive Search E2E", () => {
  let testDir: string;
  let libraryPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `interactive-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create library with test references
    const refs = [
      {
        id: "test2024",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Tester", given: "Test" }],
        custom: {
          uuid: "uuid-test-2024",
          timestamp: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      },
    ];

    libraryPath = path.join(testDir, "references.json");
    await fs.writeFile(libraryPath, JSON.stringify(refs, null, 2));
  });

  afterEach(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("TTY detection", () => {
    it("should exit with error when running interactive mode without TTY", async () => {
      const { code, stderr } = await runCli(["search", "-i", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4); // Error exit code
      expect(stderr).toContain("Interactive mode requires a TTY");
    });

    it("should exit with error when using --interactive flag without TTY", async () => {
      const { code, stderr } = await runCli(["search", "--interactive", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode requires a TTY");
    });

    it("should accept initial query with interactive mode", async () => {
      const { code, stderr } = await runCli(
        ["search", "-i", "test query", "--library", libraryPath],
        { cwd: testDir }
      );

      // Still fails due to TTY, but query was accepted
      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode requires a TTY");
    });
  });

  describe("option conflicts", () => {
    it("should reject interactive mode with --json", async () => {
      const { code, stderr } = await runCli(["search", "-i", "--json", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode cannot be combined with output format options");
    });

    it("should reject interactive mode with --bibtex", async () => {
      const { code, stderr } = await runCli(
        ["search", "-i", "--bibtex", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode cannot be combined with output format options");
    });

    it("should reject interactive mode with --ids-only", async () => {
      const { code, stderr } = await runCli(
        ["search", "-i", "--ids-only", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode cannot be combined with output format options");
    });

    it("should reject interactive mode with --uuid", async () => {
      const { code, stderr } = await runCli(["search", "-i", "--uuid", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4);
      expect(stderr).toContain("Interactive mode cannot be combined with output format options");
    });
  });

  describe("query argument", () => {
    it("should require query when not using interactive mode", async () => {
      const { code, stderr } = await runCli(["search", "--library", libraryPath], { cwd: testDir });

      expect(code).toBe(1);
      expect(stderr).toContain("Search query is required unless using --interactive");
    });

    it("should not require query in interactive mode", async () => {
      const { stderr } = await runCli(["search", "-i", "--library", libraryPath], {
        cwd: testDir,
      });

      // Fails due to TTY, not due to missing query
      expect(stderr).not.toContain("Search query is required");
      expect(stderr).toContain("Interactive mode requires a TTY");
    });
  });

  describe("normal search mode", () => {
    it("should work without interactive flag", async () => {
      const { code, stdout } = await runCli(["search", "test", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(0);
      expect(stdout).toContain("test2024");
    });
  });
});
