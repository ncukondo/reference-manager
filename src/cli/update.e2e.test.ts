/**
 * End-to-end tests for update command with --set option
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("Update Command E2E --set option", () => {
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

  const readLibrary = async () => {
    const content = await fs.readFile(libraryPath, "utf-8");
    return JSON.parse(content);
  };

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `update-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    libraryPath = path.join(testDir, "library.json");
    const library = [
      {
        id: "Smith-2024",
        type: "article-journal",
        title: "Original Title",
        abstract: "Original abstract",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          tags: ["tag1", "tag2"],
        },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), "utf-8");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("basic --set usage", () => {
    it("should update title with --set", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "title=New Title"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated");

      const library = await readLibrary();
      expect(library[0].title).toBe("New Title");
    });

    it("should update multiple fields with multiple --set options", async () => {
      const result = await runCli([
        "update",
        "Smith-2024",
        "--set",
        "title=New Title",
        "--set",
        "DOI=10.1234/test",
      ]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].title).toBe("New Title");
      expect(library[0].DOI).toBe("10.1234/test");
    });

    it("should clear field with empty value", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "abstract="]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].abstract).toBeUndefined();
    });
  });

  describe("array operations", () => {
    it("should replace tags array", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "custom.tags=new1,new2,new3"]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].custom.tags).toEqual(["new1", "new2", "new3"]);
    });

    it("should add to tags array with +=", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "custom.tags+=tag3"]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].custom.tags).toContain("tag3");
      expect(library[0].custom.tags).toContain("tag1");
      expect(library[0].custom.tags).toContain("tag2");
    });

    it("should remove from tags array with -=", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "custom.tags-=tag1"]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].custom.tags).not.toContain("tag1");
      expect(library[0].custom.tags).toContain("tag2");
    });
  });

  describe("author field", () => {
    it("should set single author", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "author=Doe, Jane"]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].author).toEqual([{ family: "Doe", given: "Jane" }]);
    });

    it("should set multiple authors", async () => {
      const result = await runCli([
        "update",
        "Smith-2024",
        "--set",
        "author=Smith, John; Doe, Jane",
      ]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].author).toEqual([
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Jane" },
      ]);
    });
  });

  describe("date fields", () => {
    it("should set issued.raw date", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "issued.raw=2025-06-15"]);

      expect(result.exitCode).toBe(0);

      const library = await readLibrary();
      expect(library[0].issued).toEqual({ raw: "2025-06-15" });
    });
  });

  describe("ID change", () => {
    it("should change citation key", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "id=Smith-2024-updated"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated");
      expect(result.stderr).toContain("Smith-2024-updated");

      const library = await readLibrary();
      expect(library[0].id).toBe("Smith-2024-updated");
    });
  });

  describe("error cases", () => {
    it("should fail when using --set with file argument", async () => {
      const result = await runCli([
        "update",
        "Smith-2024",
        "updates.json",
        "--set",
        "title=New Title",
      ]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Cannot use --set with a file argument");
    });

    it("should fail with invalid --set syntax", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "invalid"]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid --set syntax");
    });

    it("should fail with protected field", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "custom.uuid=new-uuid"]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Cannot set protected field");
    });

    it("should fail with unsupported field", async () => {
      const result = await runCli(["update", "Smith-2024", "--set", "unknown_field=value"]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Unsupported field");
    });

    it("should fail when reference not found", async () => {
      const result = await runCli(["update", "NonExistent", "--set", "title=New Title"]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Reference not found");
    });
  });
});
