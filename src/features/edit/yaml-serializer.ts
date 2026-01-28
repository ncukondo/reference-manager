import * as yaml from "js-yaml";
import type { CslItem } from "../../core/csl-json/types.js";
import { MANAGED_CUSTOM_FIELDS } from "../../core/library-interface.js";
import type { EditValidationError } from "./edit-validator.js";
import { transformDateToEdit } from "./field-transformer.js";

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
  lines.push("# ========================================");
  return lines.join("\n");
}

/**
 * Filters out protected fields from custom object.
 */
function filterCustomFields(customValue: Record<string, unknown>): Record<string, unknown> | null {
  const filteredCustom: Record<string, unknown> = {};
  for (const [customKey, customVal] of Object.entries(customValue)) {
    if (!MANAGED_CUSTOM_FIELDS.has(customKey)) {
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

/**
 * Serializes CSL items to YAML with error annotations for re-edit.
 * Adds file-top summary and per-entry error blocks.
 */
export function serializeToYamlWithErrors(
  items: CslItem[],
  errors: Map<number, EditValidationError[]>
): string {
  const errorCount = errors.size;
  const totalCount = items.length;

  // File-top summary
  const summaryLines: string[] = [
    `# ⚠ Validation Errors (${errorCount} of ${totalCount} entries)`,
    "# ─────────────────────────────────────",
  ];
  for (const [index, itemErrors] of errors) {
    const item = items[index];
    const id = item?.id ?? `Entry ${index + 1}`;
    const fields = itemErrors.map((e) => e.field).join(", ");
    summaryLines.push(`# ${id}: ${fields}`);
  }
  summaryLines.push("# ─────────────────────────────────────");

  const sections: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as CslItem;
    const itemErrors = errors.get(i);

    // Error block (only for errored entries)
    let errorBlock = "";
    if (itemErrors) {
      const errorLines = ["# ⚠ Errors:"];
      for (const err of itemErrors) {
        errorLines.push(`#   ${err.field}: ${err.message}`);
      }
      errorLines.push("#");
      errorBlock = `${errorLines.join("\n")}\n`;
    }

    // Protected fields comment
    const protectedComment = createProtectedComment(item);

    // Transform item for editing
    const editableItem = transformItemForEdit(item);

    // Serialize to YAML
    const yamlContent = yaml.dump([editableItem], {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });

    // Combine parts
    const parts = [errorBlock, protectedComment ? `${protectedComment}\n` : "", yamlContent]
      .filter(Boolean)
      .join("\n");
    sections.push(parts);
  }

  return `${summaryLines.join("\n")}\n---\n${sections.join("---\n")}`;
}
