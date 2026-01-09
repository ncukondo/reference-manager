/**
 * End-to-end tests for export command
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("export command E2E", () => {
  let testDir: string;
  let libraryPath: string;

  const runCli = (args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
    new Promise((resolve) => {
      const proc = spawn("node", [CLI_PATH, "--library", libraryPath, ...args], {
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
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      proc.stdin.end();
    });

  // Use valid UUID v4 format (third group starts with 4, fourth group starts with 8/9/a/b)
  const SMITH_UUID = "11111111-1111-4111-8111-111111111111";
  const JONES_UUID = "22222222-2222-4222-9222-222222222222";

  const testItems = [
    {
      id: "smith-2024",
      type: "article-journal",
      title: "Test Article by Smith",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2024]] },
      custom: {
        uuid: SMITH_UUID,
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
    {
      id: "jones-2023",
      type: "article-journal",
      title: "Another Article by Jones",
      author: [{ family: "Jones", given: "Jane" }],
      issued: { "date-parts": [[2023]] },
      custom: {
        uuid: JONES_UUID,
        created_at: "2023-01-01T00:00:00.000Z",
        timestamp: "2023-01-01T00:00:00.000Z",
      },
    },
  ];

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `export-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    libraryPath = path.join(testDir, "library.json");
    await fs.writeFile(libraryPath, JSON.stringify(testItems), "utf-8");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("single ID export", () => {
    it("should export single reference as object", async () => {
      const result = await runCli(["export", "smith-2024"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.id).toBe("smith-2024");
      expect(output.title).toBe("Test Article by Smith");
    });

    it("should export by UUID with --uuid flag", async () => {
      const result = await runCli(["export", "--uuid", JONES_UUID]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.id).toBe("jones-2023");
    });

    it("should return exit code 1 for not found", async () => {
      const result = await runCli(["export", "nonexistent"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("not found");
    });
  });

  describe("multiple ID export", () => {
    it("should export multiple references as array", async () => {
      const result = await runCli(["export", "smith-2024", "jones-2023"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output).toHaveLength(2);
    });

    it("should handle partial failures", async () => {
      const result = await runCli(["export", "smith-2024", "nonexistent"]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output).toHaveLength(1);
      expect(result.stderr).toContain("nonexistent");
    });
  });

  describe("--all option", () => {
    it("should export all references", async () => {
      const result = await runCli(["export", "--all"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output).toHaveLength(2);
    });

    it("should return empty array for empty library", async () => {
      await fs.writeFile(libraryPath, "[]", "utf-8");

      const result = await runCli(["export", "--all"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual([]);
    });
  });

  describe("--search option", () => {
    it("should export matching references", async () => {
      const result = await runCli(["export", "--search", "author:smith"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output)).toBe(true);
      expect(output).toHaveLength(1);
      expect(output[0].id).toBe("smith-2024");
    });

    it("should return empty array when no matches", async () => {
      const result = await runCli(["export", "--search", "author:nonexistent"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toEqual([]);
    });
  });

  describe("output formats", () => {
    it("should output YAML with --format yaml", async () => {
      const result = await runCli(["export", "smith-2024", "--format", "yaml"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("id: smith-2024");
      expect(result.stdout).toContain("title: Test Article by Smith");
      // Should not be JSON
      expect(result.stdout).not.toMatch(/^\s*{/);
    });

    it("should output BibTeX with --format bibtex", async () => {
      const result = await runCli(["export", "smith-2024", "--format", "bibtex"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("@article{smith-2024");
      expect(result.stdout).toContain("title = {Test Article by Smith}");
    });

    it("should output BibTeX for all with --format bibtex", async () => {
      const result = await runCli(["export", "--all", "--format", "bibtex"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("@article{smith-2024");
      expect(result.stdout).toContain("@article{jones-2023");
    });
  });
});
