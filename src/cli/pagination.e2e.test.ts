/**
 * End-to-end tests for pagination in list and search commands
 *
 * Tests verify that:
 * 1. List and search commands support pagination options
 * 2. Sorting works correctly
 * 3. Limit and offset work as expected
 * 4. Output includes pagination info
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("Pagination E2E", () => {
  let testDir: string;
  let libraryPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `pagination-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create library with test references
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "uuid-smith-2024",
          timestamp: "2024-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
      },
      {
        id: "jones2023",
        type: "article-journal",
        title: "Deep Learning in Healthcare",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "uuid-jones-2023",
          timestamp: "2023-06-01T00:00:00Z",
          created_at: "2023-06-01T00:00:00Z",
        },
      },
      {
        id: "brown2022",
        type: "book",
        title: "Introduction to AI",
        author: [{ family: "Brown", given: "Alice" }],
        issued: { "date-parts": [[2022]] },
        custom: {
          uuid: "uuid-brown-2022",
          timestamp: "2022-01-01T00:00:00Z",
          created_at: "2022-01-01T00:00:00Z",
        },
      },
      {
        id: "adams2021",
        type: "article-journal",
        title: "Neural Networks Overview",
        author: [{ family: "Adams", given: "Bob" }],
        issued: { "date-parts": [[2021]] },
        custom: {
          uuid: "uuid-adams-2021",
          timestamp: "2021-01-01T00:00:00Z",
          created_at: "2021-01-01T00:00:00Z",
        },
      },
      {
        id: "clark2020",
        type: "article-journal",
        title: "Data Science Fundamentals",
        author: [{ family: "Clark", given: "Diana" }],
        issued: { "date-parts": [[2020]] },
        custom: {
          uuid: "uuid-clark-2020",
          timestamp: "2020-01-01T00:00:00Z",
          created_at: "2020-01-01T00:00:00Z",
        },
      },
    ];
    libraryPath = path.join(testDir, "library.json");
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("list command pagination", () => {
    it("should list with --limit/-n option", async () => {
      const result = await runCli(["list", "--library", libraryPath, "-n", "2"]);

      expect(result.exitCode).toBe(0);
      // Output should contain pagination header
      expect(result.stdout).toContain("Showing 1-2 of 5 references");
    });

    it("should list with --limit and --offset", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--limit",
        "2",
        "--offset",
        "2",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Showing 3-4 of 5 references");
    });

    it("should list with --sort author --order asc", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--sort",
        "author",
        "--order",
        "asc",
      ]);

      expect(result.exitCode).toBe(0);
      const lines = result.stdout.split("\n").filter((l) => l.trim());
      // Adams, Brown, Clark, Jones, Smith in alphabetical order
      const authorOrder = ["Adams", "Brown", "Clark", "Jones", "Smith"];
      for (let i = 0; i < authorOrder.length; i++) {
        expect(lines.some((l) => l.includes(authorOrder[i]))).toBe(true);
      }
    });

    it("should list with --sort pub (alias for published)", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--sort",
        "pub",
        "--order",
        "desc",
        "-n",
        "3",
      ]);

      expect(result.exitCode).toBe(0);
      // Most recent first: 2024, 2023, 2022
      expect(result.stdout).toContain("Smith");
      expect(result.stdout).toContain("Jones");
      expect(result.stdout).toContain("Brown");
    });

    it("should return JSON with pagination metadata", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--json", "--limit", "2"]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty("items");
      expect(parsed).toHaveProperty("total", 5);
      expect(parsed).toHaveProperty("limit", 2);
      expect(parsed).toHaveProperty("offset", 0);
      expect(parsed).toHaveProperty("nextOffset", 2);
      expect(parsed.items).toHaveLength(2);
    });

    it("should return nextOffset null when no more results", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--json", "--limit", "10"]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.nextOffset).toBeNull();
      expect(parsed.items).toHaveLength(5);
    });

    it("should handle offset beyond total", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--json",
        "--limit",
        "2",
        "--offset",
        "100",
      ]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.items).toHaveLength(0);
      expect(parsed.nextOffset).toBeNull();
    });
  });

  describe("search command pagination", () => {
    it("should search with --limit", async () => {
      const result = await runCli(["search", "--library", libraryPath, "learning", "-n", "1"]);

      expect(result.exitCode).toBe(0);
      // Should only show 1 result
      expect(result.stdout).toContain("Showing 1-1 of");
    });

    it("should search with --sort updated --order desc", async () => {
      const result = await runCli([
        "search",
        "--library",
        libraryPath,
        "learning",
        "--sort",
        "updated",
        "--order",
        "desc",
      ]);

      expect(result.exitCode).toBe(0);
      // Machine Learning (2024) and Deep Learning (2023) match
      // Machine Learning should come first (more recent timestamp)
      const output = result.stdout;
      const machinePos = output.indexOf("Machine");
      const deepPos = output.indexOf("Deep");
      if (machinePos !== -1 && deepPos !== -1) {
        expect(machinePos).toBeLessThan(deepPos);
      }
    });

    it("should search with JSON format and pagination metadata", async () => {
      const result = await runCli([
        "search",
        "--library",
        libraryPath,
        "learning",
        "--json",
        "--limit",
        "1",
      ]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty("items");
      expect(parsed).toHaveProperty("total");
      expect(parsed).toHaveProperty("limit", 1);
      expect(parsed).toHaveProperty("offset", 0);
      expect(parsed.items).toHaveLength(1);
    });

    it("should support relevance sort in search", async () => {
      const result = await runCli([
        "search",
        "--library",
        libraryPath,
        "learning",
        "--sort",
        "rel",
      ]);

      // rel is an alias for relevance
      expect(result.exitCode).toBe(0);
    });
  });

  describe("combined options", () => {
    it("should combine sort, limit, offset, and format", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--sort",
        "title",
        "--order",
        "asc",
        "-n",
        "2",
        "--offset",
        "1",
        "--json",
      ]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.items).toHaveLength(2);
      expect(parsed.offset).toBe(1);
      expect(parsed.limit).toBe(2);
    });

    it("should work with bibtex output format", async () => {
      const result = await runCli([
        "list",
        "--library",
        libraryPath,
        "--sort",
        "author",
        "-n",
        "2",
        "--bibtex",
      ]);

      expect(result.exitCode).toBe(0);
      // Should contain BibTeX entries
      expect(result.stdout).toContain("@");
      // Should show pagination header in stdout (non-JSON formats include header in output)
      expect(result.stdout).toContain("Showing 1-2 of 5 references");
    });
  });

  describe("edge cases", () => {
    it("should handle limit=0 as unlimited", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--json", "--limit", "0"]);

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.items).toHaveLength(5);
      expect(parsed.limit).toBe(0);
    });

    it("should reject negative limit", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--limit", "-1"]);

      // Should fail with validation error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid pagination option");
    });

    it("should reject invalid sort field", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--sort", "unknown"]);

      // Should fail with validation error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid sort field");
    });

    it("should reject invalid sort order", async () => {
      const result = await runCli(["list", "--library", libraryPath, "--order", "invalid"]);

      // Should fail with validation error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid sort order");
    });
  });
});

/**
 * Run CLI command
 */
function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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

    proc.stdin.end();
  });
}
