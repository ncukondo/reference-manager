/**
 * Config key parser - handles dot-notation config keys and validates against schema
 */

/**
 * Type of a configuration value
 */
export type ConfigValueType = "string" | "integer" | "boolean" | "enum" | "string[]";

/**
 * Information about a configuration key
 */
export interface ConfigKeyInfo {
  /** The full key path in snake_case */
  key: string;
  /** The value type */
  type: ConfigValueType;
  /** Description of the key */
  description: string;
  /** For enum types, the allowed values */
  enumValues?: string[];
  /** Whether the value is optional (can be unset) */
  optional?: boolean;
}

/**
 * Registry of all valid configuration keys
 */
const CONFIG_KEY_REGISTRY: ConfigKeyInfo[] = [
  // Top-level keys
  { key: "library", type: "string", description: "Path to library file" },
  {
    key: "log_level",
    type: "enum",
    description: "Log level",
    enumValues: ["silent", "info", "debug"],
  },

  // backup section
  { key: "backup.max_generations", type: "integer", description: "Maximum backup generations" },
  { key: "backup.max_age_days", type: "integer", description: "Maximum backup age in days" },
  { key: "backup.directory", type: "string", description: "Backup directory path" },

  // watch section
  { key: "watch.debounce_ms", type: "integer", description: "File watch debounce delay (ms)" },
  { key: "watch.poll_interval_ms", type: "integer", description: "File watch poll interval (ms)" },
  {
    key: "watch.retry_interval_ms",
    type: "integer",
    description: "File watch retry interval (ms)",
  },
  { key: "watch.max_retries", type: "integer", description: "Maximum file watch retries" },

  // server section
  { key: "server.auto_start", type: "boolean", description: "Auto-start server on CLI commands" },
  {
    key: "server.auto_stop_minutes",
    type: "integer",
    description: "Auto-stop server after idle minutes (0 = never)",
  },

  // citation section
  { key: "citation.default_style", type: "string", description: "Default citation style" },
  { key: "citation.csl_directory", type: "string[]", description: "CSL style file directories" },
  { key: "citation.default_locale", type: "string", description: "Default locale for citations" },
  {
    key: "citation.default_format",
    type: "enum",
    description: "Default format",
    enumValues: ["text", "html", "rtf"],
  },

  // pubmed section
  { key: "pubmed.email", type: "string", description: "Email for PubMed API", optional: true },
  { key: "pubmed.api_key", type: "string", description: "API key for PubMed", optional: true },

  // attachments section
  { key: "attachments.directory", type: "string", description: "Attachments storage directory" },

  // cli section
  {
    key: "cli.default_limit",
    type: "integer",
    description: "Default result limit (0 = unlimited)",
  },
  {
    key: "cli.default_sort",
    type: "enum",
    description: "Default sort field",
    enumValues: ["created", "updated", "published", "author", "title"],
  },
  {
    key: "cli.default_order",
    type: "enum",
    description: "Default sort order",
    enumValues: ["asc", "desc"],
  },

  // cli.tui section
  {
    key: "cli.tui.limit",
    type: "integer",
    description: "Result limit in TUI mode",
  },
  {
    key: "cli.tui.debounce_ms",
    type: "integer",
    description: "Search debounce delay (ms)",
  },

  // cli.edit section
  {
    key: "cli.edit.default_format",
    type: "enum",
    description: "Default edit format",
    enumValues: ["yaml", "json"],
  },

  // mcp section
  { key: "mcp.default_limit", type: "integer", description: "Default result limit for MCP" },
];

// Create lookup map for fast access
const KEY_MAP = new Map<string, ConfigKeyInfo>(CONFIG_KEY_REGISTRY.map((info) => [info.key, info]));

// Cache for all keys
let allKeysCache: string[] | null = null;

/**
 * Parse a dot-notation config key into path segments.
 */
export function parseConfigKey(key: string): string[] {
  return key.split(".");
}

/**
 * Check if a key is a valid configuration key.
 * Only leaf keys (not sections) are valid.
 */
export function isValidConfigKey(key: string): boolean {
  if (!key) {
    return false;
  }
  return KEY_MAP.has(key);
}

/**
 * Get information about a configuration key.
 * Returns null if the key is not valid.
 */
export function getConfigKeyInfo(key: string): ConfigKeyInfo | null {
  return KEY_MAP.get(key) ?? null;
}

/**
 * Get all valid configuration keys, optionally filtered by section.
 */
export function getAllConfigKeys(section?: string): string[] {
  if (!allKeysCache) {
    allKeysCache = CONFIG_KEY_REGISTRY.map((info) => info.key).sort();
  }

  if (!section) {
    return allKeysCache;
  }

  const prefix = `${section}.`;
  return allKeysCache.filter((key) => key.startsWith(prefix));
}

/**
 * Convert a snake_case key to the internal camelCase path for accessing config values.
 * e.g., "cli.tui.debounce_ms" -> ["cli", "tui", "debounceMs"]
 */
export function toInternalPath(key: string): string[] {
  const segments = parseConfigKey(key);
  return segments.map((segment, index) => {
    // First segment (section name) stays as-is
    if (index === 0) {
      // Special case: log_level -> logLevel at top level
      if (segment === "log_level") {
        return "logLevel";
      }
      return segment;
    }
    // Convert snake_case to camelCase
    return snakeToCamel(segment);
  });
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
