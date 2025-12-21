import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Format references as compact JSON
 */
export function formatJson(items: CslItem[]): string {
  return JSON.stringify(items);
}
