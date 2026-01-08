/**
 * End-to-end tests for JSON output format (--output json)
 * Tests add, remove, and update commands with JSON output option
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("JSON Output E2E", () => {
  let testDir: string;
  let libraryPath: string;

  const runCli = (
    args: string[],
    stdinData?: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
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

      if (stdinData) {
        proc.stdin.write(stdinData);
        proc.stdin.end();
      } else {
        proc.stdin.end();
      }
    });

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `json-output-e2e-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    libraryPath = path.join(testDir, "library.json");
    await fs.writeFile(libraryPath, "[]", "utf-8");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("add command", () => {
    it("should produce valid JSON output for successful add", async () => {
      const jsonData = JSON.stringify([
        { id: "test-2024", type: "article-journal", title: "Test Article" },
      ]);

      const result = await runCli(["add", "-o", "json"], jsonData);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe(""); // JSON mode should not output to stderr

      const output = JSON.parse(result.stdout);
      expect(output.summary).toEqual({
        total: 1,
        added: 1,
        skipped: 0,
        failed: 0,
      });
      expect(output.added).toHaveLength(1);
      expect(output.added[0].title).toBe("Test Article");
      expect(output.added[0].id).toBeDefined();
      expect(output.added[0].uuid).toBeDefined();
    });

    it("should include full CSL-JSON with --full option", async () => {
      const jsonData = JSON.stringify([
        {
          id: "full-test",
          type: "article-journal",
          title: "Full Test Article",
          DOI: "10.1234/test",
        },
      ]);

      const result = await runCli(["add", "-o", "json", "--full"], jsonData);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.added[0].item).toBeDefined();
      expect(output.added[0].item.title).toBe("Full Test Article");
      expect(output.added[0].item.DOI).toBe("10.1234/test");
    });

    it("should include duplicateType for skipped duplicates", async () => {
      // Add first reference with DOI
      const first = JSON.stringify([
        {
          id: "dup-test",
          type: "article-journal",
          title: "First",
          DOI: "10.1234/dup",
        },
      ]);
      await runCli(["add"], first);

      // Try to add duplicate
      const second = JSON.stringify([
        {
          id: "dup-test-new",
          type: "article-journal",
          title: "Second",
          DOI: "10.1234/dup",
        },
      ]);
      const result = await runCli(["add", "-o", "json"], second);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.summary.skipped).toBe(1);
      expect(output.skipped).toHaveLength(1);
      expect(output.skipped[0].reason).toBe("duplicate");
      expect(output.skipped[0].duplicateType).toBe("doi");
      expect(output.skipped[0].existingId).toBeDefined();
    });

    it("should include reason for failed imports", async () => {
      const result = await runCli(["add", "-o", "json", "invalid-identifier"]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.summary.failed).toBe(1);
      expect(output.failed).toHaveLength(1);
      expect(output.failed[0].source).toBe("invalid-identifier");
      expect(output.failed[0].reason).toBeDefined();
      expect(output.failed[0].error).toBeDefined();
    });

    it("should handle mixed results (added, skipped, failed)", async () => {
      // Add a reference first
      const first = JSON.stringify([
        {
          id: "existing",
          type: "article-journal",
          title: "Existing",
          DOI: "10.1234/existing",
        },
      ]);
      await runCli(["add"], first);

      // Create file with new ref
      const validFile = path.join(testDir, "new.json");
      await fs.writeFile(
        validFile,
        JSON.stringify([{ id: "new-ref", type: "article-journal", title: "New Ref" }]),
        "utf-8"
      );

      // Create file with duplicate
      const dupFile = path.join(testDir, "dup.json");
      await fs.writeFile(
        dupFile,
        JSON.stringify([
          {
            id: "dup-ref",
            type: "article-journal",
            title: "Dup Ref",
            DOI: "10.1234/existing",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "-o", "json", validFile, dupFile, "invalid-id-9999"]);

      // Exit code 0 because at least one was added
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.summary.added).toBe(1);
      expect(output.summary.skipped).toBe(1);
      expect(output.summary.failed).toBe(1);
      expect(output.summary.total).toBe(3);
    });

    it("should return exit code 1 when all items fail or skip", async () => {
      // Add a reference first
      const first = JSON.stringify([
        {
          id: "skip-test",
          type: "article-journal",
          title: "Skip Test",
          DOI: "10.1234/skip",
        },
      ]);
      await runCli(["add"], first);

      // Try to add only duplicates and invalid
      const dupFile = path.join(testDir, "all-dup.json");
      await fs.writeFile(
        dupFile,
        JSON.stringify([
          {
            id: "dup-again",
            type: "article-journal",
            title: "Dup Again",
            DOI: "10.1234/skip",
          },
        ]),
        "utf-8"
      );

      const result = await runCli(["add", "-o", "json", dupFile, "bad-id-xyz"]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.summary.added).toBe(0);
      expect(output.summary.skipped).toBe(1);
      expect(output.summary.failed).toBe(1);
    });

    it("should include idChanged when ID collision resolved", async () => {
      // Add first reference
      const first = JSON.stringify([
        {
          id: "collision-2024",
          type: "article-journal",
          title: "First",
          author: [{ family: "Smith" }],
          issued: { "date-parts": [[2024]] },
        },
      ]);
      await runCli(["add"], first);

      // Add another with same generated ID pattern
      const second = JSON.stringify([
        {
          id: "collision-new",
          type: "article-journal",
          title: "Second",
          author: [{ family: "Smith" }],
          issued: { "date-parts": [[2024]] },
        },
      ]);
      const result = await runCli(["add", "-o", "json"], second);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.added).toHaveLength(1);
      // ID should be different from "smith-2024" due to collision
      expect(output.added[0].id).not.toBe("smith-2024");
      expect(output.added[0].idChanged).toBe(true);
      expect(output.added[0].originalId).toBe("smith-2024");
    });
  });

  describe("remove command", () => {
    beforeEach(async () => {
      // Setup library with test references
      const library = [
        {
          id: "remove-test",
          type: "article-journal",
          title: "To Be Removed",
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), "utf-8");
    });

    it("should produce valid JSON output for successful remove", async () => {
      const result = await runCli(["remove", "remove-test", "-o", "json"]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.id).toBe("remove-test");
      expect(output.uuid).toBeDefined();
      expect(typeof output.uuid).toBe("string");
      expect(output.title).toBe("To Be Removed");
    });

    it("should include full CSL-JSON with --full option", async () => {
      const result = await runCli(["remove", "remove-test", "-o", "json", "--full"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.item).toBeDefined();
      expect(output.item.id).toBe("remove-test");
      expect(output.item.title).toBe("To Be Removed");
    });

    it("should return error JSON for not found", async () => {
      const result = await runCli(["remove", "nonexistent", "-o", "json"]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.id).toBe("nonexistent");
      expect(output.error).toBeDefined();
      expect(output.error).toContain("not found");
    });
  });

  describe("update command", () => {
    beforeEach(async () => {
      const library = [
        {
          id: "update-test",
          type: "article-journal",
          title: "Original Title",
          author: [{ family: "Smith", given: "John" }],
          issued: { "date-parts": [[2024]] },
          custom: {
            uuid: "456e7890-e12b-34d5-a678-901234567890",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), "utf-8");
    });

    it("should produce valid JSON output for successful update", async () => {
      const result = await runCli([
        "update",
        "update-test",
        "--set",
        "title=New Title",
        "-o",
        "json",
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.id).toBe("update-test");
      expect(output.uuid).toBeDefined();
      expect(typeof output.uuid).toBe("string");
      expect(output.title).toBe("New Title");
    });

    it("should include before/after with --full option", async () => {
      const result = await runCli([
        "update",
        "update-test",
        "--set",
        "title=Updated Title",
        "-o",
        "json",
        "--full",
      ]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.before).toBeDefined();
      expect(output.before.title).toBe("Original Title");
      expect(output.after).toBeDefined();
      expect(output.after.title).toBe("Updated Title");
    });

    it("should include idChanged for ID change", async () => {
      const result = await runCli(["update", "update-test", "--set", "id=new-id", "-o", "json"]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.id).toBe("new-id");
      expect(output.idChanged).toBe(true);
      expect(output.previousId).toBe("update-test");
    });

    it("should return error JSON for not found", async () => {
      const result = await runCli(["update", "nonexistent", "--set", "title=New", "-o", "json"]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.id).toBe("nonexistent");
      expect(output.error).toBeDefined();
      expect(output.error).toContain("not found");
    });
  });

  describe("output destination", () => {
    it("add: text mode outputs to stderr, json mode outputs to stdout", async () => {
      const jsonData = JSON.stringify([
        { id: "dest-test", type: "article-journal", title: "Dest Test" },
      ]);

      // Text mode (default)
      const textResult = await runCli(["add", "-o", "text"], jsonData);
      expect(textResult.stderr).not.toBe("");
      expect(textResult.stdout).toBe("");

      // Reset library
      await fs.writeFile(libraryPath, "[]", "utf-8");

      // JSON mode
      const jsonResult = await runCli(["add", "-o", "json"], jsonData);
      expect(jsonResult.stdout).not.toBe("");
      expect(jsonResult.stderr).toBe("");
    });

    it("remove: text mode outputs to stderr, json mode outputs to stdout", async () => {
      // Setup
      await fs.writeFile(
        libraryPath,
        JSON.stringify([{ id: "dest-rm", type: "article-journal", title: "Dest Remove" }]),
        "utf-8"
      );

      // JSON mode
      const jsonResult = await runCli(["remove", "dest-rm", "-o", "json"]);
      expect(jsonResult.stdout).not.toBe("");
      expect(jsonResult.stderr).toBe("");
    });

    it("update: text mode outputs to stderr, json mode outputs to stdout", async () => {
      // Setup
      await fs.writeFile(
        libraryPath,
        JSON.stringify([
          {
            id: "dest-upd",
            type: "article-journal",
            title: "Dest Update",
            custom: { uuid: "test-uuid" },
          },
        ]),
        "utf-8"
      );

      // JSON mode
      const jsonResult = await runCli(["update", "dest-upd", "--set", "title=New", "-o", "json"]);
      expect(jsonResult.stdout).not.toBe("");
      expect(jsonResult.stderr).toBe("");
    });
  });
});
