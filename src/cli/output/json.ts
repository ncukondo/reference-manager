import type { Reference } from "../../core/reference";

/**
 * Format references as compact JSON
 */
export function formatJson(references: Reference[]): string {
  const items = references.map((ref) => ref.getItem());
  return JSON.stringify(items);
}
