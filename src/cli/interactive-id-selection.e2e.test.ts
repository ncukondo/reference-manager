/**
 * End-to-end tests for interactive ID selection feature
 *
 * Note: Full interactive testing is not possible in CI/automated tests.
 * These tests verify:
 * 1. Error handling when commands are run without ID and without TTY
 * 2. Commands still work normally when IDs are provided
 * 3. Non-TTY mode properly rejects interactive selection
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
  options: { cwd?: string; stdin?: string } = {}
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

    if (options.stdin) {
      child.stdin?.write(options.stdin);
      child.stdin?.end();
    }

    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

describe("Interactive ID Selection E2E", () => {
  let testDir: string;
  let libraryPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `interactive-id-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create library with test references
    const refs = [
      {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article by Smith",
        author: [{ family: "Smith", given: "John" }],
        custom: {
          uuid: "uuid-smith-2024",
          timestamp: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      },
      {
        id: "Doe-2023",
        type: "book",
        title: "A Book by Doe",
        author: [{ family: "Doe", given: "Jane" }],
        custom: {
          uuid: "uuid-doe-2023",
          timestamp: "2023-06-15T00:00:00Z",
          created_at: "2023-06-15T00:00:00Z",
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

  describe("cite command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["cite", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifiers provided");
      expect(stderr).toContain("TTY");
    });

    it("should work normally when ID is provided", async () => {
      const { code, stdout } = await runCli(["cite", "Smith-2024", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(0);
      expect(stdout).toContain("Smith");
    });

    it("should work with multiple IDs", async () => {
      const { code, stdout } = await runCli(
        ["cite", "Smith-2024", "Doe-2023", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(0);
      expect(stdout).toContain("Smith");
    });
  });

  describe("edit command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["edit", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("Edit command requires a TTY");
    });
  });

  describe("remove command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["remove", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });

    it("should work normally when ID is provided with --force", async () => {
      const { code, stderr } = await runCli(
        ["remove", "Smith-2024", "--force", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(0);
      expect(stderr).toContain("Removed");
    });
  });

  describe("update command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(
        ["update", "--set", "title=New Title", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });

    it("should work normally when ID is provided", async () => {
      const { code, stderr } = await runCli(
        ["update", "Smith-2024", "--set", "title=Updated Title", "--library", libraryPath],
        { cwd: testDir }
      );

      expect(code).toBe(0);
      expect(stderr).toContain("Updated");
    });
  });

  describe("fulltext open command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["fulltext", "open", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });
  });

  describe("fulltext get command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["fulltext", "get", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });
  });

  describe("fulltext attach command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["fulltext", "attach", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });
  });

  describe("fulltext detach command", () => {
    it("should error when no ID provided and not in TTY", async () => {
      const { code, stderr } = await runCli(["fulltext", "detach", "--library", libraryPath], {
        cwd: testDir,
      });

      expect(code).toBe(1);
      expect(stderr).toContain("No identifier provided");
      expect(stderr).toContain("TTY");
    });
  });
});
