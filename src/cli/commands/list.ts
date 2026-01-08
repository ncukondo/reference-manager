import type { ListFormat, ListResult } from "../../features/operations/list.js";
import {
  type SortField,
  type SortOrder,
  paginationOptionsSchema,
  resolveSortAlias,
  sortOrderSchema,
} from "../../features/pagination/index.js";
import { pickDefined } from "../../utils/object.js";
import type { ExecutionContext } from "../execution-context.js";

// Valid sort fields for list command (excludes "relevance")
const VALID_LIST_SORT_FIELDS = new Set([
  "created",
  "updated",
  "published",
  "author",
  "title",
  "add",
  "mod",
  "pub",
]);

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
 * Validate list command options.
 * @throws Error if options are invalid
 */
function validateOptions(options: ListCommandOptions): void {
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
    if (!VALID_LIST_SORT_FIELDS.has(sortStr)) {
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

  // Resolve sort alias (e.g., "pub" -> "published")
  const sort = options.sort ? (resolveSortAlias(options.sort) as SortField) : undefined;

  return context.library.list({
    format,
    ...(sort !== undefined && { sort }),
    ...pickDefined(options, ["order", "limit", "offset"] as const),
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
