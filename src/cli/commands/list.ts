import { type ItemFormat, formatItems } from "../../features/format/index.js";
import type { ListResult } from "../../features/operations/list.js";
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
  output?: "pretty" | "json" | "bibtex" | "ids" | "uuid";
  json?: boolean;
  idsOnly?: boolean;
  uuidOnly?: boolean;
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
 * Convert CLI options to ItemFormat.
 * Priority: --output > convenience flags (--json, --ids-only, --uuid-only, --bibtex)
 */
function getOutputFormat(options: ListCommandOptions): ItemFormat {
  // --output takes precedence
  if (options.output) {
    if (options.output === "ids") return "ids-only";
    return options.output;
  }
  // Convenience flags as fallback
  if (options.json) return "json";
  if (options.idsOnly) return "ids-only";
  if (options.uuidOnly) return "uuid";
  if (options.bibtex) return "bibtex";
  return "pretty";
}

/**
 * Validate list command options.
 * @throws Error if options are invalid
 */
function validateOptions(options: ListCommandOptions): void {
  // Validate output format
  const outputOptions = [options.json, options.idsOnly, options.uuidOnly, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid-only, --bibtex can be used."
    );
  }

  // Warn if --output is combined with convenience flags
  if (options.output && outputOptions.length > 0) {
    throw new Error("Cannot combine --output with convenience flags (--json, --ids-only, etc.)");
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
 * @returns List result containing raw CslItem[]
 */
export async function executeList(
  options: ListCommandOptions,
  context: ExecutionContext
): Promise<ListCommandResult> {
  validateOptions(options);

  // Resolve sort alias (e.g., "pub" -> "published")
  const sort = options.sort ? (resolveSortAlias(options.sort) as SortField) : undefined;

  return context.library.list({
    ...(sort !== undefined && { sort }),
    ...pickDefined(options, ["order", "limit", "offset"] as const),
  });
}

/**
 * Format list result for CLI output.
 *
 * @param result - List result (CslItem[])
 * @param options - Command options to determine format
 * @returns Formatted output string
 */
export function formatListOutput(result: ListCommandResult, options: ListCommandOptions): string {
  const format = getOutputFormat(options);

  if (format === "json") {
    // JSON output includes pagination metadata
    return JSON.stringify({
      items: result.items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      nextOffset: result.nextOffset,
    });
  }

  // Format items for non-JSON formats
  const formattedItems = formatItems(result.items, format) as string[];

  if (formattedItems.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Add header line when limit is applied and not showing all
  if (result.limit > 0 && result.total > 0) {
    const start = result.offset + 1;
    const end = result.offset + formattedItems.length;
    lines.push(`# Showing ${start}-${end} of ${result.total} references`);
  }

  lines.push(...formattedItems);
  return lines.join("\n");
}
