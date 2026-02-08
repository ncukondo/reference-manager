/**
 * Tests for configuration loader
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultConfig } from "./defaults.js";
import { loadConfig } from "./loader.js";
import { getPaths } from "./paths.js";

describe("Config Loader", () => {
  let testDir: string;
  let originalEnv: string | undefined;
  let originalLibrary: string | undefined;
  let originalPubmedEmail: string | undefined;
  let originalPubmedApiKey: string | undefined;
  let originalUnpaywallEmail: string | undefined;
  let originalCoreApiKey: string | undefined;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Save original environment variables
    originalEnv = process.env.REFERENCE_MANAGER_CONFIG;
    originalLibrary = process.env.REFERENCE_MANAGER_LIBRARY;
    originalPubmedEmail = process.env.PUBMED_EMAIL;
    originalPubmedApiKey = process.env.PUBMED_API_KEY;
    originalUnpaywallEmail = process.env.UNPAYWALL_EMAIL;
    originalCoreApiKey = process.env.CORE_API_KEY;
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
    if (originalLibrary === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.REFERENCE_MANAGER_LIBRARY;
    } else {
      process.env.REFERENCE_MANAGER_LIBRARY = originalLibrary;
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
    if (originalUnpaywallEmail === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.UNPAYWALL_EMAIL;
    } else {
      process.env.UNPAYWALL_EMAIL = originalUnpaywallEmail;
    }
    if (originalCoreApiKey === undefined) {
      // biome-ignore lint/performance/noDelete: delete is required for env vars
      delete process.env.CORE_API_KEY;
    } else {
      process.env.CORE_API_KEY = originalCoreApiKey;
    }
  });

  describe("Default configuration", () => {
    it("should return default config when no config files exist", () => {
      const config = loadConfig({ cwd: testDir, userConfigPath: join(testDir, "no-user.toml") });
      expect(config).toEqual(defaultConfig);
    });

    it("should use default values for all fields", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.logLevel).toBe("info");
      expect(config.backup.maxGenerations).toBe(50);
      expect(config.backup.maxAgeDays).toBe(365);
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

      const config = loadConfig({ cwd: testDir, userConfigPath: join(testDir, "no-user.toml") });
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

    it("should load library from REFERENCE_MANAGER_LIBRARY", () => {
      process.env.REFERENCE_MANAGER_LIBRARY = "/env/direct-library.json";

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe("/env/direct-library.json");
    });

    it("should prioritize REFERENCE_MANAGER_LIBRARY over config file", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
library = "/config/library.json"
`
      );

      process.env.REFERENCE_MANAGER_LIBRARY = "/env/library.json";

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe("/env/library.json");
    });

    it("should expand tilde in REFERENCE_MANAGER_LIBRARY", () => {
      process.env.REFERENCE_MANAGER_LIBRARY = "~/my-library.json";

      const config = loadConfig({ cwd: testDir });
      expect(config.library).toBe(join(homedir(), "my-library.json"));
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

      const config = loadConfig({ cwd: testDir, userConfigPath: join(testDir, "no-user.toml") });
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
      expect(config.citation.cslDirectory).toEqual([join(getPaths().data, "csl")]);
      expect(config.citation.defaultLocale).toBe("en-US");
      expect(config.citation.defaultFormat).toBe("text");
      expect(config.citation.defaultKeyFormat).toBe("pandoc");
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

    it("should load citation.default_key_format from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[citation]
default_key_format = "latex"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.citation.defaultKeyFormat).toBe("latex");
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
      expect(config.citation.defaultKeyFormat).toBe("pandoc"); // Default
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

  describe("configPath option (--config flag)", () => {
    it("should load config from configPath", () => {
      const configFilePath = join(testDir, "custom-config.toml");
      writeFileSync(
        configFilePath,
        `
library = "/custom/library.json"
log_level = "debug"
`
      );

      const config = loadConfig({ cwd: testDir, configPath: configFilePath });
      expect(config.library).toBe("/custom/library.json");
      expect(config.logLevel).toBe("debug");
    });

    it("should prioritize configPath over env config", () => {
      const envConfigPath = join(testDir, "env-config.toml");
      writeFileSync(envConfigPath, `library = "/env/library.json"\n`);
      process.env.REFERENCE_MANAGER_CONFIG = envConfigPath;

      const cliConfigPath = join(testDir, "cli-config.toml");
      writeFileSync(cliConfigPath, `library = "/cli/library.json"\n`);

      const config = loadConfig({ cwd: testDir, configPath: cliConfigPath });
      expect(config.library).toBe("/cli/library.json");
    });

    it("should prioritize configPath over user config", () => {
      const userConfigPath = join(testDir, "user-config.toml");
      writeFileSync(userConfigPath, `library = "/user/library.json"\n`);

      const cliConfigPath = join(testDir, "cli-config.toml");
      writeFileSync(cliConfigPath, `library = "/cli/library.json"\n`);

      const config = loadConfig({ cwd: testDir, userConfigPath, configPath: cliConfigPath });
      expect(config.library).toBe("/cli/library.json");
    });

    it("should prioritize configPath over current directory config", () => {
      const currentConfigPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(currentConfigPath, `library = "/current/library.json"\n`);

      const cliConfigPath = join(testDir, "cli-config.toml");
      writeFileSync(cliConfigPath, `library = "/cli/library.json"\n`);

      const config = loadConfig({ cwd: testDir, configPath: cliConfigPath });
      expect(config.library).toBe("/cli/library.json");
    });

    it("should throw error if configPath file does not exist", () => {
      expect(() => loadConfig({ cwd: testDir, configPath: "/non/existent/config.toml" })).toThrow(
        "Config file not found: /non/existent/config.toml"
      );
    });

    it("should merge configPath with defaults for unspecified fields", () => {
      const cliConfigPath = join(testDir, "cli-config.toml");
      writeFileSync(
        cliConfigPath,
        `
[citation]
default_style = "vancouver"
`
      );

      const config = loadConfig({
        cwd: testDir,
        configPath: cliConfigPath,
        userConfigPath: join(testDir, "no-user.toml"),
      });
      expect(config.citation.defaultStyle).toBe("vancouver");
      expect(config.library).toBe(defaultConfig.library); // default
      expect(config.logLevel).toBe("info"); // default
    });
  });

  describe("cli.tui configuration", () => {
    it("should use default interactive config when not specified", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.limit).toBe(20);
      expect(config.cli.tui.debounceMs).toBe(200);
    });

    it("should load interactive config from TOML with camelCase", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
limit = 30
debounceMs = 300
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.limit).toBe(30);
      expect(config.cli.tui.debounceMs).toBe(300);
    });

    it("should load interactive config from TOML with snake_case", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
limit = 25
debounce_ms = 250
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.limit).toBe(25);
      expect(config.cli.tui.debounceMs).toBe(250);
    });

    it("should merge partial interactive config with defaults", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
limit = 50
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.limit).toBe(50);
      expect(config.cli.tui.debounceMs).toBe(200); // default
    });

    it("should reject negative limit", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
limit = -1
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should reject negative debounce_ms", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
debounce_ms = -1
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should accept zero limit", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
limit = 0
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.limit).toBe(0);
    });

    it("should accept zero debounce_ms", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[cli.tui]
debounce_ms = 0
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.cli.tui.debounceMs).toBe(0);
    });
  });

  describe("Fulltext configuration", () => {
    it("should use default fulltext settings when not specified", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.preferSources).toEqual(["pmc", "arxiv", "unpaywall", "core"]);
      expect(config.fulltext.sources.unpaywallEmail).toBeUndefined();
      expect(config.fulltext.sources.coreApiKey).toBeUndefined();
    });

    it("should load fulltext.prefer_sources from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
prefer_sources = ["unpaywall", "pmc"]
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.preferSources).toEqual(["unpaywall", "pmc"]);
    });

    it("should load fulltext.sources.unpaywall_email from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext.sources]
unpaywall_email = "user@example.com"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.unpaywallEmail).toBe("user@example.com");
    });

    it("should load fulltext.sources.core_api_key from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext.sources]
core_api_key = "my-core-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.coreApiKey).toBe("my-core-key");
    });

    it("should load both fulltext sources from config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
prefer_sources = ["pmc", "core"]

[fulltext.sources]
unpaywall_email = "user@example.com"
core_api_key = "my-core-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.preferSources).toEqual(["pmc", "core"]);
      expect(config.fulltext.sources.unpaywallEmail).toBe("user@example.com");
      expect(config.fulltext.sources.coreApiKey).toBe("my-core-key");
    });

    it("should load fulltext.sources.unpaywallEmail from UNPAYWALL_EMAIL environment variable", () => {
      process.env.UNPAYWALL_EMAIL = "env@example.com";

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.unpaywallEmail).toBe("env@example.com");
    });

    it("should load fulltext.sources.coreApiKey from CORE_API_KEY environment variable", () => {
      process.env.CORE_API_KEY = "env-core-key";

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.coreApiKey).toBe("env-core-key");
    });

    it("should prioritize environment variables over config file for fulltext", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext.sources]
unpaywall_email = "config@example.com"
core_api_key = "config-core-key"
`
      );

      process.env.UNPAYWALL_EMAIL = "env@example.com";
      process.env.CORE_API_KEY = "env-core-key";

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.unpaywallEmail).toBe("env@example.com");
      expect(config.fulltext.sources.coreApiKey).toBe("env-core-key");
    });

    it("should use config file value when environment variable is not set", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext.sources]
unpaywall_email = "config@example.com"
core_api_key = "config-core-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.unpaywallEmail).toBe("config@example.com");
      expect(config.fulltext.sources.coreApiKey).toBe("config-core-key");
    });

    it("should support camelCase field names for fulltext config", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
preferSources = ["arxiv", "pmc"]

[fulltext.sources]
unpaywallEmail = "user@example.com"
coreApiKey = "my-core-key"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.preferSources).toEqual(["arxiv", "pmc"]);
      expect(config.fulltext.sources.unpaywallEmail).toBe("user@example.com");
      expect(config.fulltext.sources.coreApiKey).toBe("my-core-key");
    });

    it("should merge partial fulltext config with defaults", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext.sources]
unpaywall_email = "user@example.com"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.sources.unpaywallEmail).toBe("user@example.com");
      expect(config.fulltext.sources.coreApiKey).toBeUndefined();
      expect(config.fulltext.preferSources).toEqual(["pmc", "arxiv", "unpaywall", "core"]);
    });

    it("should reject invalid prefer_sources values", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
prefer_sources = ["invalid_source"]
`
      );

      expect(() => loadConfig({ cwd: testDir })).toThrow();
    });

    it("should default autoFetchOnAdd to false", () => {
      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.autoFetchOnAdd).toBe(false);
    });

    it("should load fulltext.auto_fetch_on_add from config (snake_case)", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
auto_fetch_on_add = true
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.autoFetchOnAdd).toBe(true);
    });

    it("should load fulltext.autoFetchOnAdd from config (camelCase)", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
autoFetchOnAdd = true
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.autoFetchOnAdd).toBe(true);
    });

    it("should merge autoFetchOnAdd with other fulltext settings", () => {
      const configPath = join(testDir, ".reference-manager.config.toml");
      writeFileSync(
        configPath,
        `
[fulltext]
auto_fetch_on_add = true
prefer_sources = ["unpaywall", "pmc"]

[fulltext.sources]
unpaywall_email = "user@example.com"
`
      );

      const config = loadConfig({ cwd: testDir });
      expect(config.fulltext.autoFetchOnAdd).toBe(true);
      expect(config.fulltext.preferSources).toEqual(["unpaywall", "pmc"]);
      expect(config.fulltext.sources.unpaywallEmail).toBe("user@example.com");
    });
  });
});
