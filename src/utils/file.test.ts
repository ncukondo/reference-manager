import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureDirectoryExists, writeFileAtomic } from "./file";

describe("File Utils", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `file-utils-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("writeFileAtomic", () => {
    it("should write file atomically", async () => {
      const filePath = join(testDir, "test.txt");
      const content = "test content";

      await writeFileAtomic(filePath, content);

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should overwrite existing file", async () => {
      const filePath = join(testDir, "test.txt");

      await writeFileAtomic(filePath, "first content");
      await writeFileAtomic(filePath, "second content");

      expect(readFileSync(filePath, "utf-8")).toBe("second content");
    });

    it("should handle unicode content", async () => {
      const filePath = join(testDir, "unicode.txt");
      const content = "日本語 テスト 🌍";

      await writeFileAtomic(filePath, content);

      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should handle empty content", async () => {
      const filePath = join(testDir, "empty.txt");

      await writeFileAtomic(filePath, "");

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe("");
    });

    it("should handle large content", async () => {
      const filePath = join(testDir, "large.txt");
      const content = "x".repeat(100000);

      await writeFileAtomic(filePath, content);

      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should create parent directory if it does not exist", async () => {
      const filePath = join(testDir, "nested", "dir", "test.txt");
      const content = "nested content";

      await writeFileAtomic(filePath, content);

      expect(existsSync(filePath)).toBe(true);
      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should not leave temporary files after success", async () => {
      const filePath = join(testDir, "test.txt");

      await writeFileAtomic(filePath, "content");

      const files = readdirSync(testDir);
      expect(files).toEqual(["test.txt"]);
    });

    it("should handle newlines and special characters", async () => {
      const filePath = join(testDir, "special.txt");
      const content = "line1\nline2\ttab\r\nwindows";

      await writeFileAtomic(filePath, content);

      expect(readFileSync(filePath, "utf-8")).toBe(content);
    });

    it("should reject with error for invalid path", async () => {
      const filePath = "\0invalid";

      await expect(writeFileAtomic(filePath, "content")).rejects.toThrow();
    });
  });

  describe("ensureDirectoryExists", () => {
    it("should create directory if it does not exist", async () => {
      const dirPath = join(testDir, "new-dir");

      await ensureDirectoryExists(dirPath);

      expect(existsSync(dirPath)).toBe(true);
    });

    it("should not throw if directory already exists", async () => {
      const dirPath = join(testDir, "existing-dir");
      mkdirSync(dirPath);

      await expect(ensureDirectoryExists(dirPath)).resolves.not.toThrow();
      expect(existsSync(dirPath)).toBe(true);
    });

    it("should create nested directories", async () => {
      const dirPath = join(testDir, "a", "b", "c");

      await ensureDirectoryExists(dirPath);

      expect(existsSync(dirPath)).toBe(true);
    });

    it("should handle existing nested directories", async () => {
      const parentPath = join(testDir, "parent");
      const childPath = join(parentPath, "child");

      mkdirSync(parentPath, { recursive: true });

      await ensureDirectoryExists(childPath);

      expect(existsSync(childPath)).toBe(true);
    });

    it("should reject for invalid path", async () => {
      const dirPath = "\0invalid";

      await expect(ensureDirectoryExists(dirPath)).rejects.toThrow();
    });
  });
});
