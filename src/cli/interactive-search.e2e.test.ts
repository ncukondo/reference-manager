/**
 * End-to-end tests for interactive search command
 *
 * Note: Full interactive testing is not possible in CI/automated tests.
 * These tests verify:
 * 1. CLI option parsing (-t, --tui)
 * 2. TTY detection and error handling
 * 3. Option conflict validation
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/cli.js");

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
    it("should exit with error when running TUI mode without TTY", async () => {
      const { code, stderr } = await runCli(["search", "-t", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4); // Error exit code
      expect(stderr).toContain("TUI mode requires a TTY");
    });

    it("should exit with error when using --tui flag without TTY", async () => {
      const { code, stderr } = await runCli(["search", "--tui", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode requires a TTY");
    });

    it("should accept initial query with TUI mode", async () => {
      const { code, stderr } = await runCli(
        ["search", "-t", "test query", "--library", libraryPath],
        { cwd: testDir }
      );

      // Still fails due to TTY, but query was accepted
      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode requires a TTY");
    });
  });

  describe("option conflicts", () => {
    it("should reject TUI mode with --json", async () => {
      const { code, stderr } = await runCli(["search", "-t", "--json", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode cannot be combined with output format options");
    });

    it("should reject TUI mode with --bibtex", async () => {
      const { code, stderr } = await runCli(
        ["search", "-t", "--bibtex", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode cannot be combined with output format options");
    });

    it("should reject TUI mode with --ids-only", async () => {
      const { code, stderr } = await runCli(
        ["search", "-t", "--ids-only", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode cannot be combined with output format options");
    });

    it("should reject TUI mode with --uuid-only", async () => {
      const { code, stderr } = await runCli(
        ["search", "-t", "--uuid-only", "--library", libraryPath],
        {
          cwd: testDir,
        }
      );

      expect(code).toBe(4);
      expect(stderr).toContain("TUI mode cannot be combined with output format options");
    });
  });

  describe("query argument", () => {
    it("should require query when not using TUI mode", async () => {
      const { code, stderr } = await runCli(["search", "--library", libraryPath], { cwd: testDir });

      expect(code).toBe(1);
      expect(stderr).toContain("Search query is required unless using --tui");
    });

    it("should not require query in TUI mode", async () => {
      const { stderr } = await runCli(["search", "-t", "--library", libraryPath], {
        cwd: testDir,
      });

      // Fails due to TTY, not due to missing query
      expect(stderr).not.toContain("Search query is required");
      expect(stderr).toContain("TUI mode requires a TTY");
    });
  });

  describe("root command default action", () => {
    it("should show help when running without subcommand in non-TTY", async () => {
      const { code, stdout } = await runCli(["--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(0);
      // Help output contains usage info and subcommand names
      expect(stdout).toContain("Usage:");
      expect(stdout).toContain("search");
      expect(stdout).toContain("list");
    });

    it("should not show TUI error when running without subcommand in non-TTY", async () => {
      const { stderr } = await runCli(["--library", libraryPath], {
        cwd: testDir,
      });

      expect(stderr).not.toContain("TUI mode requires a TTY");
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
