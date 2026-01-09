import * as yaml from "js-yaml";
import type { CslItem } from "../../core/csl-json/types.js";
import { transformDateToEdit } from "./field-transformer.js";

/**
 * Protected fields that cannot be edited.
 * These are shown as comments in the YAML output.
 */
const PROTECTED_FIELDS = ["uuid", "created_at", "timestamp", "fulltext"] as const;

/**
 * Creates the protected fields comment block for a single item.
 */
function createProtectedComment(item: CslItem): string {
  const custom = item.custom;
  if (!custom) {
    return "";
  }

  const lines: string[] = ["# === Protected Fields (do not edit) ==="];

  if (custom.uuid) {
    lines.push(`# uuid: ${custom.uuid}`);
  }
  if (custom.created_at) {
    lines.push(`# created_at: ${custom.created_at}`);
  }
  if (custom.timestamp) {
    lines.push(`# timestamp: ${custom.timestamp}`);
  }
  if (custom.fulltext) {
    lines.push("# fulltext:");
    if (custom.fulltext.pdf) {
      lines.push(`#   pdf: ${custom.fulltext.pdf}`);
    }
    if (custom.fulltext.markdown) {
      lines.push(`#   markdown: ${custom.fulltext.markdown}`);
    }
  }

  lines.push("# ========================================");
  return lines.join("\n");
}

/**
 * Filters out protected fields from custom object.
 */
function filterCustomFields(customValue: Record<string, unknown>): Record<string, unknown> | null {
  const filteredCustom: Record<string, unknown> = {};
  for (const [customKey, customVal] of Object.entries(customValue)) {
    if (!PROTECTED_FIELDS.includes(customKey as (typeof PROTECTED_FIELDS)[number])) {
      filteredCustom[customKey] = customVal;
    }
  }
  return Object.keys(filteredCustom).length > 0 ? filteredCustom : null;
}

/**
 * Transforms a CSL item for editing by:
 * - Removing protected fields from custom
 * - Converting date-parts to ISO strings
 */
function transformItemForEdit(item: CslItem): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === "custom") {
      const filtered = filterCustomFields(value as Record<string, unknown>);
      if (filtered) {
        result.custom = filtered;
      }
    } else if (key === "issued" || key === "accessed") {
      const dateValue = value as { "date-parts"?: number[][] };
      const isoDate = transformDateToEdit(dateValue);
      if (isoDate) {
        result[key] = isoDate;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Serializes CSL items to YAML format for editing.
 * Protected fields are shown as comments.
 */
export function serializeToYaml(items: CslItem[]): string {
  const sections: string[] = [];

  for (const item of items) {
    // Create protected fields comment
    const protectedComment = createProtectedComment(item);

    // Transform item for editing
    const editableItem = transformItemForEdit(item);

    // Serialize to YAML (as array for consistency)
    const yamlContent = yaml.dump([editableItem], {
      lineWidth: -1, // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    });

    // Combine comment and content
    if (protectedComment) {
      sections.push(`${protectedComment}\n\n${yamlContent}`);
    } else {
      sections.push(yamlContent);
    }
  }

  return sections.join("\n---\n\n");
}
