import type { CitationKeyFormat, Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { type ItemFormat, formatItems } from "../../features/format/index.js";
import type { ActionType } from "../../features/interactive/action-menu.js";
import type { SearchResult } from "../../features/operations/search.js";
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
  output?: "pretty" | "json" | "bibtex" | "ids" | "uuid" | "pandoc-key" | "latex-key";
  json?: boolean;
  idsOnly?: boolean;
  uuidOnly?: boolean;
  bibtex?: boolean;
  key?: boolean;
  pandocKey?: boolean;
  latexKey?: boolean;
  sort?: SearchSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
  tui?: boolean;
}

/**
 * Result from search command execution.
 */
export type SearchCommandResult = SearchResult;

/**
 * Convert CLI options to ItemFormat.
 * Priority: --output > convenience flags (--json, --ids-only, --uuid-only, --bibtex)
 */
function getOutputFormat(
  options: SearchCommandOptions,
  defaultKeyFormat?: CitationKeyFormat
): ItemFormat {
  // --output takes precedence
  if (options.output) {
    if (options.output === "ids") return "ids-only";
    return options.output;
  }
  // Convenience flags as fallback
  if (options.key) return defaultKeyFormat === "latex" ? "latex-key" : "pandoc-key";
  if (options.pandocKey) return "pandoc-key";
  if (options.latexKey) return "latex-key";
  if (options.json) return "json";
  if (options.idsOnly) return "ids-only";
  if (options.uuidOnly) return "uuid";
  if (options.bibtex) return "bibtex";
  return "pretty";
}

/**
 * Validate search command options.
 * @throws Error if options are invalid
 */
