/**
 * Configuration loader
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseTOML } from "@iarna/toml";
import {
  defaultConfig,
  getDefaultCurrentDirConfigFilename,
  getDefaultUserConfigPath,
} from "./defaults.js";
import {
  type Config,
  type DeepPartialConfig,
  type PartialConfig,
  configSchema,
  normalizePartialConfig,
  partialConfigSchema,
} from "./schema.js";

/**
 * Options for loading configuration
 */
export interface LoadConfigOptions {
  /** Current working directory (default: process.cwd()) */
  cwd?: string;
  /** User config path (default: ~/.reference-manager/config.toml) */
  userConfigPath?: string;
  /** CLI --config flag: explicit config file path (highest file priority) */
  configPath?: string;
  /** CLI argument overrides */
  overrides?: Partial<Config>;
}

/**
 * Load and parse a TOML config file
 */
function loadTOMLFile(path: string): PartialConfig | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = parseTOML(content);

    // Validate with partial schema
    const validated = partialConfigSchema.parse(parsed);
    return validated;
  } catch (error) {
    throw new Error(
      `Failed to load config from ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Merge CLI config with nested interactive section
 */
function mergeCliConfig(
  base: DeepPartialConfig["cli"],
  override: NonNullable<DeepPartialConfig["cli"]>
): NonNullable<DeepPartialConfig["cli"]> {
  const { tui: overrideTui, ...overrideCliRest } = override;
  const { tui: baseTui, ...baseCliRest } = base ?? {};
  const mergedTui = overrideTui !== undefined ? { ...baseTui, ...overrideTui } : baseTui;
  return {
    ...baseCliRest,
    ...overrideCliRest,
    ...(mergedTui !== undefined ? { tui: mergedTui } : {}),
  };
}

/**
 * Merge fulltext config with nested sources section
 */
function mergeFulltextConfig(
  base: DeepPartialConfig["fulltext"],
  override: NonNullable<DeepPartialConfig["fulltext"]>
): NonNullable<DeepPartialConfig["fulltext"]> {
  const { sources: overrideSources, ...overrideRest } = override;
  const { sources: baseSources, ...baseRest } = base ?? {};
  const mergedSources =
    overrideSources !== undefined ? { ...baseSources, ...overrideSources } : baseSources;
  return {
    ...baseRest,
    ...overrideRest,
    ...(mergedSources !== undefined ? { sources: mergedSources } : {}),
  };
}

const flatSectionKeys = [
  "backup",
  "watch",
  "server",
  "citation",
  "pubmed",
  "attachments",
  "mcp",
] as const;

/**
 * Apply a single override to the result config
 */
function applyOverride(result: DeepPartialConfig, override: DeepPartialConfig): void {
  // Merge top-level primitive fields
  if (override.library !== undefined) {
    result.library = override.library;
  }
  if (override.logLevel !== undefined) {
    result.logLevel = override.logLevel;
  }

  // Merge flat section configs
  for (const key of flatSectionKeys) {
    if (override[key] !== undefined) {
      result[key] = {
        ...result[key],
        ...override[key],
      };
    }
  }

  // Merge nested section configs
  if (override.fulltext !== undefined) {
    result.fulltext = mergeFulltextConfig(result.fulltext, override.fulltext);
  }
  if (override.cli !== undefined) {
    result.cli = mergeCliConfig(result.cli, override.cli);
  }
}

/**
 * Merge partial configurations
 * Later configs override earlier ones
 */
function mergeConfigs(
  base: DeepPartialConfig,
  ...overrides: (DeepPartialConfig | null | undefined)[]
): DeepPartialConfig {
  const result: DeepPartialConfig = { ...base };

  for (const override of overrides) {
    if (!override) continue;
    applyOverride(result, override);
  }

  return result;
}

/**
 * Fill missing fields with defaults
 */
function fillDefaults(partial: DeepPartialConfig): Config {
  const envLibrary = process.env.REFERENCE_MANAGER_LIBRARY;
  const library = envLibrary ?? partial.library ?? defaultConfig.library;
  return {
    library: expandTilde(library),
    logLevel: partial.logLevel ?? defaultConfig.logLevel,
    backup: {
      maxGenerations: partial.backup?.maxGenerations ?? defaultConfig.backup.maxGenerations,
      maxAgeDays: partial.backup?.maxAgeDays ?? defaultConfig.backup.maxAgeDays,
      directory: partial.backup?.directory ?? defaultConfig.backup.directory,
    },
    watch: {
      debounceMs: partial.watch?.debounceMs ?? defaultConfig.watch.debounceMs,
      pollIntervalMs: partial.watch?.pollIntervalMs ?? defaultConfig.watch.pollIntervalMs,
      retryIntervalMs: partial.watch?.retryIntervalMs ?? defaultConfig.watch.retryIntervalMs,
      maxRetries: partial.watch?.maxRetries ?? defaultConfig.watch.maxRetries,
    },
    server: {
      autoStart: partial.server?.autoStart ?? defaultConfig.server.autoStart,
      autoStopMinutes: partial.server?.autoStopMinutes ?? defaultConfig.server.autoStopMinutes,
    },
    citation: fillCitationDefaults(partial.citation),
    pubmed: fillPubmedDefaults(partial.pubmed),
    fulltext: fillFulltextDefaults(partial.fulltext),
    attachments: fillAttachmentsDefaults(partial.attachments),
    cli: fillCliDefaults(partial.cli),
    mcp: fillMcpDefaults(partial.mcp),
  };
}

/**
 * Fill citation config with defaults
 */
function fillCitationDefaults(partial: DeepPartialConfig["citation"]): Config["citation"] {
  return {
    defaultStyle: partial?.defaultStyle ?? defaultConfig.citation.defaultStyle,
    cslDirectory: partial?.cslDirectory ?? defaultConfig.citation.cslDirectory,
    defaultLocale: partial?.defaultLocale ?? defaultConfig.citation.defaultLocale,
    defaultFormat: partial?.defaultFormat ?? defaultConfig.citation.defaultFormat,
    defaultKeyFormat: partial?.defaultKeyFormat ?? defaultConfig.citation.defaultKeyFormat,
  };
}

/**
 * Fill pubmed config with defaults
 * Environment variables take priority over config file values
 */
function fillPubmedDefaults(partial: DeepPartialConfig["pubmed"]): Config["pubmed"] {
  // Environment variables take priority
  const email = process.env.PUBMED_EMAIL ?? partial?.email ?? defaultConfig.pubmed.email;
  const apiKey = process.env.PUBMED_API_KEY ?? partial?.apiKey ?? defaultConfig.pubmed.apiKey;

  return {
    email,
    apiKey,
  };
}

/**
 * Fill fulltext config with defaults
 * Environment variables take priority over config file values
 */
function fillFulltextDefaults(partial: DeepPartialConfig["fulltext"]): Config["fulltext"] {
  // Environment variables take priority
  const unpaywallEmail =
    process.env.UNPAYWALL_EMAIL ??
    partial?.sources?.unpaywallEmail ??
    defaultConfig.fulltext.sources.unpaywallEmail;
  const coreApiKey =
    process.env.CORE_API_KEY ??
    partial?.sources?.coreApiKey ??
    defaultConfig.fulltext.sources.coreApiKey;

  return {
    preferSources: partial?.preferSources ?? defaultConfig.fulltext.preferSources,
    autoFetchOnAdd: partial?.autoFetchOnAdd ?? defaultConfig.fulltext.autoFetchOnAdd,
    sources: {
      unpaywallEmail,
      coreApiKey,
    },
  };
}

/**
 * Expand ~ to home directory
 */
function expandTilde(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * Fill attachments config with defaults
 *
 * Priority:
 * 1. Environment variable REFERENCE_MANAGER_ATTACHMENTS_DIR
 * 2. Config file setting
 * 3. Default value
 */
function fillAttachmentsDefaults(partial: DeepPartialConfig["attachments"]): Config["attachments"] {
  const envDir = process.env.REFERENCE_MANAGER_ATTACHMENTS_DIR;
  const directory = envDir ?? partial?.directory ?? defaultConfig.attachments.directory;
  return {
    directory: expandTilde(directory),
  };
}

/**
 * Fill CLI config with defaults
 *
 * Priority:
 * 1. Environment variable REFERENCE_MANAGER_CLI_DEFAULT_LIMIT
 * 2. Config file setting
 * 3. Default value
 */
function fillCliDefaults(partial: DeepPartialConfig["cli"]): Config["cli"] {
  const envLimit = process.env.REFERENCE_MANAGER_CLI_DEFAULT_LIMIT;
  const defaultLimit =
    envLimit !== undefined
      ? Number(envLimit)
      : (partial?.defaultLimit ?? defaultConfig.cli.defaultLimit);
  const envClipboard = process.env.REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY;
  const clipboardAutoCopy =
    envClipboard !== undefined
      ? envClipboard === "1" || envClipboard === "true"
      : (partial?.tui?.clipboardAutoCopy ?? defaultConfig.cli.tui.clipboardAutoCopy);
  return {
    defaultLimit,
    defaultSort: partial?.defaultSort ?? defaultConfig.cli.defaultSort,
    defaultOrder: partial?.defaultOrder ?? defaultConfig.cli.defaultOrder,
    tui: {
      limit: partial?.tui?.limit ?? defaultConfig.cli.tui.limit,
      debounceMs: partial?.tui?.debounceMs ?? defaultConfig.cli.tui.debounceMs,
      clipboardAutoCopy,
    },
    edit: {
      defaultFormat: partial?.edit?.defaultFormat ?? defaultConfig.cli.edit.defaultFormat,
    },
  };
}

/**
 * Fill MCP config with defaults
 *
 * Priority:
 * 1. Environment variable REFERENCE_MANAGER_MCP_DEFAULT_LIMIT
 * 2. Config file setting
 * 3. Default value
 */
function fillMcpDefaults(partial: DeepPartialConfig["mcp"]): Config["mcp"] {
  const envLimit = process.env.REFERENCE_MANAGER_MCP_DEFAULT_LIMIT;
  const defaultLimit =
    envLimit !== undefined
      ? Number(envLimit)
      : (partial?.defaultLimit ?? defaultConfig.mcp.defaultLimit);
  return {
    defaultLimit,
  };
}

/**
 * Load configuration from multiple sources
 *
 * Priority (highest to lowest):
 * 1. CLI argument overrides
 * 2. CLI --config file (configPath)
 * 3. Current directory config (.reference-manager.config.toml)
 * 4. Environment variable (REFERENCE_MANAGER_CONFIG)
 * 5. User config (~/.reference-manager/config.toml)
 * 6. Default values
 */
export function loadConfig(options: LoadConfigOptions = {}): Config {
  const cwd = options.cwd ?? process.cwd();
  const userConfigPath = options.userConfigPath ?? getDefaultUserConfigPath();

  // If configPath is specified, it must exist (explicit user intent)
  if (options.configPath && !existsSync(options.configPath)) {
    throw new Error(`Config file not found: ${options.configPath}`);
  }

  // 1. Load user config (lowest priority)
  const userConfig = loadTOMLFile(userConfigPath);

  // 2. Load environment variable config
  const envConfigPath = process.env.REFERENCE_MANAGER_CONFIG;
  const envConfig = envConfigPath ? loadTOMLFile(envConfigPath) : null;

  // 3. Load current directory config
  const currentConfigPath = join(cwd, getDefaultCurrentDirConfigFilename());
  const currentConfig = loadTOMLFile(currentConfigPath);

  // 4. Load CLI --config file (highest file priority)
  const cliConfig = options.configPath ? loadTOMLFile(options.configPath) : null;

  // Normalize snake_case to camelCase
  const normalizedUser = userConfig ? normalizePartialConfig(userConfig) : null;
  const normalizedEnv = envConfig ? normalizePartialConfig(envConfig) : null;
  const normalizedCurrent = currentConfig ? normalizePartialConfig(currentConfig) : null;
  const normalizedCli = cliConfig ? normalizePartialConfig(cliConfig) : null;

  // Merge configs (priority: cli > current > env > user > defaults)
  const merged = mergeConfigs(
    {},
    normalizedUser,
    normalizedEnv,
    normalizedCurrent,
    normalizedCli,
    options.overrides
  );

  // Fill missing fields with defaults
  const config = fillDefaults(merged);

  // Validate final config
  try {
    return configSchema.parse(config);
  } catch (error) {
    throw new Error(
      `Invalid configuration: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
