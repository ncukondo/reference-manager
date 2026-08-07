/**
 * stderr reporting for superseded references (#108).
 *
 * Read commands call this after writing their own output. Warnings never touch stdout, so
 * piping `ref export`, `ref cite`, or `ref list --output ids` stays byte-identical to the
 * unmarked case. See spec/features/superseded.md.
 */

import type { CslItem } from "../core/csl-json/types.js";
import { collectSupersededWarnings, isSuperseded } from "../features/superseded/index.js";
import type { ExecutionContext } from "./execution-context.js";

export interface ReportSupersededOptions {
  /** Suppress all output (config.logLevel === "silent") */
  silent?: boolean;
  /** Extra line written after the per-record warnings, when any were written */
  summary?: (count: number) => string;
}

/**
 * Write one `[SUPERSEDED]` line per superseded reference in `items`.
 *
 * @returns How many references were superseded
 */
export async function reportSuperseded(
  items: CslItem[],
  context: ExecutionContext,
  options: ReportSupersededOptions = {}
): Promise<number> {
  if (options.silent) {
    return 0;
  }

  const marked = items.filter(isSuperseded);
  if (marked.length === 0) {
    return 0;
  }

  // Fetch the library only once something is actually marked: a pointer may target a record
  // outside the shown set, so resolution needs the whole library, but the common case is that
  // nothing is superseded and no command should pay for a full fetch to find that out.
  const allItems = await context.library.getAll();

  for (const line of collectSupersededWarnings(marked, allItems)) {
    process.stderr.write(`${line}\n`);
  }

  if (options.summary) {
    process.stderr.write(`${options.summary(marked.length)}\n`);
  }

  return marked.length;
}
