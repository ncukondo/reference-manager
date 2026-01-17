/**
 * Config get subcommand - retrieves a specific configuration value
 */

import { isValidConfigKey, toInternalPath } from "../../config/key-parser.js";
import type { Config } from "../../config/schema.js";

/**
 * Options for getConfigValue
 */
export interface GetConfigOptions {
  /** Environment variable override value, if set */
  envOverride?: string;
  /** Ignore environment variable override */
  configOnly?: boolean;
}

/**
 * Result of getConfigValue
 */
export interface GetConfigResult {
  /** Whether the value was found */
  found: boolean;
  /** The value (if found) */
  value?: unknown;
  /** Whether the value came from an environment variable */
  fromEnv?: boolean;
  /** Error message (if not found) */
  error?: string;
}

/**
 * Get a configuration value by key.
 */
export function getConfigValue(
  config: Config,
  key: string,
  options: GetConfigOptions
): GetConfigResult {
  // Validate key
  if (!isValidConfigKey(key)) {
    return { found: false, error: `Unknown configuration key: '${key}'` };
  }

  // Check environment override
  if (options.envOverride !== undefined && !options.configOnly) {
    return {
      found: true,
      value: options.envOverride,
      fromEnv: true,
    };
  }

  // Get value from config
  const internalPath = toInternalPath(key);
  const value = getNestedValue(config, internalPath);

  // Check for unset values
  if (value === undefined || value === null) {
    return { found: false, error: `Value for '${key}' is not set` };
  }

  return { found: true, value };
}

/**
 * Get a nested value from an object using a path array.
 */
function getNestedValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Format a value for output.
 */
export function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}
