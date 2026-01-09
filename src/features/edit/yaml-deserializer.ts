import * as yaml from "js-yaml";
import { transformDateFromEdit } from "./field-transformer.js";

const UUID_COMMENT_REGEX = /^#\s*uuid:\s*(.+)$/m;
const ISO_DATE_REGEX = /^\d{4}(-\d{2})?(-\d{2})?$/;

/**
 * Extracts the UUID from a protected comment block.
 */
export function extractUuidFromComment(content: string): string | undefined {
  const match = content.match(UUID_COMMENT_REGEX);
  return match?.[1]?.trim();
}

/**
 * Transforms date fields from ISO strings back to date-parts format.
 */
function transformDateFields(item: Record<string, unknown>): Record<string, unknown> {
  const result = { ...item };

  for (const dateField of ["issued", "accessed"]) {
    const value = result[dateField];
    if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
      result[dateField] = transformDateFromEdit(value);
    }
  }

  return result;
}

/**
 * Parses a single YAML document section (with optional comments).
 */
function parseSection(section: string): Record<string, unknown>[] {
  const uuid = extractUuidFromComment(section);

  // Remove comment lines for parsing
  const yamlOnly = section
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .trim();

  if (!yamlOnly) {
    return [];
  }

  const parsed = yaml.load(yamlOnly);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item) => {
    const transformed = transformDateFields(item as Record<string, unknown>);
    if (uuid) {
      transformed._extractedUuid = uuid;
    }
    return transformed;
  });
}

/**
 * Deserializes YAML content back to CSL items.
 * Extracts UUID from comment blocks to match original items.
 */
export function deserializeFromYaml(yamlContent: string): Record<string, unknown>[] {
  // Split by document separator
  const sections = yamlContent.split(/^---$/m);
  const results: Record<string, unknown>[] = [];

  for (const section of sections) {
    const items = parseSection(section);
    results.push(...items);
  }

  return results;
}
