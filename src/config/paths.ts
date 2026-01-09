/**
 * Platform-specific paths using env-paths
 *
 * Returns XDG-compliant paths on Linux, standard paths on macOS/Windows
 */

import envPaths from "env-paths";

const paths = envPaths("reference-manager", { suffix: "" });

export interface Paths {
  config: string;
  data: string;
  cache: string;
}

/**
 * Get platform-specific paths for config, data, and cache directories
 *
 * - Linux: XDG Base Directory Specification (~/.config, ~/.local/share, ~/.cache)
 * - macOS: ~/Library/Preferences, ~/Library/Application Support, ~/Library/Caches
 * - Windows: %APPDATA%, %LOCALAPPDATA%
 */
export function getPaths(): Paths {
  return {
    config: paths.config,
    data: paths.data,
    cache: paths.cache,
  };
}
