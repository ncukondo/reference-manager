/**
 * Default configuration values
 */

import { tmpdir } from "node:os";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config } from "./schema.js";

/**
 * Get the default backup directory
 * Uses $TMPDIR/reference-manager/backups/
 */
export function getDefaultBackupDirectory(): string {
  return join(tmpdir(), "reference-manager", "backups");
}

/**
 * Get the default library path
 * Uses ~/.reference-manager/csl.library.json
 */
export function getDefaultLibraryPath(): string {
  return join(homedir(), ".reference-manager", "csl.library.json");
}

/**
 * Get the default user config path
 * Uses ~/.reference-manager/config.toml
 */
export function getDefaultUserConfigPath(): string {
  return join(homedir(), ".reference-manager", "config.toml");
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
 * Uses ~/.reference-manager/csl/
 */
export function getDefaultCslDirectory(): string {
  return join(homedir(), ".reference-manager", "csl");
}

/**
 * Get the default fulltext directory
 * Uses ~/.reference-manager/fulltext/
 */
export function getDefaultFulltextDirectory(): string {
  return join(homedir(), ".reference-manager", "fulltext");
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
  },
  pubmed: {
    email: undefined,
    apiKey: undefined,
  },
  fulltext: {
    directory: getDefaultFulltextDirectory(),
  },
  cli: {
    defaultLimit: 0,
    defaultSort: "updated",
    defaultOrder: "desc",
  },
  mcp: {
    defaultLimit: 20,
  },
};
