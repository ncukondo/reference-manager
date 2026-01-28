import type { CslItem } from "../../core/csl-json/types.js";
import { MANAGED_CUSTOM_FIELDS } from "../../core/library-interface.js";
import { ISO_DATE_REGEX, transformDateFromEdit, transformDateToEdit } from "./field-transformer.js";

interface ProtectedFields {
  uuid?: string;
  created_at?: string;
  timestamp?: string;
}

/**
 * Extracts protected fields from custom object.
 */
function extractProtectedFields(custom: Record<string, unknown> | undefined): ProtectedFields {
  if (!custom) return {};

  const result: ProtectedFields = {};
  if (custom.uuid) result.uuid = custom.uuid as string;
  if (custom.created_at) result.created_at = custom.created_at as string;
  if (custom.timestamp) result.timestamp = custom.timestamp as string;

  return result;
}

/**
 * Filters out protected fields from custom object.
 */
function filterCustomFields(custom: Record<string, unknown>): Record<string, unknown> | null {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(custom)) {
    if (!MANAGED_CUSTOM_FIELDS.has(key)) {
      filtered[key] = value;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
}

/**
 * Transforms a CSL item for JSON editing.
 */
function transformItemForJson(item: CslItem): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const protectedFields = extractProtectedFields(item.custom as Record<string, unknown>);

  // Add _protected first
  if (Object.keys(protectedFields).length > 0) {
    result._protected = protectedFields;
  }

  // Copy all fields except custom (handled separately)
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
 * Serializes CSL items to JSON format for editing.
 * Protected fields are nested under _protected key.
 */
export function serializeToJson(items: CslItem[]): string {
  const transformed = items.map(transformItemForJson);
  return JSON.stringify(transformed, null, 2);
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
 * Deserializes JSON content back to CSL items.
 * Ignores _protected fields.
 */
export function deserializeFromJson(jsonContent: string): Record<string, unknown>[] {
  const parsed = JSON.parse(jsonContent);

  if (!Array.isArray(parsed)) {
    throw new Error("Expected JSON array");
  }

  return parsed.map((item) => {
    const protectedData = item._protected as ProtectedFields | undefined;
    const uuid = protectedData?.uuid;

    // Remove _protected from item
    const { _protected, ...rest } = item;

    // Transform date fields
    const transformed = transformDateFields(rest);

    // Attach extracted UUID for matching
    if (uuid) {
      transformed._extractedUuid = uuid;
    }

    return transformed;
  });
}
