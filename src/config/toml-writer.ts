import { existsSync, readFileSync } from "node:fs";
import { parse as parseTOML, stringify as stringifyTOML } from "@iarna/toml";
import { writeFileAtomic } from "../utils/file.js";

type TOMLValue = string | number | boolean | string[] | number[];
type TOMLObject = { [key: string]: TOMLValue | TOMLObject };

/**
 * Serialize an object to TOML format string.
 */
export function serializeToTOML(obj: TOMLObject): string {
  return stringifyTOML(obj as Parameters<typeof stringifyTOML>[0]);
}

/**
 * Parse a dot-notation key into an array of path segments.
 */
function parseKeyPath(key: string): string[] {
  return key.split(".");
}

/**
 * Set a value at a nested path in an object.
 */
function setNestedValue(obj: TOMLObject, keyPath: string[], value: TOMLValue): void {
  if (keyPath.length === 0) {
    return;
  }

  let current: TOMLObject = obj;

  for (let i = 0; i < keyPath.length - 1; i++) {
    const segment = keyPath[i] as string;
    if (!(segment in current) || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment] as TOMLObject;
  }

  const finalKey = keyPath[keyPath.length - 1] as string;
  current[finalKey] = value;
}

/**
 * Remove a value at a nested path in an object.
 * Returns true if the key was found and removed.
 */
function removeNestedValue(obj: TOMLObject, keyPath: string[]): boolean {
  if (keyPath.length === 0) {
    return false;
  }

  const firstKey = keyPath[0] as string;

  if (keyPath.length === 1) {
    if (firstKey in obj) {
      delete obj[firstKey];
      return true;
    }
    return false;
  }

  if (!(firstKey in obj) || typeof obj[firstKey] !== "object") {
    return false;
  }

  const nested = obj[firstKey] as TOMLObject;
  const removed = removeNestedValue(nested, keyPath.slice(1));

  // Clean up empty sections
  if (removed && Object.keys(nested).length === 0) {
    delete obj[firstKey];
  }

  return removed;
}

/**
 * Load existing TOML file or return an empty object.
 */
function loadExistingTOML(filePath: string): TOMLObject {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return parseTOML(content) as TOMLObject;
  } catch {
    return {};
  }
}

/**
 * Write a value to a TOML config file.
 * Creates the file and parent directories if they don't exist.
 * Preserves existing content.
 */
export async function writeTOMLValue(
  filePath: string,
  key: string,
  value: TOMLValue
): Promise<void> {
  // Load existing content
  const obj = loadExistingTOML(filePath);

  // Set the new value
  const keyPath = parseKeyPath(key);
  setNestedValue(obj, keyPath, value);

  // Write back atomically
  const content = serializeToTOML(obj);
  await writeFileAtomic(filePath, content);
}

/**
 * Remove a key from a TOML config file.
 * Does nothing if the file or key doesn't exist.
 */
export async function removeTOMLKey(filePath: string, key: string): Promise<void> {
  if (!existsSync(filePath)) {
    return;
  }

  const obj = loadExistingTOML(filePath);
  const keyPath = parseKeyPath(key);

  const removed = removeNestedValue(obj, keyPath);

  if (removed) {
    const content = serializeToTOML(obj);
    await writeFileAtomic(filePath, content);
  }
}

/**
 * Create a commented configuration template.
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

[attachments]
# directory = "~/.local/share/reference-manager/attachments"

[cli]
# default_limit = 0  # 0 = unlimited
# default_sort = "updated"
# default_order = "desc"

[cli.tui]
# limit = 20
# debounce_ms = 200

[cli.edit]
# default_format = "yaml"  # yaml, json

[mcp]
# default_limit = 20
`;
}
