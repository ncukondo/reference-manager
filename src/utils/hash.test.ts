import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeFileHash, computeHash } from "./hash";

describe("Hash Utils", () => {
  describe("computeHash", () => {
    it("should compute SHA-256 hash for string", () => {
      const input = "hello world";
      const hash = computeHash(input);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 is 64 hex chars
    });

    it("should produce consistent hash for same input", () => {
      const input = "test data";
      const hash1 = computeHash(input);
      const hash2 = computeHash(input);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = computeHash("input1");
      const hash2 = computeHash("input2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      const hash = computeHash("");

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle unicode characters", () => {
      const input = "こんにちは 世界 🌍";
      const hash = computeHash(input);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce known hash for known input", () => {
      // SHA-256 of "test" is known
      const hash = computeHash("test");
      const expected = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

      expect(hash).toBe(expected);
    });

    it("should handle large strings", () => {
      const largeInput = "x".repeat(100000);
      const hash = computeHash(largeInput);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle newlines and special characters", () => {
      const input = "line1\nline2\ttab\r\nwindows";
      const hash = computeHash(input);

      expect(hash).toBeDefined();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("computeFileHash", () => {
    const testDir = tmpdir();

    it("should compute hash for existing file", async () => {
      const filePath = join(testDir, `test-hash-${Date.now()}.txt`);
      writeFileSync(filePath, "test content", "utf-8");

      try {
        const hash = await computeFileHash(filePath);

        expect(hash).toBeDefined();
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        unlinkSync(filePath);
      }
    });

    it("should produce consistent hash for same file content", async () => {
      const filePath = join(testDir, `test-hash-${Date.now()}.txt`);
      const content = "consistent content";
      writeFileSync(filePath, content, "utf-8");

      try {
        const hash1 = await computeFileHash(filePath);
        const hash2 = await computeFileHash(filePath);

        expect(hash1).toBe(hash2);
      } finally {
        unlinkSync(filePath);
      }
    });

    it("should match string hash for file with same content", async () => {
      const content = "matching content";
      const filePath = join(testDir, `test-hash-${Date.now()}.txt`);
      writeFileSync(filePath, content, "utf-8");

      try {
        const fileHash = await computeFileHash(filePath);
        const stringHash = computeHash(content);

        expect(fileHash).toBe(stringHash);
      } finally {
        unlinkSync(filePath);
      }
    });

    it("should handle large files", async () => {
      const largeContent = "x".repeat(100000);
      const filePath = join(testDir, `test-hash-large-${Date.now()}.txt`);
      writeFileSync(filePath, largeContent, "utf-8");

      try {
        const hash = await computeFileHash(filePath);

        expect(hash).toBeDefined();
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        unlinkSync(filePath);
      }
    });

    it("should reject for non-existent file", async () => {
      const filePath = join(testDir, `non-existent-${Date.now()}.txt`);

      await expect(computeFileHash(filePath)).rejects.toThrow();
    });

    it("should handle empty file", async () => {
      const filePath = join(testDir, `test-hash-empty-${Date.now()}.txt`);
      writeFileSync(filePath, "", "utf-8");

      try {
        const hash = await computeFileHash(filePath);

        expect(hash).toBeDefined();
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
      } finally {
        unlinkSync(filePath);
      }
    });
  });
});
