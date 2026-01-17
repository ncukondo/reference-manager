/**
 * Config unset subcommand - removes a configuration value
 */

import { isValidConfigKey } from "../../config/key-parser.js";
import { removeTOMLKey } from "../../config/toml-writer.js";

/**
 * Result of unsetConfigValue
 */
export interface UnsetConfigResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Remove a configuration value from a config file.
 */
export async function unsetConfigValue(
  configPath: string,
  key: string
): Promise<UnsetConfigResult> {
  // Validate key
  if (!isValidConfigKey(key)) {
    return { success: false, error: `Unknown configuration key: '${key}'` };
  }

  // Remove from config file
  try {
    await removeTOMLKey(configPath, key);
  } catch (error) {
    return {
      success: false,
      error: `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return { success: true };
}
