import type { ListFormat, ListResult } from "../../features/operations/list.js";
import type { SortField, SortOrder } from "../../features/pagination/index.js";
import type { ExecutionContext } from "../execution-context.js";
import { pickDefined } from "../helpers.js";

/**
 * Options for the list command.
 */
export interface ListCommandOptions {
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
  sort?: SortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

/**
 * Result from list command execution.
 */
export type ListCommandResult = ListResult;

/**
 * Convert CLI options to ListFormat.
 */
function getListFormat(options: ListCommandOptions): ListFormat {
  if (options.json) return "json";
  if (options.idsOnly) return "ids-only";
  if (options.uuid) return "uuid";
  if (options.bibtex) return "bibtex";
  return "pretty";
}

/**
 * Validate that only one output format is specified.
 */
function validateOptions(options: ListCommandOptions): void {
  const outputOptions = [options.json, options.idsOnly, options.uuid, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  }
}

/**
 * Execute list command.
 * Uses context.library.list() which works for both local and server modes.
 *
 * @param options - List command options
 * @param context - Execution context
 * @returns List result containing formatted items
 */
export async function executeList(
  options: ListCommandOptions,
  context: ExecutionContext
): Promise<ListCommandResult> {
  validateOptions(options);
  const format = getListFormat(options);

  return context.library.list({
    format,
    ...pickDefined(options, ["sort", "order", "limit", "offset"] as const),
  });
}

/**
 * Format list result for CLI output.
 *
 * @param result - List result
 * @param isJson - Whether the output format is JSON
 * @returns Formatted output string
 */
export function formatListOutput(result: ListCommandResult, isJson = false): string {
  if (isJson) {
    // JSON output includes pagination metadata
    return JSON.stringify({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      nextOffset: result.nextOffset,
    });
  }

  if (result.items.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Add header line when limit is applied and not showing all
  if (result.limit > 0 && result.total > 0) {
    const start = result.offset + 1;
    const end = result.offset + result.items.length;
    lines.push(`# Showing ${start}-${end} of ${result.total} references`);
  }

  lines.push(...result.items);
  return lines.join("\n");
}
