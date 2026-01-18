/**
 * Config set subcommand - sets a configuration value
 */

import type { EnvOverrideInfo } from "../../config/env-override.js";
import { isValidConfigKey } from "../../config/key-parser.js";
import { writeTOMLValue } from "../../config/toml-writer.js";
import { validateConfigValue } from "../../config/value-validator.js";

/**
 * Options for setConfigValue
 */
export interface SetConfigOptions {
  /** Environment override info if active */
  envOverrideInfo?: EnvOverrideInfo;
}

/**
 * Result of setConfigValue
 */
export interface SetConfigResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Warning message (e.g., env override active) */
  warning?: string;
}

/**
 * Set a configuration value in a config file.
 */
export async function setConfigValue(
  configPath: string,
  key: string,
  value: unknown,
  options: SetConfigOptions = {}
): Promise<SetConfigResult> {
  // Validate key
  if (!isValidConfigKey(key)) {
    return { success: false, error: `Unknown configuration key: '${key}'` };
  }

  // Validate value
  const validation = validateConfigValue(key, value);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "Validation failed" };
  }

  // Write to config file
  try {
    await writeTOMLValue(configPath, key, value as string | number | boolean | string[]);
  } catch (error) {
    return {
      success: false,
      error: `Failed to write config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Check for environment override warning
  if (options.envOverrideInfo?.value !== undefined && options.envOverrideInfo?.value !== null) {
    const warning = `Warning: '${key}' is overridden by environment variable ${options.envOverrideInfo.envVar}
  Environment value: ${options.envOverrideInfo.value}
  Config file value: ${value} (saved but inactive)

The environment variable takes precedence. To use the config file value,
unset the environment variable: unset ${options.envOverrideInfo.envVar}`;
    return { success: true, warning };
  }

  return { success: true };
}
