/**
 * Tests for configuration loader
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "./defaults.js";
import { loadConfig } from "./loader.js";

describe("Config Loader", () => {
  let testDir: string;
  let originalEnv: string | undefined;
  let originalPubmedEmail: string | undefined;
  let originalPubmedApiKey: string | undefined;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original environment variables
    originalEnv = process.env.REFERENCE_MANAGER_CONFIG;
    originalPubmedEmail = process.env.PUBMED_EMAIL;
    originalPubmedApiKey = process.env.PUBMED_API_KEY;
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });

    // Restore environment variables
    if (originalEnv === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.REFERENCE_MANAGER_CONFIG;
    } else {
      process.env.REFERENCE_MANAGER_CONFIG = originalEnv;
    }
    if (originalPubmedEmail === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.PUBMED_EMAIL;
    } else {
      process.env.PUBMED_EMAIL = originalPubmedEmail;
    }
    if (originalPubmedApiKey === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.PUBMED_API_KEY;
    } else {
      process.env.PUBMED_API_KEY = originalPubmedApiKey;
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

  describe("Citation configuration", () => {
    it("should use default citation settings when not specified", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultStyle).toBe("apa");
      expect(config.citation.cslDirectory).toEqual([join(homedir(), ".reference-manager", "csl")]);
      expect(config.citation.defaultLocale).toBe("en-US");
      expect(config.citation.defaultFormat).toBe("text");
    });

    it("should load citation.default_style from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_style = "vancouver"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultStyle).toBe("vancouver");
    });

    it("should load citation.csl_directory as string from config and convert to array", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
csl_directory = "/custom/csl"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.cslDirectory).toEqual(["/custom/csl"]);
    });

    it("should load citation.csl_directory as array from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
csl_directory = ["/custom/csl1", "/custom/csl2"]
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.cslDirectory).toEqual(["/custom/csl1", "/custom/csl2"]);
    });

    it("should load citation.default_locale from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_locale = "de-DE"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultLocale).toBe("de-DE");
    });

    it("should load citation.default_format from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_format = "html"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultFormat).toBe("html");
    });

    it("should support snake_case field names for citation config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_style = "chicago"
csl_directory = "/custom/csl"
default_locale = "fr-FR"
default_format = "rtf"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultStyle).toBe("chicago");
      expect(config.citation.cslDirectory).toEqual(["/custom/csl"]);
      expect(config.citation.defaultLocale).toBe("fr-FR");
      expect(config.citation.defaultFormat).toBe("rtf");
    });

    it("should throw error for invalid citation.default_format", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_format = "invalid"
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should merge partial citation config with defaults", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_style = "harvard"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultStyle).toBe("harvard");
      expect(config.citation.defaultLocale).toBe("en-US"); // Default
      expect(config.citation.defaultFormat).toBe("text"); // Default
    });
  });

  describe("PubMed configuration", () => {
    it("should use default pubmed settings when not specified", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBeUndefined();
      expect(config.pubmed.apiKey).toBeUndefined();
    });

    it("should load pubmed.email from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
email = "user@example.com"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("user@example.com");
    });

    it("should load pubmed.api_key from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
api_key = "my-api-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.apiKey).toBe("my-api-key");
    });

    it("should load both pubmed email and api_key from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
email = "user@example.com"
api_key = "my-api-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("user@example.com");
      expect(config.pubmed.apiKey).toBe("my-api-key");
    });

    it("should load pubmed.email from PUBMED_EMAIL environment variable", () => {
      process.env.PUBMED_EMAIL = "env@example.com";

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("env@example.com");
    });

    it("should load pubmed.apiKey from PUBMED_API_KEY environment variable", () => {
      process.env.PUBMED_API_KEY = "env-api-key";

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.apiKey).toBe("env-api-key");
    });

    it("should prioritize environment variables over config file for pubmed", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
email = "config@example.com"
api_key = "config-api-key"
`
      );

      process.env.PUBMED_EMAIL = "env@example.com";
      process.env.PUBMED_API_KEY = "env-api-key";

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("env@example.com");
      expect(config.pubmed.apiKey).toBe("env-api-key");
    });

    it("should use config file value when environment variable is not set", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
email = "config@example.com"
api_key = "config-api-key"
`
      );

      // Environment variables not set

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("config@example.com");
      expect(config.pubmed.apiKey).toBe("config-api-key");
    });

    it("should support camelCase field names for pubmed config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[pubmed]
email = "user@example.com"
apiKey = "my-api-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.pubmed.email).toBe("user@example.com");
      expect(config.pubmed.apiKey).toBe("my-api-key");
    });
  });
});
