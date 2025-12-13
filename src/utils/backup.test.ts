import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createBackup, cleanupOldBackups, getBackupDirectory, listBackups } from "./backup";
import { writeFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Backup Utils", () => {
  let testDir: string;
  let libraryName: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `backup-test-${Date.now()}`);
    libraryName = "test-library";
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("getBackupDirectory", () => {
    it("should return backup directory path", () => {
      const backupDir = getBackupDirectory(libraryName);

      expect(backupDir).toContain("reference-manager");
      expect(backupDir).toContain("backups");
      expect(backupDir).toContain(libraryName);
    });

    it("should handle different library names", () => {
      const backupDir1 = getBackupDirectory("lib1");
      const backupDir2 = getBackupDirectory("lib2");

      expect(backupDir1).not.toBe(backupDir2);
      expect(backupDir1).toContain("lib1");
      expect(backupDir2).toContain("lib2");
    });
  });

  describe("createBackup", () => {
    it("should create backup file with timestamp", async () => {
      const sourceFile = join(testDir, "source.json");
      const content = '{"test": "data"}';
      writeFileSync(sourceFile, content);

      const backupPath = await createBackup(sourceFile, libraryName);

      expect(existsSync(backupPath)).toBe(true);
      expect(backupPath).toContain(libraryName);
      expect(backupPath).toMatch(/\.backup$/);
    });

    it("should preserve file content in backup", async () => {
      const sourceFile = join(testDir, "source.json");
      const content = '{"test": "data", "unicode": "日本語"}';
      writeFileSync(sourceFile, content, "utf-8");

      const backupPath = await createBackup(sourceFile, libraryName);

      const { readFileSync } = await import("node:fs");
      const backupContent = readFileSync(backupPath, "utf-8");
      expect(backupContent).toBe(content);
    });

    it("should create backup directory if it does not exist", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content");

      const backupPath = await createBackup(sourceFile, libraryName);
      const backupDir = getBackupDirectory(libraryName);

      expect(existsSync(backupDir)).toBe(true);
      expect(existsSync(backupPath)).toBe(true);
    });

    it("should handle large files", async () => {
      const sourceFile = join(testDir, "large.json");
      const largeContent = JSON.stringify({ data: "x".repeat(100000) });
      writeFileSync(sourceFile, largeContent);

      const backupPath = await createBackup(sourceFile, libraryName);

      expect(existsSync(backupPath)).toBe(true);
      expect(statSync(backupPath).size).toBeGreaterThan(0);
    });

    it("should create unique backup filenames for multiple backups", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content1");

      const backup1 = await createBackup(sourceFile, libraryName);

      await new Promise((resolve) => setTimeout(resolve, 10));

      writeFileSync(sourceFile, "content2");
      const backup2 = await createBackup(sourceFile, libraryName);

      expect(backup1).not.toBe(backup2);
      expect(existsSync(backup1)).toBe(true);
      expect(existsSync(backup2)).toBe(true);
    });
  });

  describe("listBackups", () => {
    it("should list all backups for a library", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content");

      await createBackup(sourceFile, libraryName);
      await createBackup(sourceFile, libraryName);

      const backups = await listBackups(libraryName);

      expect(backups.length).toBeGreaterThanOrEqual(2);
      expect(backups.every((b) => b.endsWith(".backup"))).toBe(true);
    });

    it("should return empty array if no backups exist", async () => {
      const backups = await listBackups("non-existent-library");

      expect(backups).toEqual([]);
    });

    it("should sort backups by modification time (newest first)", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content1");

      const backup1 = await createBackup(sourceFile, libraryName);
      await new Promise((resolve) => setTimeout(resolve, 100));

      writeFileSync(sourceFile, "content2");
      const backup2 = await createBackup(sourceFile, libraryName);

      const backups = await listBackups(libraryName);

      const index1 = backups.indexOf(backup1);
      const index2 = backups.indexOf(backup2);

      expect(index2).toBeLessThan(index1);
    });
  });

  describe("cleanupOldBackups", () => {
    it("should keep backups within generation limit", async () => {
      const sourceFile = join(testDir, "source.json");

      for (let i = 0; i < 5; i++) {
        writeFileSync(sourceFile, `content${i}`);
        await createBackup(sourceFile, libraryName);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await cleanupOldBackups(libraryName, { maxGenerations: 3 });

      const backups = await listBackups(libraryName);
      expect(backups.length).toBe(3);
    });

    it("should delete backups older than max age", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content");

      const backup = await createBackup(sourceFile, libraryName);

      const oldDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
      const { utimesSync } = await import("node:fs");
      utimesSync(backup, oldDate, oldDate);

      await cleanupOldBackups(libraryName, { maxAgeMs: 365 * 24 * 60 * 60 * 1000 });

      const backups = await listBackups(libraryName);
      expect(backups).not.toContain(backup);
    });

    it("should apply both generation and age limits", async () => {
      const sourceFile = join(testDir, "source.json");

      for (let i = 0; i < 3; i++) {
        writeFileSync(sourceFile, `content${i}`);
        await createBackup(sourceFile, libraryName);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await cleanupOldBackups(libraryName, {
        maxGenerations: 2,
        maxAgeMs: 365 * 24 * 60 * 60 * 1000,
      });

      const backups = await listBackups(libraryName);
      expect(backups.length).toBeLessThanOrEqual(2);
    });

    it("should not delete backups if within limits", async () => {
      const sourceFile = join(testDir, "source.json");
      writeFileSync(sourceFile, "content");

      await createBackup(sourceFile, libraryName);
      await createBackup(sourceFile, libraryName);

      const beforeBackups = await listBackups(libraryName);

      await cleanupOldBackups(libraryName, {
        maxGenerations: 50,
        maxAgeMs: 365 * 24 * 60 * 60 * 1000,
      });

      const afterBackups = await listBackups(libraryName);
      expect(afterBackups.length).toBe(beforeBackups.length);
    });

    it("should handle cleanup with no backups", async () => {
      await expect(
        cleanupOldBackups("non-existent", {
          maxGenerations: 50,
          maxAgeMs: 365 * 24 * 60 * 60 * 1000,
        })
      ).resolves.not.toThrow();
    });

    it("should use default limits if not specified", async () => {
      const sourceFile = join(testDir, "source.json");

      for (let i = 0; i < 60; i++) {
        writeFileSync(sourceFile, `content${i}`);
        await createBackup(sourceFile, libraryName);
      }

      await cleanupOldBackups(libraryName);

      const backups = await listBackups(libraryName);
      expect(backups.length).toBeLessThanOrEqual(50);
    });
  });
});
