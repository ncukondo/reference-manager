/**
 * Tests for config path subcommand
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { showConfigPaths } from "./path.js";

describe("showConfigPaths", () => {
  const originalEnv = process.env;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = join(process.cwd(), `.test-config-paths-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Cleanup
    process.env = originalEnv;
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe("showing all paths", () => {
    it("should show user and local config paths", () => {
      const result = showConfigPaths({}, { cwd: tempDir });

      // Should contain "User:" and "Local:" labels
      expect(result).toContain("User:");
      expect(result).toContain("Local:");

      // Should show config.toml path
      expect(result).toContain("config.toml");

      // Should show local config filename
      expect(result).toContain(".reference-manager.config.toml");
    });

    it("should show existence status for user config", () => {
      const result = showConfigPaths({}, { cwd: tempDir });

      // User config likely doesn't exist in test environment
      expect(result).toMatch(/User:.*\((exists|not found)\)/);
    });

    it("should show existence status for local config", () => {
      // Local config doesn't exist initially
      let result = showConfigPaths({}, { cwd: tempDir });
      expect(result).toMatch(/Local:.*\(not found\)/);

      // Create local config
      writeFileSync(join(tempDir, ".reference-manager.config.toml"), "");
      result = showConfigPaths({}, { cwd: tempDir });
      expect(result).toMatch(/Local:.*\(exists\)/);
    });

    it("should show environment config path when set", () => {
      const envConfigPath = "/custom/env/config.toml";
      process.env.REFERENCE_MANAGER_CONFIG = envConfigPath;

      const result = showConfigPaths({}, { cwd: tempDir });

      expect(result).toContain("Env:");
      expect(result).toContain(envConfigPath);
      expect(result).toContain("REFERENCE_MANAGER_CONFIG");
    });
  });

  describe("--user flag", () => {
    it("should show only user config path when --user is provided", () => {
      const result = showConfigPaths({ user: true }, { cwd: tempDir });

      // Should contain user path
      expect(result).toContain("config.toml");

      // Should NOT contain Local: label
      expect(result).not.toContain("Local:");

      // Should not include .reference-manager.config.toml
      expect(result).not.toContain(".reference-manager.config.toml");
    });

    it("should show user path without label when --user is provided", () => {
      const result = showConfigPaths({ user: true }, { cwd: tempDir });
      const lines = result.split("\n").filter((l) => l.trim());

      // Should be a single line (just the path)
      expect(lines.length).toBe(1);
      expect(lines[0]).not.toContain("User:");
    });
  });

  describe("--local flag", () => {
    it("should show only local config path when --local is provided", () => {
      const result = showConfigPaths({ local: true }, { cwd: tempDir });

      // Should contain local config path
      expect(result).toContain(".reference-manager.config.toml");

      // Should NOT contain User: label
      expect(result).not.toContain("User:");
    });

    it("should show local path without label when --local is provided", () => {
      const result = showConfigPaths({ local: true }, { cwd: tempDir });
      const lines = result.split("\n").filter((l) => l.trim());

      // Should be a single line (just the path)
      expect(lines.length).toBe(1);
      expect(lines[0]).not.toContain("Local:");
    });

    it("should use cwd for local path", () => {
      const result = showConfigPaths({ local: true }, { cwd: tempDir });

      expect(result).toContain(tempDir);
    });
  });

  describe("existence status", () => {
    it("should correctly detect existing user config", () => {
      // Create a user config file for testing
      const userConfigDir = join(tempDir, ".config", "reference-manager");
      mkdirSync(userConfigDir, { recursive: true });
      const userConfigPath = join(userConfigDir, "config.toml");
      writeFileSync(userConfigPath, "# test config");

      const result = showConfigPaths({}, { cwd: tempDir, userConfigPath });

      expect(result).toMatch(/User:.*\(exists\)/);
    });

    it("should correctly detect non-existing env config", () => {
      process.env.REFERENCE_MANAGER_CONFIG = "/nonexistent/config.toml";

      const result = showConfigPaths({}, { cwd: tempDir });

      expect(result).toMatch(/Env:.*\(not found\)/);
    });
  });
});
