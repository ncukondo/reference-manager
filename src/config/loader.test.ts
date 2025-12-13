/**
 * Tests for configuration loader
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "./defaults.js";
import { loadConfig } from "./loader.js";

describe("Config Loader", () => {
  let testDir: string;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original environment variable
    originalEnv = process.env.REFERENCE_MANAGER_CONFIG;
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });

    // Restore environment variable
    if (originalEnv === undefined) {
      process.env.REFERENCE_MANAGER_CONFIG = undefined;
    } else {
      process.env.REFERENCE_MANAGER_CONFIG = originalEnv;
    }
  });

  describe("Default configuration", () => {
    it("should return default config when no config files exist", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config).toEqual(defaultConfig);
    });

    it("should use default values for all fields", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.logLevel).toBe("info");
      expect(config.backup.maxGenerations).toBe(50);
      expect(config.backup.maxAgeDays).toBe(365);
      expect(config.watch.enabled).toBe(true);
      expect(config.watch.debounceMs).toBe(500);
    });
  });

  describe("Current directory config", () => {
    it("should load config from current directory", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
library = "/custom/library.json"
log_level = "debug"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe("/custom/library.json");
      expect(config.logLevel).toBe("debug");
    });

    it("should merge partial config with defaults", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
log_level = "silent"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.logLevel).toBe("silent");
      expect(config.library).toBe(defaultConfig.library); // Default value
    });

    it("should support snake_case field names", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
log_level = "debug"

[backup]
max_generations = 100
max_age_days = 30

[watch]
debounce_ms = 1000
poll_interval_ms = 10000
retry_interval_ms = 500
max_retries = 5
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.logLevel).toBe("debug");
      expect(config.backup.maxGenerations).toBe(100);
      expect(config.backup.maxAgeDays).toBe(30);
      expect(config.watch.debounceMs).toBe(1000);
      expect(config.watch.pollIntervalMs).toBe(10000);
      expect(config.watch.retryIntervalMs).toBe(500);
      expect(config.watch.maxRetries).toBe(5);
    });
  });

  describe("Environment variable config", () => {
    it("should load config from REFERENCE_MANAGER_CONFIG", () => {
      const configPath = join(testDir, "custom-config.toml");
      writeFileSync(
        configPath,
        `
library = "/env/library.json"
log_level = "silent"
`
      );

      process.env.REFERENCE_MANAGER_CONFIG = configPath;

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe("/env/library.json");
      expect(config.logLevel).toBe("silent");
    });
  });

  describe("User config", () => {
    it("should load config from user config path", () => {
      const userConfigPath = join(testDir, "config.toml");
      writeFileSync(
        userConfigPath,
        `
library = "/user/library.json"
log_level = "info"
`
      );

      const config = loadConfig({ cwd: testDir, userConfigPath });
      expect(config.library).toBe("/user/library.json");
      expect(config.logLevel).toBe("info");
    });
  });

  describe("Configuration priority", () => {
    it("should prioritize current directory over environment variable", () => {
      // Create environment config
      const envConfigPath = join(testDir, "env-config.toml");
      writeFileSync(
        envConfigPath,
        `
library = "/env/library.json"
log_level = "silent"
`
      );
      process.env.REFERENCE_MANAGER_CONFIG = envConfigPath;

      // Create current directory config
      const currentConfigPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        currentConfigPath,
        `
library = "/current/library.json"
log_level = "debug"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe("/current/library.json");
      expect(config.logLevel).toBe("debug");
    });

    it("should prioritize current directory over user config", () => {
      // Create user config
      const userConfigPath = join(testDir, "user-config.toml");
      writeFileSync(
        userConfigPath,
        `
library = "/user/library.json"
log_level = "info"
`
      );

      // Create current directory config
      const currentConfigPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        currentConfigPath,
        `
library = "/current/library.json"
log_level = "debug"
`
      );

      const config = loadConfig({ cwd: testDir, userConfigPath });
      expect(config.library).toBe("/current/library.json");
      expect(config.logLevel).toBe("debug");
    });

    it("should prioritize environment variable over user config", () => {
      // Create user config
      const userConfigPath = join(testDir, "user-config.toml");
      writeFileSync(
        userConfigPath,
        `
library = "/user/library.json"
log_level = "info"
`
      );

      // Create environment config
      const envConfigPath = join(testDir, "env-config.toml");
      writeFileSync(
        envConfigPath,
        `
library = "/env/library.json"
log_level = "silent"
`
      );
      process.env.REFERENCE_MANAGER_CONFIG = envConfigPath;

      const config = loadConfig({ cwd: testDir, userConfigPath });
      expect(config.library).toBe("/env/library.json");
      expect(config.logLevel).toBe("silent");
    });

    it("should merge configs with correct priority", () => {
      // User config: sets library and backup
      const userConfigPath = join(testDir, "user-config.toml");
      writeFileSync(
        userConfigPath,
        `
library = "/user/library.json"

[backup]
max_generations = 30
`
      );

      // Environment config: sets log_level
      const envConfigPath = join(testDir, "env-config.toml");
      writeFileSync(
        envConfigPath,
        `
log_level = "silent"

[backup]
max_age_days = 60
`
      );
      process.env.REFERENCE_MANAGER_CONFIG = envConfigPath;

      // Current directory config: sets watch
      const currentConfigPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        currentConfigPath,
        `
[watch]
debounce_ms = 1000
`
      );

      const config = loadConfig({ cwd: testDir, userConfigPath });

      // Current directory wins for watch
      expect(config.watch.debounceMs).toBe(1000);
      expect(config.watch.enabled).toBe(true); // Default

      // Environment wins for log_level and backup.maxAgeDays
      expect(config.logLevel).toBe("silent");
      expect(config.backup.maxAgeDays).toBe(60);

      // User config for library (not overridden)
      expect(config.library).toBe("/user/library.json");

      // User config for backup.maxGenerations (not overridden)
      expect(config.backup.maxGenerations).toBe(30);
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid TOML syntax", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(configPath, "invalid toml syntax [[[");

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should throw error for invalid log level", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
log_level = "invalid"
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should throw error for invalid backup config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[backup]
max_generations = -1
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should ignore non-existent environment config file", () => {
      process.env.REFERENCE_MANAGER_CONFIG = "/non/existent/config.toml";

      const config = loadConfig({ cwd: testDir });
      expect(config).toEqual(defaultConfig);
    });
  });

  describe("CLI arguments override", () => {
    it("should override config with CLI arguments", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
library = "/config/library.json"
log_level = "info"
`
      );

      const config = loadConfig({
        cwd: testDir,
        overrides: {
          library: "/cli/library.json",
          logLevel: "debug",
        },
      });

      expect(config.library).toBe("/cli/library.json");
      expect(config.logLevel).toBe("debug");
    });

    it("should allow partial CLI overrides", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
library = "/config/library.json"
log_level = "info"
`
      );

      const config = loadConfig({
        cwd: testDir,
        overrides: {
          logLevel: "debug",
        },
      });

      expect(config.library).toBe("/config/library.json");
      expect(config.logLevel).toBe("debug");
    });
  });
});
