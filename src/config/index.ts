/**
 * Configuration module
 *
 * Provides configuration loading and management for reference-manager.
 */

// Export types and schemas
export type {
  Config,
  LogLevel,
  BackupConfig,
  WatchConfig,
  PartialConfig,
  DeepPartialConfig,
} from "./schema.js";

export {
  configSchema,
  logLevelSchema,
  backupConfigSchema,
  watchConfigSchema,
  partialConfigSchema,
  normalizePartialConfig,
} from "./schema.js";

// Export defaults
export {
  defaultConfig,
  getDefaultBackupDirectory,
  getDefaultLibraryPath,
  getDefaultUserConfigPath,
  getDefaultCurrentDirConfigFilename,
} from "./defaults.js";

// Export loader
export { loadConfig, type LoadConfigOptions } from "./loader.js";
