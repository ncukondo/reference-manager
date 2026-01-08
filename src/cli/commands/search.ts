import type { Config } from "../../config/schema.js";
import type { SearchFormat, SearchResult } from "../../features/operations/search.js";
import {
  type SearchSortField,
  type SortOrder,
  paginationOptionsSchema,
  resolveSortAlias,
  sortOrderSchema,
} from "../../features/pagination/index.js";
import { pickDefined } from "../../utils/object.js";
import type { ExecutionContext } from "../execution-context.js";

// Valid sort fields for search command (includes "relevance" and aliases)
const VALID_SEARCH_SORT_FIELDS = new Set([
  "created",
  "updated",
  "published",
  "author",
  "title",
  "relevance",
  "add",
  "mod",
  "pub",
  "rel",
]);

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
  interactive?: boolean;
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
 * Validate search command options.
 * @throws Error if options are invalid
 */
function validateOptions(options: SearchCommandOptions): void {
  // Validate output format
  const outputOptions = [options.json, options.idsOnly, options.uuid, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  }

  // Validate sort field (if provided)
  if (options.sort !== undefined) {
    const sortStr = String(options.sort);
    if (!VALID_SEARCH_SORT_FIELDS.has(sortStr)) {
      throw new Error(`Invalid sort field: ${sortStr}`);
    }
  }

  // Validate sort order (if provided)
  if (options.order !== undefined) {
    const result = sortOrderSchema.safeParse(options.order);
    if (!result.success) {
      throw new Error(`Invalid sort order: ${options.order}`);
    }
  }

  // Validate pagination options
  const paginationResult = paginationOptionsSchema.safeParse({
    limit: options.limit,
    offset: options.offset,
  });
  if (!paginationResult.success) {
    const issue = paginationResult.error.issues[0];
    throw new Error(`Invalid pagination option: ${issue?.message ?? "unknown error"}`);
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

  // Resolve sort alias (e.g., "pub" -> "published", "rel" -> "relevance")
  const sort = options.sort ? resolveSortAlias(options.sort) : undefined;

  return context.library.search({
    query: options.query,
    format,
    ...(sort !== undefined && { sort }),
    ...pickDefined(options, ["order", "limit", "offset"] as const),
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
    // items are CslItem[] for JSON format
    return JSON.stringify({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      nextOffset: result.nextOffset,
    });
  }

  // For non-JSON formats, items are string[]
  const items = result.items as string[];

  if (items.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Add header line when limit is applied and not showing all
  if (result.limit > 0 && result.total > 0) {
    const start = result.offset + 1;
    const end = result.offset + items.length;
    lines.push(`# Showing ${start}-${end} of ${result.total} references`);
  }

  lines.push(...items);
  return lines.join("\n");
}

/**
 * Result from interactive search command execution.
 */
export interface InteractiveSearchResult {
  output: string;
  cancelled: boolean;
}

/**
 * Validate interactive mode options.
 * @throws Error if interactive mode is combined with incompatible options
 */
function validateInteractiveOptions(options: SearchCommandOptions): void {
  const outputOptions = [options.json, options.idsOnly, options.uuid, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 0) {
    throw new Error(
      "Interactive mode cannot be combined with output format options (--json, --ids-only, --uuid, --bibtex)"
    );
  }
}

/**
 * Execute interactive search command.
 * Uses runSearchPrompt and runActionMenu from the interactive module.
 *
 * @param options - Search command options with interactive flag
 * @param context - Execution context
 * @param config - Application configuration
 * @returns Interactive search result containing output and cancelled flag
 */
export async function executeInteractiveSearch(
  options: SearchCommandOptions,
  context: ExecutionContext,
  config: Config
): Promise<InteractiveSearchResult> {
  validateInteractiveOptions(options);

  // Import interactive modules dynamically to avoid loading Enquirer in non-interactive mode
  const { checkTTY } = await import("../../features/interactive/tty.js");
  const { runSearchPrompt } = await import("../../features/interactive/search-prompt.js");
  const { runActionMenu } = await import("../../features/interactive/action-menu.js");
  const { search } = await import("../../features/search/matcher.js");
  const { tokenize } = await import("../../features/search/tokenizer.js");

  // Check TTY requirement
  checkTTY();

  // Get all references for interactive search
  const allReferences = await context.library.getAll();

  // Create search function for runSearchPrompt
  const searchFn = (query: string) => {
    const { tokens } = tokenize(query);
    return search(allReferences, tokens);
  };

  // Get interactive config from config
  const interactiveConfig = config.cli.interactive;

  // Run search prompt
  const searchResult = await runSearchPrompt(
    allReferences,
    searchFn,
    {
      limit: interactiveConfig.limit,
      debounceMs: interactiveConfig.debounceMs,
    },
    options.query || ""
  );

  if (searchResult.cancelled || searchResult.selected.length === 0) {
    return { output: "", cancelled: true };
  }

  // Run action menu with selected references
  const actionResult = await runActionMenu(searchResult.selected);

  return {
    output: actionResult.output,
    cancelled: actionResult.cancelled,
  };
}
