import { describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { showConfig } from "./show.js";

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
  attachments: {
    directory: "/test/attachments",
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

describe("showConfig", () => {
  describe("TOML output", () => {
    it("outputs valid TOML format", () => {
      const result = showConfig(mockConfig, {});

      expect(result).toContain('library = "/test/library.json"');
      expect(result).toContain('log_level = "info"');
    });

    it("includes all sections", () => {
      const result = showConfig(mockConfig, {});

      expect(result).toContain("[backup]");
      expect(result).toContain("[server]");
      expect(result).toContain("[citation]");
      expect(result).toContain("[pubmed]");
      expect(result).toContain("[attachments]");
      expect(result).toContain("[cli]");
      expect(result).toContain("[cli.tui]");
      expect(result).toContain("[cli.edit]");
      expect(result).toContain("[mcp]");
    });

    it("outputs nested values correctly", () => {
      const result = showConfig(mockConfig, {});

      expect(result).toContain('default_style = "apa"');
      expect(result).toContain("limit = 20");
    });
  });

  describe("JSON output", () => {
    it("outputs valid JSON format", () => {
      const result = showConfig(mockConfig, { json: true });

      const parsed = JSON.parse(result);
      expect(parsed.library).toBe("/test/library.json");
      expect(parsed.log_level).toBe("info");
    });

    it("includes all fields in JSON", () => {
      const result = showConfig(mockConfig, { json: true });

      const parsed = JSON.parse(result);
      expect(parsed.backup).toBeDefined();
      expect(parsed.citation).toBeDefined();
      expect(parsed.cli).toBeDefined();
      expect(parsed.cli.tui).toBeDefined();
    });
  });

  describe("section filter", () => {
    it("filters to citation section only", () => {
      const result = showConfig(mockConfig, { section: "citation" });

      expect(result).toContain("[citation]");
      expect(result).toContain('default_style = "apa"');
      expect(result).not.toContain("[backup]");
      expect(result).not.toContain("[server]");
    });

    it("filters to cli section including nested", () => {
      const result = showConfig(mockConfig, { section: "cli" });

      expect(result).toContain("[cli]");
      expect(result).toContain("[cli.tui]");
      expect(result).toContain("[cli.edit]");
      expect(result).not.toContain("[citation]");
    });

    it("filters to backup section in JSON format", () => {
      const result = showConfig(mockConfig, { section: "backup", json: true });

      const parsed = JSON.parse(result);
      expect(parsed.backup).toBeDefined();
      expect(parsed.citation).toBeUndefined();
    });
  });

  describe("source annotation", () => {
    it("adds source comments when sources option is true", () => {
      const result = showConfig(mockConfig, { sources: true });

      // The output should contain source annotations
      expect(result).toContain("# Effective configuration");
    });
  });
});
