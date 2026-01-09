import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTempFile, deleteTempFile, openEditor, readTempFile } from "./edit-session.js";

// Mock child_process
vi.mock("node:child_process", () => ({
  spawnSync: vi.fn(),
}));

describe("edit-session", () => {
  let tempFiles: string[] = [];

  beforeEach(() => {
    tempFiles = [];
  });

  afterEach(() => {
    // Cleanup any temp files created during tests
    for (const file of tempFiles) {
      try {
        fs.unlinkSync(file);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("createTempFile", () => {
    it("creates a temp file with yaml extension", () => {
      const content = "- id: test";
      const filePath = createTempFile(content, "yaml");
      tempFiles.push(filePath);

      expect(filePath).toMatch(/\.yaml$/);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("creates a temp file with json extension", () => {
      const content = '[{"id": "test"}]';
      const filePath = createTempFile(content, "json");
      tempFiles.push(filePath);

      expect(filePath).toMatch(/\.json$/);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("creates file in system temp directory", () => {
      const filePath = createTempFile("test", "yaml");
      tempFiles.push(filePath);

      const tmpDir = os.tmpdir();
      expect(filePath.startsWith(tmpDir)).toBe(true);
    });

    it("creates file with ref-edit prefix", () => {
      const filePath = createTempFile("test", "yaml");
      tempFiles.push(filePath);

      const fileName = path.basename(filePath);
      expect(fileName).toMatch(/^ref-edit-/);
    });
  });

  describe("openEditor", () => {
    it("spawns editor with file path", async () => {
      const { spawnSync } = await import("node:child_process");
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);

      const exitCode = openEditor("vim", "/tmp/test.yaml");

      expect(mockSpawnSync).toHaveBeenCalledWith("vim", ["/tmp/test.yaml"], {
        stdio: "inherit",
        shell: true,
      });
      expect(exitCode).toBe(0);
    });

    it("returns non-zero exit code on error", async () => {
      const { spawnSync } = await import("node:child_process");
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValue({ status: 1 } as ReturnType<typeof spawnSync>);

      const exitCode = openEditor("vim", "/tmp/test.yaml");
      expect(exitCode).toBe(1);
    });

    it("returns 1 when status is null", async () => {
      const { spawnSync } = await import("node:child_process");
      const mockSpawnSync = vi.mocked(spawnSync);
      mockSpawnSync.mockReturnValue({ status: null } as ReturnType<typeof spawnSync>);

      const exitCode = openEditor("vim", "/tmp/test.yaml");
      expect(exitCode).toBe(1);
    });
  });

  describe("readTempFile", () => {
    it("reads content from temp file", () => {
      const content = "test content";
      const filePath = path.join(os.tmpdir(), `test-${Date.now()}.yaml`);
      fs.writeFileSync(filePath, content, "utf-8");
      tempFiles.push(filePath);

      const result = readTempFile(filePath);
      expect(result).toBe(content);
    });
  });

  describe("deleteTempFile", () => {
    it("deletes the temp file", () => {
      const filePath = path.join(os.tmpdir(), `test-${Date.now()}.yaml`);
      fs.writeFileSync(filePath, "test", "utf-8");

      expect(fs.existsSync(filePath)).toBe(true);
      deleteTempFile(filePath);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("does not throw if file does not exist", () => {
      const filePath = "/tmp/nonexistent-file.yaml";
      expect(() => deleteTempFile(filePath)).not.toThrow();
    });
  });
});
