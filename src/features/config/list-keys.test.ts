/**
 * Tests for config list-keys subcommand
 */

import { describe, expect, it } from "vitest";
import { listConfigKeys } from "./list-keys.js";

describe("listConfigKeys", () => {
  describe("listing all keys", () => {
    it("should list all available configuration keys", () => {
      const result = listConfigKeys({});
      const lines = result.split("\n").filter((line) => line.trim());

      // Should include some well-known keys
      expect(result).toContain("library");
      expect(result).toContain("log_level");
      expect(result).toContain("citation.default_style");
      expect(result).toContain("cli.tui.limit");

      // Should have multiple keys
      expect(lines.length).toBeGreaterThan(10);
    });

    it("should show key type for each key", () => {
      const result = listConfigKeys({});

      // library is a string
      expect(result).toMatch(/library\s+string/);

      // log_level is an enum
      expect(result).toMatch(/log_level\s+enum/);

      // cli.default_limit is an integer
      expect(result).toMatch(/cli\.default_limit\s+integer/);

      // server.auto_start is a boolean
      expect(result).toMatch(/server\.auto_start\s+boolean/);

      // citation.csl_directory is a string array
      expect(result).toMatch(/citation\.csl_directory\s+string\[\]/);
    });

    it("should show description for each key", () => {
      const result = listConfigKeys({});

      // Check descriptions
      expect(result).toContain("Path to library file");
      expect(result).toContain("Log level");
      expect(result).toContain("Default citation style");
    });
  });

  describe("section filter", () => {
    it("should filter by section when --section is provided", () => {
      const result = listConfigKeys({ section: "citation" });
      const lines = result.split("\n").filter((line) => line.trim());

      // Should only include citation keys
      expect(result).toContain("citation.default_style");
      expect(result).toContain("citation.csl_directory");
      expect(result).toContain("citation.default_locale");
      expect(result).toContain("citation.default_format");
      expect(result).toContain("citation.default_key_format");

      // Should NOT include other sections
      expect(result).not.toContain("library ");
      expect(result).not.toContain("log_level ");
      expect(result).not.toContain("cli.default_limit");
      expect(result).not.toContain("server.auto_start");

      // Should have exactly 5 citation keys
      expect(lines.length).toBe(5);
    });

    it("should filter by cli section including nested keys", () => {
      const result = listConfigKeys({ section: "cli" });

      // Should include cli keys and nested keys
      expect(result).toContain("cli.default_limit");
      expect(result).toContain("cli.default_sort");
      expect(result).toContain("cli.default_order");
      expect(result).toContain("cli.tui.limit");
      expect(result).toContain("cli.tui.debounce_ms");
      expect(result).toContain("cli.edit.default_format");

      // Should NOT include other sections
      expect(result).not.toContain("citation.default_style");
    });

    it("should return empty result for unknown section", () => {
      const result = listConfigKeys({ section: "nonexistent" });
      const lines = result.split("\n").filter((line) => line.trim());

      expect(lines.length).toBe(0);
    });
  });

  describe("output format", () => {
    it("should format output in aligned columns", () => {
      const result = listConfigKeys({});
      const lines = result.split("\n").filter((line) => line.trim());

      // Each line should have consistent formatting
      // Format: key <spaces> type <spaces> description
      for (const line of lines) {
        // Should have at least two whitespace-separated sections
        const parts = line.split(/\s{2,}/);
        expect(parts.length).toBeGreaterThanOrEqual(3);

        // First part is the key
        expect(parts[0]).toMatch(/^[\w.]+$/);

        // Second part is the type
        expect(parts[1]).toMatch(/^(string|integer|boolean|enum|string\[\])$/);
      }
    });

    it("should sort keys alphabetically", () => {
      const result = listConfigKeys({});
      const lines = result.split("\n").filter((line) => line.trim());

      // Extract keys from lines
      const keys = lines.map((line) => line.split(/\s+/)[0]);

      // Verify sorted
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });
});
