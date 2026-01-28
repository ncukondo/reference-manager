import type { CslItem } from "../../core/csl-json/types.js";
import { MANAGED_CUSTOM_FIELDS } from "../../core/library-interface.js";
import type { EditValidationError } from "./edit-validator.js";
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
 * Strips internal fields (like _extractedUuid) from edited item.
 */
function stripInternalFields(item: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (!key.startsWith("_")) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Serializes edited items to JSON with _errors annotations for re-edit.
 *
 * @param editedItems - User's edited items (preserves their changes)
 * @param errors - Validation errors per item index
 * @param originalItems - Original items for protected fields (optional)
 */
export function serializeToJsonWithErrors(
  editedItems: Record<string, unknown>[],
  errors: Map<number, EditValidationError[]>,
  originalItems?: CslItem[]
): string {
  const transformed = editedItems.map((editedItem, index) => {
    const originalItem = originalItems?.[index];
    const protectedFields = originalItem
      ? extractProtectedFields(originalItem.custom as Record<string, unknown>)
      : {};

    // Start with _errors if present
    const itemErrors = errors.get(index);
    const result: Record<string, unknown> = {};

    if (itemErrors) {
      result._errors = itemErrors.map((e) => `${e.field}: ${e.message}`);
    }

    // Add _protected if available
    if (Object.keys(protectedFields).length > 0) {
      result._protected = protectedFields;
    }

    // Copy edited item fields (excluding internal fields)
    const cleanItem = stripInternalFields(editedItem);
    for (const [key, value] of Object.entries(cleanItem)) {
      result[key] = value;
    }

    return result;
  });
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

    // Remove _protected and _errors from item
    const { _protected, _errors, ...rest } = item;

    // Transform date fields
    const transformed = transformDateFields(rest);

    // Attach extracted UUID for matching
    if (uuid) {
      transformed._extractedUuid = uuid;
    }

    return transformed;
  });
}
