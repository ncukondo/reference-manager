import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setConfigValue } from "./set.js";

describe("setConfigValue", () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `config-set-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    configPath = join(testDir, "config.toml");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("string values", () => {
    it("sets a string value in a new file", async () => {
      const result = await setConfigValue(configPath, "library", "/new/library.json");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('library = "/new/library.json"');
    });

    it("sets a nested string value", async () => {
      const result = await setConfigValue(configPath, "citation.default_style", "ieee");

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("[citation]");
      expect(content).toContain('default_style = "ieee"');
    });
  });

  describe("number values", () => {
    it("sets an integer value", async () => {
      const result = await setConfigValue(configPath, "cli.default_limit", 100);

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("default_limit = 100");
    });

    it("sets a deeply nested integer value", async () => {
      const result = await setConfigValue(configPath, "cli.interactive.limit", 50);

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("[cli.interactive]");
      expect(content).toContain("limit = 50");
    });
  });

  describe("boolean values", () => {
    it("sets a boolean value to true", async () => {
      const result = await setConfigValue(configPath, "server.auto_start", true);

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("auto_start = true");
    });

    it("sets a boolean value to false", async () => {
      const result = await setConfigValue(configPath, "server.auto_start", false);

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("auto_start = false");
    });
  });

  describe("array values", () => {
    it("sets an array value", async () => {
      const result = await setConfigValue(configPath, "citation.csl_directory", ["/a", "/b"]);

      expect(result.success).toBe(true);
      const content = await readFile(configPath, "utf-8");
      expect(content).toContain("/a");
      expect(content).toContain("/b");
    });
  });

  describe("validation errors", () => {
    it("rejects invalid key", async () => {
      const result = await setConfigValue(configPath, "invalid.key", "value");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown");
    });

    it("rejects invalid value type", async () => {
      const result = await setConfigValue(
        configPath,
        "cli.default_limit",
        "not a number" as unknown as number
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("rejects invalid enum value", async () => {
      const result = await setConfigValue(configPath, "log_level", "verbose");

      expect(result.success).toBe(false);
      expect(result.error).toContain("silent");
    });
  });

  describe("preserving existing content", () => {
    it("preserves existing values when adding new key", async () => {
      await writeFile(configPath, 'library = "/original/library.json"\n');

      await setConfigValue(configPath, "log_level", "debug");

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('library = "/original/library.json"');
      expect(content).toContain('log_level = "debug"');
    });

    it("preserves other section values when updating", async () => {
      await writeFile(configPath, '[citation]\ndefault_style = "apa"\ndefault_locale = "en-US"\n');

      await setConfigValue(configPath, "citation.default_style", "ieee");

      const content = await readFile(configPath, "utf-8");
      expect(content).toContain('default_style = "ieee"');
      expect(content).toContain('default_locale = "en-US"');
    });
  });

  describe("environment override warning", () => {
    it("returns warning when env override is active", async () => {
      const result = await setConfigValue(configPath, "library", "/new/library.json", {
        envOverrideInfo: {
          envVar: "REFERENCE_MANAGER_LIBRARY",
          value: "/env/library.json",
        },
      });

      expect(result.success).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain("REFERENCE_MANAGER_LIBRARY");
    });

    it("does not return warning when no env override", async () => {
      const result = await setConfigValue(configPath, "library", "/new/library.json");

      expect(result.success).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });
});
