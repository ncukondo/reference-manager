import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Protected custom fields that should be excluded from change detection.
 */
const PROTECTED_CUSTOM_FIELDS = new Set(["uuid", "created_at", "timestamp", "fulltext"]);

const MAX_DISPLAY_LENGTH = 40;

/**
 * Deep equality check for comparing CSL item field values.
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    if (aKeys.length !== Object.keys(bObj).length) return false;
    return aKeys.every((key) => isEqual(aObj[key], bObj[key]));
  }

  return false;
}

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
    if (PROTECTED_CUSTOM_FIELDS.has(ck)) continue;
    if (!isEqual(oldCustom[ck], newCustom[ck])) {
      changed.push(`custom.${ck}`);
    }
  }
  return changed;
}

/**
 * Compare two CSL items and return the list of changed field names.
 * Excludes protected custom fields (uuid, created_at, timestamp, fulltext).
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
 * Format a single field change for display.
 *
 * Examples:
 *   title: "Old Title" → "New Title"
 *   author: +1 entry
 *   volume: → "42"
 *   volume: "42" → (removed)
 */
export function formatFieldChange(field: string, oldValue: unknown, newValue: unknown): string {
  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    return formatArrayChange(field, oldValue, newValue);
  }
  return formatScalarChange(field, oldValue, newValue);
}
