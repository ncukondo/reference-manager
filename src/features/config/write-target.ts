/**
 * Write target resolution for config set/unset commands
 *
 * Determines which config file to write to based on flags and file existence.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { getDefaultCurrentDirConfigFilename } from "../../config/defaults.js";

/**
 * Options for resolving write target
 */
export interface ResolveWriteTargetOptions {
  /** Force write to local config (create if not exists) */
  local?: boolean;
  /** Force write to user config (ignore local even if exists) */
  user?: boolean;
  /** Current working directory */
  cwd: string;
  /** User config file path */
  userConfigPath: string;
}

/**
 * Resolve the config file path to write to.
 *
 * Priority:
 * 1. --local flag → local config (create if not exists)
 * 2. --user flag → user config (ignore local even if exists)
 * 3. No flags:
 *    - If local config exists → local config
 *    - Otherwise → user config
 */
export function resolveWriteTarget(options: ResolveWriteTargetOptions): string {
  const { local, user, cwd, userConfigPath } = options;
  const localConfigPath = join(cwd, getDefaultCurrentDirConfigFilename());

  // --local flag takes highest precedence
  if (local) {
    return localConfigPath;
  }

  // --user flag forces user config
  if (user) {
    return userConfigPath;
  }

  // Auto-detect: use local if exists, otherwise user
  if (existsSync(localConfigPath)) {
    return localConfigPath;
  }

  return userConfigPath;
}
