import type { CslItem } from "../../core/csl-json/types.js";
import { MANAGED_CUSTOM_FIELDS } from "../../core/library-interface.js";
import { isEqual } from "../../utils/object.js";
import { transformDateToEdit } from "../edit/field-transformer.js";

const DATE_FIELDS = new Set(["issued", "accessed"]);

const MAX_DISPLAY_LENGTH = 40;

/**
 * Compare custom fields and return changed custom field names (with "custom." prefix).
 */
function getChangedCustomFields(
  oldCustom: Record<string, unknown>,
  newCustom: Record<string, unknown>
): string[] {
  const changed: string[] = [];
  const customKeys = new Set([...Object.keys(oldCustom), ...Object.keys(newCustom)]);
  for (const ck of customKeys) {
    if (MANAGED_CUSTOM_FIELDS.has(ck)) continue;
    if (!isEqual(oldCustom[ck], newCustom[ck])) {
      changed.push(`custom.${ck}`);
    }
  }
  return changed;
}

/**
 * Compare two CSL items and return the list of changed field names.
 * Excludes protected custom fields (uuid, created_at, timestamp).
 */
export function getChangedFields(oldItem: CslItem, newItem: CslItem): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(oldItem), ...Object.keys(newItem)]);

  for (const key of allKeys) {
    if (key === "custom") {
      const oldCustom = (oldItem.custom ?? {}) as Record<string, unknown>;
      const newCustom = (newItem.custom ?? {}) as Record<string, unknown>;
      changed.push(...getChangedCustomFields(oldCustom, newCustom));
      continue;
    }

    const oldVal = oldItem[key as keyof CslItem];
    const newVal = newItem[key as keyof CslItem];
    if (!isEqual(oldVal, newVal)) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Truncate a string for display, adding ellipsis if too long.
 */
function truncate(s: string): string {
  if (s.length <= MAX_DISPLAY_LENGTH) return s;
  return `${s.slice(0, MAX_DISPLAY_LENGTH - 1)}…`;
}

/**
 * Pluralize "entry" / "entries" based on count.
 */
function pluralEntry(n: number): string {
  return Math.abs(n) === 1 ? "entry" : "entries";
}

/**
 * Format an array field change.
 */
function formatArrayChange(field: string, oldValue: unknown, newValue: unknown): string {
  const oldLen = Array.isArray(oldValue) ? oldValue.length : 0;
  const newLen = Array.isArray(newValue) ? newValue.length : 0;
  const diff = newLen - oldLen;
  if (diff !== 0) {
    const sign = diff > 0 ? "+" : "";
    return `${field}: ${sign}${diff} ${pluralEntry(diff)}`;
  }
  return `${field}: modified`;
}

/**
 * Format a scalar field change.
 */
function formatScalarChange(field: string, oldValue: unknown, newValue: unknown): string {
  const oldStr = oldValue != null ? String(oldValue) : undefined;
  const newStr = newValue != null ? String(newValue) : undefined;

  if (oldStr == null && newStr != null) {
    return `${field}: → "${truncate(newStr)}"`;
  }
  if (oldStr != null && newStr == null) {
    return `${field}: "${truncate(oldStr)}" → (removed)`;
  }
  return `${field}: "${truncate(oldStr ?? "")}" → "${truncate(newStr ?? "")}"`;
}

/**
 * Format a date field value for display.
 */
function formatDateValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  const isoDate = transformDateToEdit(value as { "date-parts"?: number[][] });
  return isoDate ?? JSON.stringify(value);
}

/**
 * Format a date field change.
 */
function formatDateChange(field: string, oldValue: unknown, newValue: unknown): string {
  const oldStr = formatDateValue(oldValue);
  const newStr = formatDateValue(newValue);

  if (oldStr == null && newStr != null) {
    return `${field}: → "${newStr}"`;
  }
  if (oldStr != null && newStr == null) {
    return `${field}: "${oldStr}" → (removed)`;
  }
  return `${field}: "${oldStr ?? ""}" → "${newStr ?? ""}"`;
}

/**
 * Format a single field change for display.
 *
 * Examples:
 *   title: "Old Title" → "New Title"
 *   author: +1 entry
 *   volume: → "42"
 *   volume: "42" → (removed)
 *   issued: "2024-03-15" → "2024-04-01"
 */
export function formatFieldChange(field: string, oldValue: unknown, newValue: unknown): string {
  if (DATE_FIELDS.has(field)) {
    return formatDateChange(field, oldValue, newValue);
  }
  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    return formatArrayChange(field, oldValue, newValue);
  }
  return formatScalarChange(field, oldValue, newValue);
}

/**
 * Get a field value from a CslItem, supporting dot notation for custom fields.
 */
export function getFieldValue(item: CslItem, field: string): unknown {
  if (field.startsWith("custom.")) {
    const customKey = field.slice("custom.".length);
    return (item.custom as Record<string, unknown> | undefined)?.[customKey];
  }
  return item[field as keyof CslItem];
}

/**
 * Format all change details for a pair of old/new items.
 * Returns formatted change lines (indented with 2 spaces).
 */
export function formatChangeDetails(oldItem: CslItem, newItem: CslItem): string[] {
  const changedFields = getChangedFields(oldItem, newItem);
  return changedFields.map((field) => {
    const oldVal = getFieldValue(oldItem, field);
    const newVal = getFieldValue(newItem, field);
    return `  ${formatFieldChange(field, oldVal, newVal)}`;
  });
}
