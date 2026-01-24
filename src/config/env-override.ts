/**
 * Environment variable override detector for config keys
 */

/**
 * Mapping of environment variables to config keys
 */
export const ENV_OVERRIDE_MAP: Record<string, string> = {
  REFERENCE_MANAGER_LIBRARY: "library",
  REFERENCE_MANAGER_ATTACHMENTS_DIR: "attachments.directory",
  REFERENCE_MANAGER_CLI_DEFAULT_LIMIT: "cli.default_limit",
  REFERENCE_MANAGER_MCP_DEFAULT_LIMIT: "mcp.default_limit",
  PUBMED_EMAIL: "pubmed.email",
  PUBMED_API_KEY: "pubmed.api_key",
};

/**
 * Reverse mapping: config key to environment variable
 */
const KEY_TO_ENV_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(ENV_OVERRIDE_MAP).map(([envVar, configKey]) => [configKey, envVar])
);

/**
 * Information about an environment variable override
 */
export interface EnvOverrideInfo {
  /** The environment variable name */
  envVar: string;
  /** The current value of the environment variable, or null if not set */
  value: string | null;
}

/**
 * Get the environment variable override value for a config key.
 * Returns the value if the environment variable is set, null otherwise.
 */
export function getEnvOverride(configKey: string): string | null {
  const envVar = KEY_TO_ENV_MAP[configKey];
  if (!envVar) {
    return null;
  }

  const value = process.env[envVar];
  return value ?? null;
}

/**
 * Get information about the environment variable that can override a config key.
 * Returns null if the key doesn't have an environment variable override.
 */
export function getEnvOverrideInfo(configKey: string): EnvOverrideInfo | null {
  const envVar = KEY_TO_ENV_MAP[configKey];
  if (!envVar) {
    return null;
  }

  const value = process.env[envVar];
  return {
    envVar,
    value: value ?? null,
  };
}

/**
 * Check if a config key has an environment variable override set.
 */
export function hasEnvOverride(configKey: string): boolean {
  return getEnvOverride(configKey) !== null;
}

/**
 * Get the environment variable name for a config key.
 * Returns null if the key doesn't have an environment variable mapping.
 */
export function getEnvVarName(configKey: string): string | null {
  return KEY_TO_ENV_MAP[configKey] ?? null;
}
