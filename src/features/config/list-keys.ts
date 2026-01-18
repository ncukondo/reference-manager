/**
 * Config list-keys subcommand - lists all available configuration keys
 */

import { getAllConfigKeys, getConfigKeyInfo } from "../../config/key-parser.js";

/**
 * Options for listConfigKeys
 */
export interface ListKeysOptions {
  /** Filter by section (e.g., "citation", "cli") */
  section?: string;
}

/**
 * List all available configuration keys with their types and descriptions.
 * Output format: key  type  description (aligned columns)
 */
export function listConfigKeys(options: ListKeysOptions): string {
  const keys = getAllConfigKeys(options.section);

  if (keys.length === 0) {
    return "";
  }

  // Get info for each key
  const entries = keys
    .map((key) => {
      const info = getConfigKeyInfo(key);
      if (!info) {
        return null;
      }
      return {
        key: info.key,
        type: info.type,
        description: info.description,
      };
    })
    .filter((e) => e !== null);

  // Calculate column widths for alignment
  const maxKeyWidth = Math.max(...entries.map((e) => e.key.length));
  const maxTypeWidth = Math.max(...entries.map((e) => e.type.length));

  // Format each line with proper spacing
  const lines = entries.map((entry) => {
    const keyPadded = entry.key.padEnd(maxKeyWidth);
    const typePadded = entry.type.padEnd(maxTypeWidth);
    return `${keyPadded}  ${typePadded}  ${entry.description}`;
  });

  return lines.join("\n");
}