function validateOptions(options: SearchCommandOptions): void {
  // Validate output format
  const outputOptions = [
    options.json,
    options.idsOnly,
    options.uuidOnly,
    options.bibtex,
    options.key,
    options.pandocKey,
    options.latexKey,
  ].filter(Boolean);

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid-only, --bibtex, --key, --pandoc-key, --latex-key can be used."
    );
  }

  // Warn if --output is combined with convenience flags
  if (options.output && outputOptions.length > 0) {
    throw new Error("Cannot combine --output with convenience flags (--json, --ids-only, etc.)");
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
 * @returns Search result containing raw CslItem[]
 */
export async function executeSearch(
  options: SearchCommandOptions,
  context: ExecutionContext
): Promise<SearchCommandResult> {
  validateOptions(options);

  // Resolve sort alias (e.g., "pub" -> "published", "rel" -> "relevance")
  const sort = options.sort ? resolveSortAlias(options.sort) : undefined;

  return context.library.search({
    query: options.query,
    ...(sort !== undefined && { sort }),
    ...pickDefined(options, ["order", "limit", "offset"] as const),
  });
}

/**
 * Format search result for CLI output.
 *
 * @param result - Search result (CslItem[])
 * @param options - Command options to determine format
 * @returns Formatted output string
 */
export function formatSearchOutput(
  result: SearchCommandResult,
  options: SearchCommandOptions,
  defaultKeyFormat?: CitationKeyFormat
): string {
  const format = getOutputFormat(options, defaultKeyFormat);

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

/**
 * Result from interactive search command execution.
 */
export interface InteractiveSearchResult {
  output: string;
  cancelled: boolean;
  /** Action type (for side-effect action handling) */
  action?: ActionType;
  /** Selected items (for side-effect actions) */
  selectedItems?: CslItem[];
}

/**
 * Validate interactive mode options.
 * @throws Error if interactive mode is combined with incompatible options
 */
function validateInteractiveOptions(options: SearchCommandOptions): void {
  const outputOptions = [
    options.output,
    options.json,
    options.idsOnly,
    options.uuidOnly,
    options.bibtex,
    options.key,
    options.pandocKey,
    options.latexKey,
  ].filter(Boolean);

  if (outputOptions.length > 0) {
    throw new Error(
      "TUI mode cannot be combined with output format options (--output, --json, --ids-only, --uuid-only, --bibtex, --key, --pandoc-key, --latex-key)"
    );
  }
}

/**
 * Execute interactive search command.
 * Uses runSearchFlow from the interactive module (Single App Pattern - ADR-015).
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

  // Import interactive modules dynamically to avoid loading React/Ink in non-interactive mode
  const { checkTTY } = await import("../../features/interactive/tty.js");
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { runSearchFlow } = await import("../../features/interactive/apps/index.js");
  const { search } = await import("../../features/search/matcher.js");
  const { tokenize } = await import("../../features/search/tokenizer.js");

  // Check TTY requirement
  checkTTY();

  // Get all references for interactive search
  const allReferences = await context.library.getAll();

  // Create search function for runSearchFlow
  const searchFn = (query: string) => {
    const { tokens } = tokenize(query);
    return search(allReferences, tokens);
  };

  // Get TUI config from config
  const tuiConfig = config.cli.tui;

  // Run the search flow in alternate screen to preserve terminal scrollback
  const result = await withAlternateScreen(() =>
    runSearchFlow(allReferences, searchFn, {
      limit: tuiConfig.limit,
      debounceMs: tuiConfig.debounceMs,
      defaultKeyFormat: config.citation.defaultKeyFormat,
      defaultStyle: config.citation.defaultStyle,
    })
  );

  // Handle side-effect actions
  if (result.selectedItems && !result.cancelled) {
    const { isSideEffectAction } = await import("../../features/interactive/action-menu.js");
    if (isSideEffectAction(result.action)) {
      await executeSideEffectAction(result.action, result.selectedItems, context, config);
      return { output: "", cancelled: false, action: result.action };
    }
  }

  return {
    output: result.output,
    cancelled: result.cancelled,
    action: result.action,
  };
}

/**
 * Execute a side-effect action from the TUI action menu.
 * These actions perform operations rather than producing stdout output.
 * @internal Exported for testing only.
 */
export async function executeSideEffectAction(
  action: ActionType,
  items: CslItem[],
  context: ExecutionContext,
  config: Config
): Promise<void> {
  switch (action) {
    case "open-url": {
      const { resolveDefaultUrl } = await import("../../features/operations/url.js");
      const { openWithSystemApp } = await import("../../utils/opener.js");
      const item = items[0];
      if (!item) return;
      const url = resolveDefaultUrl(item);
      if (url) {
        await openWithSystemApp(url);
      } else {
        process.stderr.write(`No URL available for ${item.id}\n`);
      }
      break;
    }
    case "open-fulltext": {
      const { executeFulltextOpen } = await import("./fulltext.js");
      const item = items[0];
      if (!item) return;
      const result = await executeFulltextOpen(
        {
          identifier: item.id,
          fulltextDirectory: config.attachments.directory,
        },
        context
      );
      if (!result.success) {
        process.stderr.write(`${result.error}\n`);
      }
      break;
    }
    case "manage-attachments": {
      const { executeAttachOpen } = await import("./attach.js");
      const item = items[0];
      if (!item) return;
      await executeAttachOpen(
        {
          identifier: item.id,
          attachmentsDirectory: config.attachments.directory,
        },
        context
      );
      break;
    }
    case "edit": {
      const { executeEditCommand } = await import("./edit.js");
      await executeEditCommand(
        {
          identifiers: items.map((i) => i.id),
          format: config.cli.edit.defaultFormat,
        },
        context
      );
      break;
    }
    case "remove": {
      const {
        executeRemove,
        confirmRemoveIfNeeded,
        getFulltextAttachmentTypes,
        formatRemoveOutput,
      } = await import("./remove.js");
      for (const item of items) {
        const hasFulltext = getFulltextAttachmentTypes(item).length > 0;
        const confirmed = await confirmRemoveIfNeeded(item, hasFulltext, false);
        if (!confirmed) {
          process.stderr.write("Cancelled.\n");
          continue;
        }
        const result = await executeRemove(
          {
            identifier: item.id,
            fulltextDirectory: config.attachments.directory,
            deleteFulltext: hasFulltext,
          },
          context
        );
        process.stderr.write(`${formatRemoveOutput(result, item.id)}\n`);
      }
      break;
    }
    default:
      break;
  }
}
