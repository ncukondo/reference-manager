import type { Library } from "../../core/library.js";
import {
  type SearchFormat,
  type SearchResult,
  searchReferences,
} from "../../features/operations/search.js";
import type { ServerClient } from "../server-client.js";

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
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - Search command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns Search result containing formatted items
 */
export async function executeSearch(
  options: SearchCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<SearchCommandResult> {
  validateOptions(options);
  const format = getSearchFormat(options);

  if (serverClient) {
    // Use server's search API with format option
    return serverClient.search({ query: options.query, format });
  }

  // Direct library operation
  return searchReferences(library, { query: options.query, format });
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
