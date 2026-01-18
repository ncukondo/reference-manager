/**
 * Tests for write target resolution
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveWriteTarget } from "./write-target.js";

describe("resolveWriteTarget", () => {
  let testDir: string;
  let userConfigPath: string;
  let localConfigPath: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `write-target-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    mkdirSync(testDir, { recursive: true });
    userConfigPath = join(testDir, "user-config", "config.toml");
    localConfigPath = join(testDir, ".reference-manager.config.toml");
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("with --local flag", () => {
    it("should return local config path even if it does not exist", () => {
      const result = resolveWriteTarget({
        local: true,
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(localConfigPath);
      expect(existsSync(result)).toBe(false);
    });

    it("should return local config path when it exists", () => {
      writeFileSync(localConfigPath, 'log_level = "info"\n');

      const result = resolveWriteTarget({
        local: true,
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(localConfigPath);
    });
  });

  describe("with --user flag", () => {
    it("should return user config path even if local config exists", () => {
      writeFileSync(localConfigPath, 'log_level = "info"\n');

      const result = resolveWriteTarget({
        user: true,
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(userConfigPath);
    });

    it("should return user config path when local config does not exist", () => {
      const result = resolveWriteTarget({
        user: true,
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(userConfigPath);
    });
  });

  describe("without flags (auto-detection)", () => {
    it("should return local config path when it exists", () => {
      writeFileSync(localConfigPath, 'log_level = "info"\n');

      const result = resolveWriteTarget({
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(localConfigPath);
    });

    it("should return user config path when local config does not exist", () => {
      const result = resolveWriteTarget({
        cwd: testDir,
        userConfigPath,
      });

      expect(result).toBe(userConfigPath);
    });
  });

  describe("flag priority", () => {
    it("--local takes precedence over --user", () => {
      // Both flags set (edge case, shouldn't happen in practice)
      const result = resolveWriteTarget({
        local: true,
        user: true,
        cwd: testDir,
        userConfigPath,
      });

      // --local should win
      expect(result).toBe(localConfigPath);
    });
  });
});
