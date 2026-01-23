import { describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { getConfigValue } from "./get.js";

// Mock config for testing
const mockConfig: Config = {
  library: "/test/library.json",
  logLevel: "info",
  backup: {
    maxGenerations: 50,
    maxAgeDays: 365,
    directory: "/test/backups",
  },
  watch: {
    debounceMs: 100,
    pollIntervalMs: 1000,
    retryIntervalMs: 5000,
    maxRetries: 3,
  },
  server: {
    autoStart: false,
    autoStopMinutes: 0,
  },
  citation: {
    defaultStyle: "apa",
    cslDirectory: ["/test/csl"],
    defaultLocale: "en-US",
    defaultFormat: "text",
  },
  pubmed: {
    email: "test@example.com",
    apiKey: undefined,
  },
  fulltext: {
    directory: "/test/fulltext",
  },
  cli: {
    defaultLimit: 0,
    defaultSort: "updated",
    defaultOrder: "desc",
    tui: {
      limit: 20,
      debounceMs: 200,
    },
    edit: {
      defaultFormat: "yaml",
    },
  },
  mcp: {
    defaultLimit: 20,
  },
};

describe("getConfigValue", () => {
  describe("simple values", () => {
    it("gets simple string value", () => {
      const result = getConfigValue(mockConfig, "library", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe("/test/library.json");
    });

    it("gets enum value", () => {
      const result = getConfigValue(mockConfig, "log_level", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe("info");
    });
  });

  describe("nested values", () => {
    it("gets nested string value", () => {
      const result = getConfigValue(mockConfig, "citation.default_style", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe("apa");
    });

    it("gets nested array value", () => {
      const result = getConfigValue(mockConfig, "citation.csl_directory", {});
      expect(result.found).toBe(true);
      expect(result.value).toEqual(["/test/csl"]);
    });

    it("gets nested boolean value", () => {
      const result = getConfigValue(mockConfig, "server.auto_start", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe(false);
    });

    it("gets nested integer value", () => {
      const result = getConfigValue(mockConfig, "cli.default_limit", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe(0);
    });
  });

  describe("deeply nested values", () => {
    it("gets deeply nested value", () => {
      const result = getConfigValue(mockConfig, "cli.tui.limit", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe(20);
    });

    it("gets another deeply nested value", () => {
      const result = getConfigValue(mockConfig, "cli.edit.default_format", {});
      expect(result.found).toBe(true);
      expect(result.value).toBe("yaml");
    });
  });

  describe("missing keys", () => {
    it("returns found=false for invalid key", () => {
      const result = getConfigValue(mockConfig, "invalid.key", {});
      expect(result.found).toBe(false);
      expect(result.error).toContain("Unknown");
    });
  });

  describe("unset values", () => {
    it("returns found=false for unset optional value", () => {
      const result = getConfigValue(mockConfig, "pubmed.api_key", {});
      expect(result.found).toBe(false);
      expect(result.error).toContain("not set");
    });
  });

  describe("environment override", () => {
    it("returns env value when override is active", () => {
      const result = getConfigValue(mockConfig, "library", {
        envOverride: "/env/library.json",
      });
      expect(result.found).toBe(true);
      expect(result.value).toBe("/env/library.json");
      expect(result.fromEnv).toBe(true);
    });

    it("ignores env override with configOnly option", () => {
      const result = getConfigValue(mockConfig, "library", {
        envOverride: "/env/library.json",
        configOnly: true,
      });
      expect(result.found).toBe(true);
      expect(result.value).toBe("/test/library.json");
      expect(result.fromEnv).toBeFalsy();
    });
  });
});
