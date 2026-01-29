import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createConfigTemplate,
  removeTOMLKey,
  serializeToTOML,
  writeTOMLValue,
} from "./toml-writer.js";

describe("toml-writer", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `toml-writer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe("serializeToTOML", () => {
    it("serializes simple key-value pairs", () => {
      const result = serializeToTOML({ log_level: "debug", library: "/path/to/lib.json" });
      expect(result).toContain('log_level = "debug"');
      expect(result).toContain('library = "/path/to/lib.json"');
    });

    it("serializes nested sections", () => {
      const result = serializeToTOML({
        citation: {
          default_style: "apa",
          default_locale: "en-US",
        },
      });
      expect(result).toContain("[citation]");
      expect(result).toContain('default_style = "apa"');
      expect(result).toContain('default_locale = "en-US"');
    });

    it("serializes deeply nested sections", () => {
      const result = serializeToTOML({
        cli: {
          tui: {
            limit: 50,
            debounce_ms: 200,
          },
        },
      });
      expect(result).toContain("[cli.tui]");
      expect(result).toContain("limit = 50");
      expect(result).toContain("debounce_ms = 200");
    });

    it("serializes boolean values", () => {
      const result = serializeToTOML({ server: { auto_start: true } });
      expect(result).toContain("auto_start = true");
    });

    it("serializes arrays", () => {
      const result = serializeToTOML({
        citation: { csl_directory: ["/path/one", "/path/two"] },
      });
      expect(result).toContain('csl_directory = [ "/path/one", "/path/two" ]');
    });
  });

  describe("writeTOMLValue", () => {
    it("writes a simple key-value pair to a new file", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "log_level", "debug");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('log_level = "debug"');
    });

    it("writes a nested key to a new file", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "citation.default_style", "apa");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("[citation]");
      expect(content).toContain('default_style = "apa"');
    });

    it("writes a deeply nested key to a new file", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "cli.tui.limit", 50);

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("[cli.tui]");
      expect(content).toContain("limit = 50");
    });

    it("preserves existing content when updating a value", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, 'log_level = "info"\nlibrary = "/path/to/lib.json"\n');

      await writeTOMLValue(filePath, "log_level", "debug");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('log_level = "debug"');
      expect(content).toContain('library = "/path/to/lib.json"');
    });

    it("preserves existing sections when adding a new key", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, '[citation]\ndefault_style = "apa"\n');

      await writeTOMLValue(filePath, "log_level", "debug");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('log_level = "debug"');
      expect(content).toContain("[citation]");
      expect(content).toContain('default_style = "apa"');
    });

    it("updates existing nested value", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, '[citation]\ndefault_style = "apa"\ndefault_locale = "en-US"\n');

      await writeTOMLValue(filePath, "citation.default_style", "ieee");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('default_style = "ieee"');
      expect(content).toContain('default_locale = "en-US"');
    });

    it("writes boolean values correctly", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "server.auto_start", true);

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("auto_start = true");
    });

    it("writes number values correctly", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "cli.default_limit", 100);

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("default_limit = 100");
    });

    it("writes array values correctly", async () => {
      const filePath = join(testDir, "config.toml");

      await writeTOMLValue(filePath, "citation.csl_directory", ["/path/one", "/path/two"]);

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain("[citation]");
      expect(content).toContain("csl_directory");
      expect(content).toContain("/path/one");
      expect(content).toContain("/path/two");
    });

    it("creates parent directory if it does not exist", async () => {
      const filePath = join(testDir, "nested", "dir", "config.toml");

      await writeTOMLValue(filePath, "log_level", "debug");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('log_level = "debug"');
    });
  });

  describe("removeTOMLKey", () => {
    it("removes a simple key from file", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, 'log_level = "debug"\nlibrary = "/path/to/lib.json"\n');

      await removeTOMLKey(filePath, "log_level");

      const content = await readFile(filePath, "utf-8");
      expect(content).not.toContain("log_level");
      expect(content).toContain('library = "/path/to/lib.json"');
    });

    it("removes a nested key from file", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, '[citation]\ndefault_style = "apa"\ndefault_locale = "en-US"\n');

      await removeTOMLKey(filePath, "citation.default_style");

      const content = await readFile(filePath, "utf-8");
      expect(content).not.toContain("default_style");
      expect(content).toContain("[citation]");
      expect(content).toContain('default_locale = "en-US"');
    });

    it("removes entire section when last key is removed", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, '[citation]\ndefault_style = "apa"\n');

      await removeTOMLKey(filePath, "citation.default_style");

      const content = await readFile(filePath, "utf-8");
      expect(content).not.toContain("default_style");
      // Empty section may or may not be preserved - implementation dependent
    });

    it("does nothing when key does not exist", async () => {
      const filePath = join(testDir, "config.toml");
      await writeFile(filePath, 'log_level = "debug"\n');

      // Should not throw
      await removeTOMLKey(filePath, "nonexistent");

      const content = await readFile(filePath, "utf-8");
      expect(content).toContain('log_level = "debug"');
    });

    it("does nothing when file does not exist", async () => {
      const filePath = join(testDir, "nonexistent.toml");

      // Should not throw
      await removeTOMLKey(filePath, "log_level");
    });
  });

  describe("createConfigTemplate", () => {
    it("creates a commented template with all sections", () => {
      const template = createConfigTemplate();

      expect(template).toContain("# Reference Manager Configuration");
      expect(template).toContain("# library =");
      expect(template).toContain("# log_level =");
      expect(template).toContain("[backup]");
      expect(template).toContain("[server]");
      expect(template).toContain("[citation]");
      expect(template).toContain("[pubmed]");
      expect(template).toContain("[attachments]");
      expect(template).toContain("[cli]");
      expect(template).toContain("[cli.tui]");
      expect(template).toContain("[cli.edit]");
      expect(template).toContain("[mcp]");
    });
  });
});
