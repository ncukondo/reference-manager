/**
 * Config edit subcommand - opens configuration file in editor
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getDefaultCurrentDirConfigFilename,
  getDefaultUserConfigPath,
} from "../../config/defaults.js";

/**
 * Options for editConfig
 */
export interface EditConfigOptions {
  /** Edit local (project) config instead of user config */
  local?: boolean;
}

/**
 * Context for config edit operation
 */
export interface EditContext {
  /** Current working directory */
  cwd?: string;
  /** User config path (for testing) */
  userConfigPath?: string;
}

/**
 * Target config file information
 */
export interface ConfigEditTarget {
  /** Path to the config file */
  path: string;
  /** Whether the file exists */
  exists: boolean;
}

/**
 * Get the target config file for editing.
 */
export function getConfigEditTarget(
  options: EditConfigOptions,
  context?: EditContext
): ConfigEditTarget {
  const cwd = context?.cwd ?? process.cwd();

  let path: string;
  if (options.local) {
    path = join(cwd, getDefaultCurrentDirConfigFilename());
  } else {
    path = context?.userConfigPath ?? getDefaultUserConfigPath();
  }

  return {
    path,
    exists: existsSync(path),
  };
}

/**
 * Create a config file template for new files.
 * Returns a TOML template with all options commented out.
 */
export function createConfigTemplate(): string {
  return `# Reference Manager Configuration
# Documentation: https://github.com/ncukondo/reference-manager#configuration

# library = "~/.local/share/reference-manager/library.json"
# log_level = "info"  # silent, info, debug

[backup]
# max_generations = 50
# max_age_days = 365
# directory = "~/.cache/reference-manager/backups"

[server]
# auto_start = false
# auto_stop_minutes = 0

[citation]
# default_style = "apa"
# default_locale = "en-US"
# default_format = "text"  # text, html, rtf
# csl_directory = ["~/.local/share/reference-manager/csl"]

[pubmed]
# email = ""
# api_key = ""

[fulltext]
# directory = "~/.local/share/reference-manager/fulltext"

[cli]
# default_limit = 0  # 0 = unlimited
# default_sort = "updated"  # created, updated, published, author, title
# default_order = "desc"  # asc, desc

[cli.interactive]
# limit = 20
# debounce_ms = 200

[cli.edit]
# default_format = "yaml"  # yaml, json

[mcp]
# default_limit = 20
`;
}
