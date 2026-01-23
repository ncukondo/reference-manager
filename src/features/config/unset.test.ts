import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unsetConfigValue } from "./unset.js";

describe("unsetConfigValue", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `config-unset-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    configPath = join(testDir, "config.toml");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("removing simple keys", () => {
    it("removes a simple key from file", async () => {
      await writeFile(configPath, 'log_level = "debug"\nlibrary = "/path/to/lib.json"\n');

      const result = await unsetConfigValue(configPath, "log_level");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).not.toContain("log_level");
      expect(content).toContain('library = "/path/to/lib.json"');
    });
  });

  describe("removing nested keys", () => {
    it("removes a nested key from file", async () => {
      await writeFile(configPath, '[citation]\ndefault_style = "apa"\ndefault_locale = "en-US"\n');

      const result = await unsetConfigValue(configPath, "citation.default_style");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).not.toContain("default_style");
      expect(content).toContain('default_locale = "en-US"');
    });

    it("removes a deeply nested key", async () => {
      await writeFile(configPath, "[cli.tui]\nlimit = 50\ndebounce_ms = 200\n");

      const result = await unsetConfigValue(configPath, "cli.tui.limit");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).not.toContain("limit");
      expect(content).toContain("debounce_ms = 200");
    });
  });

  describe("no-op scenarios", () => {
    it("succeeds when key does not exist in file", async () => {
      await writeFile(configPath, 'library = "/path/to/lib.json"\n');

      const result = await unsetConfigValue(configPath, "log_level");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('library = "/path/to/lib.json"');
    });

    it("succeeds when file does not exist", async () => {
      const result = await unsetConfigValue(configPath, "log_level");

      expect(result.success).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("returns error for invalid key", async () => {
      const result = await unsetConfigValue(configPath, "invalid.key");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });

  describe("preserving other values", () => {
    it("preserves other values in same section", async () => {
      await writeFile(
        configPath,
        '[citation]\ndefault_style = "apa"\ndefault_locale = "en-US"\ndefault_format = "text"\n'
      );

      await unsetConfigValue(configPath, "citation.default_style");

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("[citation]");
      expect(content).toContain('default_locale = "en-US"');
      expect(content).toContain('default_format = "text"');
    });
  });
});
