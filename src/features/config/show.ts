/**
 * Config show subcommand - displays effective configuration
 */

import type { Config } from "../../config/schema.js";

/**
 * Options for showConfig
 */
export interface ShowConfigOptions {
  /** Output in JSON format instead of TOML */
  json?: boolean;
  /** Show only a specific section */
  section?: string;
  /** Include source information for each value */
  sources?: boolean;
}

/**
 * Convert Config object to snake_case keys for TOML/JSON output
 */
function toSnakeCaseConfig(config: Config): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result.library = config.library;
  result.log_level = config.logLevel;

  result.backup = {
    max_generations: config.backup.maxGenerations,
    max_age_days: config.backup.maxAgeDays,
    directory: config.backup.directory,
  };

  result.watch = {
    debounce_ms: config.watch.debounceMs,
    poll_interval_ms: config.watch.pollIntervalMs,
    retry_interval_ms: config.watch.retryIntervalMs,
    max_retries: config.watch.maxRetries,
  };

  result.server = {
    auto_start: config.server.autoStart,
    auto_stop_minutes: config.server.autoStopMinutes,
  };

  result.citation = {
    default_style: config.citation.defaultStyle,
    csl_directory: config.citation.cslDirectory,
    default_locale: config.citation.defaultLocale,
    default_format: config.citation.defaultFormat,
  };

  result.pubmed = {
    email: config.pubmed.email,
    api_key: config.pubmed.apiKey,
  };

  result.fulltext = {
    directory: config.fulltext.directory,
  };

  result.cli = {
    default_limit: config.cli.defaultLimit,
    default_sort: config.cli.defaultSort,
    default_order: config.cli.defaultOrder,
    tui: {
      limit: config.cli.tui.limit,
      debounce_ms: config.cli.tui.debounceMs,
    },
    edit: {
      default_format: config.cli.edit.defaultFormat,
    },
  };

  result.mcp = {
    default_limit: config.mcp.defaultLimit,
  };

  return result;
}

/**
 * Filter config to a specific section
 */
function filterSection(config: Record<string, unknown>, section: string): Record<string, unknown> {
  const sectionValue = config[section];
  if (sectionValue === undefined) {
    return {};
  }
  return { [section]: sectionValue };
}

/**
 * Serialize config to TOML format
 */
function serializeToTOML(config: Record<string, unknown>, withSources: boolean): string {
  const lines: string[] = [];

  if (withSources) {
    lines.push("# Effective configuration");
    lines.push("# Source priority: CLI > current dir > env > user > default");
    lines.push("");
  }

  // Handle top-level scalar values first
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      lines.push(formatTOMLValue(key, value));
    }
  }

  // Add blank line before sections if we had top-level values
  const hasTopLevel = Object.values(config).some(
    (v) => typeof v !== "object" || v === null || Array.isArray(v)
  );
  if (hasTopLevel) {
    lines.push("");
  }

  // Handle sections
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      serializeSection(lines, key, value as Record<string, unknown>);
    }
  }

  return lines.join("\n");
}

/**
 * Serialize a TOML section
 */
function serializeSection(lines: string[], prefix: string, obj: Record<string, unknown>): void {
  const scalarEntries: [string, unknown][] = [];
  const objectEntries: [string, Record<string, unknown>][] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      objectEntries.push([key, value as Record<string, unknown>]);
    } else {
      scalarEntries.push([key, value]);
    }
  }

  // Only output section header if there are scalar values
  if (scalarEntries.length > 0) {
    lines.push(`[${prefix}]`);
    for (const [key, value] of scalarEntries) {
      lines.push(formatTOMLValue(key, value));
    }
    lines.push("");
  }

  // Handle nested sections
  for (const [key, value] of objectEntries) {
    serializeSection(lines, `${prefix}.${key}`, value);
  }
}

/**
 * Format a TOML key-value pair
 */
function formatTOMLValue(key: string, value: unknown): string {
  if (typeof value === "string") {
    return `${key} = "${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `${key} = ${value}`;
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => (typeof v === "string" ? `"${v}"` : String(v)));
    return `${key} = [ ${items.join(", ")} ]`;
  }
  if (value === undefined || value === null) {
    return `# ${key} = (not set)`;
  }
  return `${key} = ${JSON.stringify(value)}`;
}

/**
 * Show configuration in the specified format
 */
export function showConfig(config: Config, options: ShowConfigOptions): string {
  let snakeCaseConfig = toSnakeCaseConfig(config);

  if (options.section) {
    snakeCaseConfig = filterSection(snakeCaseConfig, options.section);
  }

  if (options.json) {
    return JSON.stringify(snakeCaseConfig, null, 2);
  }

  return serializeToTOML(snakeCaseConfig, options.sources ?? false);
}
