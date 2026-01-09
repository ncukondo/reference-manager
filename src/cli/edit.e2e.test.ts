/**
 * End-to-end tests for edit command
 *
 * Tests cover:
 * 1. TTY detection and error handling
 * 2. Command option parsing
 * 3. Reference not found errors
 * 4. Basic edit flow with mock editor
 *
 * Note: Uses Node.js scripts as mock editors for cross-platform compatibility
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

/**
 * Create a cross-platform mock editor script using Node.js
 * The script replaces text in the file passed as argument
 */
async function createMockEditor(
  testDir: string,
  replacements: Array<{ pattern: string; replacement: string }>
): Promise<string> {
  const scriptPath = path.join(testDir, `mock-editor-${Date.now()}.js`);

  // Create a Node.js script that performs text replacements
  const script = `
const fs = require('fs');
const filePath = process.argv[2];
let content = fs.readFileSync(filePath, 'utf8');
const replacements = ${JSON.stringify(replacements)};
for (const { pattern, replacement } of replacements) {
  content = content.split(pattern).join(replacement);
}
fs.writeFileSync(filePath, content, 'utf8');
`;
  await fs.writeFile(scriptPath, script, "utf-8");
  // Return command to run: "node /path/to/script.js"
  return `node "${scriptPath}"`;
}

/**
 * Create a mock editor that exits with a specific code
 */
async function createFailingEditor(testDir: string, exitCode: number): Promise<string> {
  const scriptPath = path.join(testDir, `fail-editor-${Date.now()}.js`);
  const script = `process.exit(${exitCode});`;
  await fs.writeFile(scriptPath, script, "utf-8");
  return `node "${scriptPath}"`;
}

describe("edit command E2E", () => {
  let testDir: string;
  let libraryPath: string;

  /**
   * Run CLI command (without TTY)
   */
  const runCli = (
    args: string[],
    env: Record<string, string> = {}
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
    new Promise((resolve) => {
      const proc = spawn("node", [CLI_PATH, "--library", libraryPath, ...args], {
        env: { ...process.env, NODE_ENV: "test", ...env },
        stdio: ["pipe", "pipe", "pipe"],
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

  // Use valid UUID v4 format
  const TEST_UUID = "11111111-1111-4111-8111-111111111111";

  const testItems = [
    {
      id: "smith-2024",
      type: "article-journal",
      title: "Test Article by Smith",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2024, 3, 15]] },
      custom: {
        uuid: TEST_UUID,
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
  ];

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `edit-e2e-test-${Date.now()}`);
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

  describe("TTY detection", () => {
    it("should exit with error when running without TTY", async () => {
      const result = await runCli(["edit", "smith-2024"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Edit command requires a TTY");
    });
  });

  describe("reference not found", () => {
    it("should exit with error for nonexistent reference", async () => {
      const result = await runCli(["edit", "nonexistent"], {
        REF_SKIP_TTY_CHECK: "1",
      });

      // Editor might fail, but we should get a "not found" error first
      expect(result.exitCode).not.toBe(0);
      // The error should mention the reference wasn't found
      expect(result.stderr.toLowerCase()).toMatch(/not found|error/);
    });
  });

  describe("basic edit flow with mock editor", () => {
    it("should edit reference and update library", async () => {
      // Create mock editor that changes the title
      const mockEditor = await createMockEditor(testDir, [
        { pattern: "Test Article by Smith", replacement: "Updated Title" },
      ]);

      const result = await runCli(["edit", "smith-2024", "--editor", mockEditor], {
        REF_SKIP_TTY_CHECK: "1",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated 1 reference");

      // Verify library was updated
      const libraryContent = await fs.readFile(libraryPath, "utf-8");
      const library = JSON.parse(libraryContent);
      expect(library[0].title).toBe("Updated Title");
    });

    it("should preserve protected fields after edit", async () => {
      // Create mock editor that modifies content
      const mockEditor = await createMockEditor(testDir, [
        { pattern: "Test Article by Smith", replacement: "New Title" },
      ]);

      const result = await runCli(["edit", "smith-2024", "--editor", mockEditor], {
        REF_SKIP_TTY_CHECK: "1",
      });

      expect(result.exitCode).toBe(0);

      // Verify protected fields are preserved
      const libraryContent = await fs.readFile(libraryPath, "utf-8");
      const library = JSON.parse(libraryContent);
      expect(library[0].custom.uuid).toBe(TEST_UUID);
      expect(library[0].custom.created_at).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should support JSON format with --format json", async () => {
      // Create mock editor that modifies JSON content
      const mockEditor = await createMockEditor(testDir, [
        { pattern: "Test Article by Smith", replacement: "JSON Edited Title" },
      ]);

      const result = await runCli(
        ["edit", "smith-2024", "--format", "json", "--editor", mockEditor],
        {
          REF_SKIP_TTY_CHECK: "1",
        }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated 1 reference");

      // Verify library was updated
      const libraryContent = await fs.readFile(libraryPath, "utf-8");
      const library = JSON.parse(libraryContent);
      expect(library[0].title).toBe("JSON Edited Title");
    });

    it("should edit by UUID with --uuid flag", async () => {
      // Create mock editor that changes title
      const mockEditor = await createMockEditor(testDir, [
        { pattern: "Test Article by Smith", replacement: "UUID Edit" },
      ]);

      const result = await runCli(["edit", "--uuid", TEST_UUID, "--editor", mockEditor], {
        REF_SKIP_TTY_CHECK: "1",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated 1 reference");

      // Verify library was updated
      const libraryContent = await fs.readFile(libraryPath, "utf-8");
      const library = JSON.parse(libraryContent);
      expect(library[0].title).toBe("UUID Edit");
    });
  });

  describe("editor exit code handling", () => {
    it("should fail if editor exits with non-zero code", async () => {
      // Create mock editor that exits with error
      const mockEditor = await createFailingEditor(testDir, 1);

      const result = await runCli(["edit", "smith-2024", "--editor", mockEditor], {
        REF_SKIP_TTY_CHECK: "1",
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Editor exited with code 1");
    });
  });

  describe("multiple references", () => {
    beforeEach(async () => {
      // Add second reference
      const items = [
        ...testItems,
        {
          id: "jones-2023",
          type: "article-journal",
          title: "Another Article",
          author: [{ family: "Jones", given: "Jane" }],
          custom: {
            uuid: "22222222-2222-4222-9222-222222222222",
            created_at: "2023-01-01T00:00:00.000Z",
            timestamp: "2023-01-01T00:00:00.000Z",
          },
        },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
    });

    it("should edit multiple references at once", async () => {
      // Create mock editor that modifies both titles
      const mockEditor = await createMockEditor(testDir, [
        { pattern: "Test Article by Smith", replacement: "Smith Updated" },
        { pattern: "Another Article", replacement: "Jones Updated" },
      ]);

      const result = await runCli(["edit", "smith-2024", "jones-2023", "--editor", mockEditor], {
        REF_SKIP_TTY_CHECK: "1",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Updated 2 references");

      // Verify both were updated
      const libraryContent = await fs.readFile(libraryPath, "utf-8");
      const library = JSON.parse(libraryContent);
      expect(library.find((r: { id: string }) => r.id === "smith-2024").title).toBe(
        "Smith Updated"
      );
      expect(library.find((r: { id: string }) => r.id === "jones-2023").title).toBe(
        "Jones Updated"
      );
    });
  });
});
