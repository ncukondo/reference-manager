/**
 * Config path subcommand - shows configuration file paths and their status
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getDefaultCurrentDirConfigFilename,
  getDefaultUserConfigPath,
} from "../../config/defaults.js";

/**
 * Options for showConfigPaths
 */
export interface ShowPathsOptions {
  /** Show only user config path */
  user?: boolean;
  /** Show only local config path */
  local?: boolean;
}

/**
 * Context for config path resolution
 */
export interface PathContext {
  /** Current working directory */
  cwd?: string;
  /** User config path (for testing) */
  userConfigPath?: string;
}

/**
 * Get existence status string
 */
function getExistenceStatus(path: string): string {
  return existsSync(path) ? "exists" : "not found";
}

/**
 * Show configuration file paths and their status.
 *
 * When --user or --local is provided, returns only that path (no label).
 * Otherwise, shows all paths with labels and existence status.
 */
export function showConfigPaths(options: ShowPathsOptions, context?: PathContext): string {
  const cwd = context?.cwd ?? process.cwd();
  const userConfigPath = context?.userConfigPath ?? getDefaultUserConfigPath();
  const localConfigPath = join(cwd, getDefaultCurrentDirConfigFilename());
  const envConfigPath = process.env.REFERENCE_MANAGER_CONFIG;

  // Single path mode
  if (options.user) {
    return userConfigPath;
  }

  if (options.local) {
    return localConfigPath;
  }

  // Full output mode
  const lines: string[] = [];

  // User config
  lines.push(`User:    ${userConfigPath} (${getExistenceStatus(userConfigPath)})`);

  // Local config
  lines.push(`Local:   ${localConfigPath} (${getExistenceStatus(localConfigPath)})`);

  // Environment config (if set)
  if (envConfigPath) {
    lines.push(
      `Env:     ${envConfigPath} (${getExistenceStatus(envConfigPath)}) (REFERENCE_MANAGER_CONFIG)`
    );
  }

  return lines.join("\n");
}
