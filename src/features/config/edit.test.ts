/**
 * Tests for config edit subcommand
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigTemplate, getConfigEditTarget } from "./edit.js";

describe("config edit", () => {
  const originalEnv = process.env;
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(process.cwd(), `.test-config-edit-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe("getConfigEditTarget", () => {
    it("should return user config path by default", () => {
      const userConfigPath = join(tempDir, "config.toml");
      const result = getConfigEditTarget({}, { cwd: tempDir, userConfigPath });

      expect(result.path).toBe(userConfigPath);
      expect(result.exists).toBe(false);
    });

    it("should return local config path when --local is provided", () => {
      const result = getConfigEditTarget({ local: true }, { cwd: tempDir });

      expect(result.path).toContain(tempDir);
      expect(result.path).toContain(".reference-manager.config.toml");
      expect(result.exists).toBe(false);
    });

    it("should detect existing config file", () => {
      const userConfigDir = join(tempDir, ".config", "reference-manager");
      mkdirSync(userConfigDir, { recursive: true });
      const userConfigPath = join(userConfigDir, "config.toml");
      require("node:fs").writeFileSync(userConfigPath, "# existing config\n");

      const result = getConfigEditTarget({}, { cwd: tempDir, userConfigPath });

      expect(result.path).toBe(userConfigPath);
      expect(result.exists).toBe(true);
    });
  });

  describe("createConfigTemplate", () => {
    it("should create a valid TOML template", () => {
      const template = createConfigTemplate();

      // Should have a header comment
      expect(template).toContain("# Reference Manager Configuration");

      // Should have commented-out config examples
      expect(template).toContain("# library");
      expect(template).toContain("# log_level");

      // Should have section headers
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

    it("should include example values for each section", () => {
      const template = createConfigTemplate();

      // backup section
      expect(template).toContain("# max_generations");
      expect(template).toContain("# max_age_days");

      // citation section
      expect(template).toContain("# default_style");
      expect(template).toContain("# default_locale");
      expect(template).toContain("# default_format");

      // cli section
      expect(template).toContain("# default_limit");
      expect(template).toContain("# default_sort");

      // cli.tui section
      expect(template).toContain("# limit");
      expect(template).toContain("# debounce_ms");
    });

    it("should include enum options in comments", () => {
      const template = createConfigTemplate();

      // log_level enum
      expect(template).toMatch(/log_level.*silent.*info.*debug/);

      // default_format enum
      expect(template).toMatch(/default_format.*text.*html.*rtf/);
    });
  });
});
