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
    enabled: true,
    debounceMs: 500,
    pollIntervalMs: 5000,
    retryIntervalMs: 200,
    maxRetries: 10,
  },
};
