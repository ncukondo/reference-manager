import { describe, expect, it } from "vitest";
import {
  getAllConfigKeys,
  getConfigKeyInfo,
  isValidConfigKey,
  parseConfigKey,
} from "./key-parser.js";

describe("key-parser", () => {
  describe("parseConfigKey", () => {
    it("parses simple keys", () => {
      expect(parseConfigKey("library")).toEqual(["library"]);
      expect(parseConfigKey("log_level")).toEqual(["log_level"]);
    });

    it("parses nested keys", () => {
      expect(parseConfigKey("citation.default_style")).toEqual(["citation", "default_style"]);
      expect(parseConfigKey("backup.max_generations")).toEqual(["backup", "max_generations"]);
    });

    it("parses deeply nested keys", () => {
      expect(parseConfigKey("cli.tui.limit")).toEqual(["cli", "tui", "limit"]);
      expect(parseConfigKey("cli.edit.default_format")).toEqual(["cli", "edit", "default_format"]);
    });
  });

  describe("isValidConfigKey", () => {
    it("returns true for valid simple keys", () => {
      expect(isValidConfigKey("library")).toBe(true);
      expect(isValidConfigKey("log_level")).toBe(true);
    });

    it("returns true for valid nested keys", () => {
      expect(isValidConfigKey("citation.default_style")).toBe(true);
      expect(isValidConfigKey("citation.csl_directory")).toBe(true);
      expect(isValidConfigKey("citation.default_key_format")).toBe(true);
      expect(isValidConfigKey("backup.max_generations")).toBe(true);
      expect(isValidConfigKey("server.auto_start")).toBe(true);
      expect(isValidConfigKey("fulltext.preferred_type")).toBe(true);
    });

    it("returns true for valid deeply nested keys", () => {
      expect(isValidConfigKey("cli.tui.limit")).toBe(true);
      expect(isValidConfigKey("cli.tui.debounce_ms")).toBe(true);
      expect(isValidConfigKey("cli.edit.default_format")).toBe(true);
    });

    it("returns false for invalid keys", () => {
      expect(isValidConfigKey("invalid")).toBe(false);
      expect(isValidConfigKey("citation.invalid")).toBe(false);
      expect(isValidConfigKey("cli.tui.invalid")).toBe(false);
    });

    it("returns false for partial paths", () => {
      expect(isValidConfigKey("citation")).toBe(false);
      expect(isValidConfigKey("cli")).toBe(false);
      expect(isValidConfigKey("cli.tui")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidConfigKey("")).toBe(false);
    });
  });

  describe("getConfigKeyInfo", () => {
    it("returns info for string keys", () => {
      const info = getConfigKeyInfo("library");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("string");
      expect(info?.description).toBeDefined();
    });

    it("returns info for enum keys", () => {
      const info = getConfigKeyInfo("log_level");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("enum");
      expect(info?.enumValues).toContain("silent");
      expect(info?.enumValues).toContain("info");
      expect(info?.enumValues).toContain("debug");
    });

    it("returns info for integer keys", () => {
      const info = getConfigKeyInfo("cli.default_limit");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("integer");
    });

    it("returns info for boolean keys", () => {
      const info = getConfigKeyInfo("server.auto_start");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("boolean");
    });

    it("returns info for array keys", () => {
      const info = getConfigKeyInfo("citation.csl_directory");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("string[]");
    });

    it("returns info for nested keys", () => {
      const info = getConfigKeyInfo("cli.tui.limit");
      expect(info).not.toBeNull();
      expect(info?.type).toBe("integer");
    });

    it("returns null for invalid keys", () => {
      expect(getConfigKeyInfo("invalid")).toBeNull();
      expect(getConfigKeyInfo("citation.invalid")).toBeNull();
    });
  });

  describe("getAllConfigKeys", () => {
    it("returns all valid config keys", () => {
      const keys = getAllConfigKeys();

      // Check some expected keys exist
      expect(keys).toContain("library");
      expect(keys).toContain("log_level");
      expect(keys).toContain("citation.default_style");
      expect(keys).toContain("cli.tui.limit");
      expect(keys).toContain("server.auto_start");
    });

    it("does not include section-only keys", () => {
      const keys = getAllConfigKeys();

      // These are sections, not leaf values
      expect(keys).not.toContain("citation");
      expect(keys).not.toContain("cli");
      expect(keys).not.toContain("cli.tui");
    });

    it("returns keys sorted alphabetically", () => {
      const keys = getAllConfigKeys();
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);
    });

    it("can filter by section", () => {
      const citationKeys = getAllConfigKeys("citation");

      expect(citationKeys).toContain("citation.default_style");
      expect(citationKeys).toContain("citation.csl_directory");
      expect(citationKeys).toContain("citation.default_key_format");
      expect(citationKeys).not.toContain("library");
      expect(citationKeys).not.toContain("cli.tui.limit");
    });
  });
});
