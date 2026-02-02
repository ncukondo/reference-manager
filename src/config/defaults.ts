/**
 * Default configuration values
 */

import { join } from "node:path";
import { getPaths } from "./paths.js";
import type { Config } from "./schema.js";

/**
 * Get the default backup directory
 * Uses platform-specific cache path + backups/
 */
export function getDefaultBackupDirectory(): string {
  return join(getPaths().cache, "backups");
}

/**
 * Get the default library path
 * Uses platform-specific data path + library.json
 */
export function getDefaultLibraryPath(): string {
  return join(getPaths().data, "library.json");
}

/**
 * Get the default user config path
 * Uses platform-specific config path + config.toml
 */
export function getDefaultUserConfigPath(): string {
  return join(getPaths().config, "config.toml");
}

/**
 * Get the default current directory config filename
 * Uses .reference-manager.config.toml
 */
export function getDefaultCurrentDirConfigFilename(): string {
  return ".reference-manager.config.toml";
}

/**
 * Get the default CSL directory
 * Uses platform-specific data path + csl/
 */
export function getDefaultCslDirectory(): string {
  return join(getPaths().data, "csl");
}

/**
 * Get the default attachments directory
 * Uses platform-specific data path + attachments/
 */
export function getDefaultAttachmentsDirectory(): string {
  return join(getPaths().data, "attachments");
}

/**
 * Default configuration
 */
export const defaultConfig: Config = {
  library: getDefaultLibraryPath(),
  logLevel: "info",
  backup: {
    maxGenerations: 50,
    maxAgeDays: 365,
    directory: getDefaultBackupDirectory(),
  },
  watch: {
    debounceMs: 500,
    pollIntervalMs: 5000,
    retryIntervalMs: 200,
    maxRetries: 10,
  },
  server: {
    autoStart: false,
    autoStopMinutes: 0,
  },
  citation: {
    defaultStyle: "apa",
    cslDirectory: [getDefaultCslDirectory()],
    defaultLocale: "en-US",
    defaultFormat: "text",
    defaultKeyFormat: "pandoc",
  },
  pubmed: {
    email: undefined,
    apiKey: undefined,
  },
  attachments: {
    directory: getDefaultAttachmentsDirectory(),
  },
  cli: {
    defaultLimit: 0,
    defaultSort: "updated",
    defaultOrder: "desc",
    tui: {
      limit: 20,
      debounceMs: 200,
      clipboardAutoCopy: false,
    },
    edit: {
      defaultFormat: "yaml",
    },
  },
  mcp: {
    defaultLimit: 20,
  },
};
