import {
  type SearchFormat,
  type SearchResult,
  searchReferences,
} from "../../features/operations/search.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the search command.
 */
export interface SearchCommandOptions {
  query: string;
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
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
 * Routes to server API or direct library operation based on execution context.
 *
 * @param options - Search command options
 * @param context - Execution context (server or local)
 * @returns Search result containing formatted items
 */
export async function executeSearch(
  options: SearchCommandOptions,
  context: ExecutionContext
): Promise<SearchCommandResult> {
  validateOptions(options);
  const format = getSearchFormat(options);

  if (context.type === "server") {
    // Use server's search API with format option
    return context.client.search({ query: options.query, format });
  }

  // Direct library operation
  return searchReferences(context.library, { query: options.query, format });
}

/**
 * Format search result for CLI output.
 *
 * @param result - Search result
 * @returns Formatted output string
 */
export function formatSearchOutput(result: SearchCommandResult): string {
  if (result.items.length === 0) {
    return "";
  }
  return result.items.join("\n");
}
