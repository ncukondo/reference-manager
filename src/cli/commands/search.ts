import type { SearchFormat, SearchResult } from "../../features/operations/search.js";
import type { SearchSortField, SortOrder } from "../../features/pagination/index.js";
import type { ExecutionContext } from "../execution-context.js";
import { pickDefined } from "../helpers.js";

/**
 * Options for the search command.
 */
export interface SearchCommandOptions {
  query: string;
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
  sort?: SearchSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

/**
 * Result from search command execution.
 */
export type SearchCommandResult = SearchResult;

/**
 * Convert CLI options to SearchFormat.
 */
function getSearchFormat(options: SearchCommandOptions): SearchFormat {
  if (options.json) return "json";
  if (options.idsOnly) return "ids-only";
  if (options.uuid) return "uuid";
  if (options.bibtex) return "bibtex";
  return "pretty";
}

/**
 * Validate that only one output format is specified.
 */
function validateOptions(options: SearchCommandOptions): void {
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
 * Execute search command.
 * Uses context.library.search() which works for both local and server modes.
 *
 * @param options - Search command options
 * @param context - Execution context
 * @returns Search result containing formatted items
 */
export async function executeSearch(
  options: SearchCommandOptions,
  context: ExecutionContext
): Promise<SearchCommandResult> {
  validateOptions(options);
  const format = getSearchFormat(options);

  return context.library.search({
    query: options.query,
    format,
    ...pickDefined(options, ["sort", "order", "limit", "offset"] as const),
  });
}

/**
 * Format search result for CLI output.
 *
 * @param result - Search result
 * @param isJson - Whether the output format is JSON
 * @returns Formatted output string
 */
export function formatSearchOutput(result: SearchCommandResult, isJson = false): string {
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
