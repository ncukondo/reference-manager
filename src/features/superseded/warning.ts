/**
 * Warning lines for superseded references (#108).
 *
 * These always go to stderr. stdout stays byte-identical to the unmarked case so that piping
 * `ref export`, `ref cite`, or `ref list --output ids` into another tool keeps working.
 *
 * See spec/features/superseded.md.
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { buildUuidIndex, getSupersededMark, resolveFinalSuccessor } from "./resolver.js";

/**
 * Build the stderr warning line for one reference.
 *
 * @returns The line, or null when the reference is not superseded
 */
export function formatSupersededWarning(item: CslItem, index: Map<string, CslItem>): string | null {
  const mark = getSupersededMark(item);
  if (!mark) {
    return null;
  }

  const chain = resolveFinalSuccessor(item, index);
  const target = chain?.target;
  // A dangling first hop leaves no record to name, so show the uuid the pointer asked for —
  // it is the only handle the user has for tracking down what was removed.
  const successor = target ? target.id : `<missing: ${mark.supersededBy}>`;
  const suffix = chain?.cycle ? `${mark.reason}, superseded chain has a cycle` : mark.reason;

  return `[SUPERSEDED] ${item.id} -> ${successor} (${suffix})`;
}

/**
 * Build warning lines for every superseded reference among `items`.
 *
 * @param items - The references being shown to the user
 * @param allItems - The whole library; pointers may target records outside `items`
 */
export function collectSupersededWarnings(items: CslItem[], allItems: CslItem[]): string[] {
  const index = buildUuidIndex(allItems);
  const warnings: string[] = [];
  for (const item of items) {
    const warning = formatSupersededWarning(item, index);
    if (warning) {
      warnings.push(warning);
    }
  }
  return warnings;
}
