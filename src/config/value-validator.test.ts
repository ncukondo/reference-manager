import { describe, expect, it } from "vitest";
import { parseValueForKey, validateConfigValue } from "./value-validator.js";

describe("value-validator", () => {
  describe("validateConfigValue", () => {
    describe("string validation", () => {
      it("accepts valid strings", () => {
        const result = validateConfigValue("library", "/path/to/lib.json");
        expect(result.valid).toBe(true);
        expect(result.value).toBe("/path/to/lib.json");
      });

      it("rejects empty strings for required string keys", () => {
        const result = validateConfigValue("library", "");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("empty");
      });

      it("accepts empty strings for optional string keys", () => {
        const result = validateConfigValue("pubmed.email", "");
        expect(result.valid).toBe(true);
      });
    });

    describe("integer validation", () => {
      it("accepts valid integers", () => {
        const result = validateConfigValue("cli.default_limit", 50);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(50);
      });

      it("accepts zero for non-negative integers", () => {
        const result = validateConfigValue("cli.default_limit", 0);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(0);
      });

      it("rejects negative numbers for non-negative integers", () => {
        const result = validateConfigValue("cli.default_limit", -1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("non-negative");
      });

      it("rejects non-integer numbers", () => {
        const result = validateConfigValue("cli.default_limit", 50.5);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("integer");
      });

      it("rejects positive integer requirement for zero", () => {
        const result = validateConfigValue("backup.max_generations", 0);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("positive");
      });
    });

    describe("boolean validation", () => {
      it("accepts true", () => {
        const result = validateConfigValue("server.auto_start", true);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(true);
      });

      it("accepts false", () => {
        const result = validateConfigValue("server.auto_start", false);
        expect(result.valid).toBe(true);
        expect(result.value).toBe(false);
      });

      it("rejects non-boolean values", () => {
        const result = validateConfigValue("server.auto_start", "true");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("boolean");
      });
    });

    describe("enum validation", () => {
      it("accepts valid enum values", () => {
        const result = validateConfigValue("log_level", "debug");
        expect(result.valid).toBe(true);
        expect(result.value).toBe("debug");
      });

      it("rejects invalid enum values", () => {
        const result = validateConfigValue("log_level", "verbose");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("silent");
        expect(result.error).toContain("info");
        expect(result.error).toContain("debug");
      });

      it("validates citation format enum", () => {
        expect(validateConfigValue("citation.default_format", "text").valid).toBe(true);
        expect(validateConfigValue("citation.default_format", "html").valid).toBe(true);
        expect(validateConfigValue("citation.default_format", "rtf").valid).toBe(true);
        expect(validateConfigValue("citation.default_format", "pdf").valid).toBe(false);
      });

      it("validates sort field enum", () => {
        expect(validateConfigValue("cli.default_sort", "created").valid).toBe(true);
        expect(validateConfigValue("cli.default_sort", "updated").valid).toBe(true);
        expect(validateConfigValue("cli.default_sort", "invalid").valid).toBe(false);
      });

      it("validates sort order enum", () => {
        expect(validateConfigValue("cli.default_order", "asc").valid).toBe(true);
        expect(validateConfigValue("cli.default_order", "desc").valid).toBe(true);
        expect(validateConfigValue("cli.default_order", "ascending").valid).toBe(false);
      });
    });

    describe("array validation", () => {
      it("accepts string arrays", () => {
        const result = validateConfigValue("citation.csl_directory", ["/path/one", "/path/two"]);
        expect(result.valid).toBe(true);
        expect(result.value).toEqual(["/path/one", "/path/two"]);
      });

      it("accepts empty arrays", () => {
        const result = validateConfigValue("citation.csl_directory", []);
        expect(result.valid).toBe(true);
        expect(result.value).toEqual([]);
      });

      it("rejects non-array values for array keys", () => {
        const result = validateConfigValue("citation.csl_directory", "/single/path");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("array");
      });
    });

    describe("invalid key handling", () => {
      it("rejects unknown keys", () => {
        const result = validateConfigValue("invalid.key", "value");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Unknown");
      });
    });
  });

  describe("parseValueForKey", () => {
    it("parses string values as-is", () => {
      expect(parseValueForKey("library", "/path/to/lib")).toBe("/path/to/lib");
    });

    it("parses integer values from strings", () => {
      expect(parseValueForKey("cli.default_limit", "50")).toBe(50);
    });

    it("parses boolean values from strings", () => {
      expect(parseValueForKey("server.auto_start", "true")).toBe(true);
      expect(parseValueForKey("server.auto_start", "false")).toBe(false);
    });

    it("parses enum values as strings", () => {
      expect(parseValueForKey("log_level", "debug")).toBe("debug");
    });

    it("parses comma-separated arrays", () => {
      expect(parseValueForKey("citation.csl_directory", "/a,/b,/c")).toEqual(["/a", "/b", "/c"]);
    });

    it("handles single-element arrays", () => {
      expect(parseValueForKey("citation.csl_directory", "/a")).toEqual(["/a"]);
    });

    it("returns null for unknown keys", () => {
      expect(parseValueForKey("invalid.key", "value")).toBeNull();
    });
  });
});
