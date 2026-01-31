/**
 * URL Command
 *
 * Resolves and displays reference URLs with type filters and browser opening support.
 */

import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { Library } from "../../core/library.js";
import {
  type UrlType,
  resolveAllUrls,
  resolveDefaultUrl,
  resolveUrlByType,
} from "../../features/operations/url.js";
import { openWithSystemApp } from "../../utils/opener.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  exitWithError,
  isTTY,
  loadConfigWithOverrides,
  readIdentifierFromStdin,
  setExitCode,
} from "../helpers.js";

/**
 * Options for the url command.
 */
export interface UrlCommandOptions {
  default?: boolean;
  doi?: boolean;
  pubmed?: boolean;
  pmcid?: boolean;
  open?: boolean;
  uuid?: boolean;
}

/**
 * Result for a single identifier URL resolution.
 */
export interface UrlResult {
  id: string;
  urls: string[];
  error?: string;
}

/**
 * Result of URL command execution.
 */
export interface UrlCommandResult {
  results: UrlResult[];
  openError?: string;
}

/**
 * Determine which URL type filter is active.
 */
function getUrlTypeFilter(options: UrlCommandOptions): UrlType | "default" | null {
  if (options.doi) return "doi";
  if (options.pubmed) return "pubmed";
  if (options.pmcid) return "pmcid";
  if (options.default) return "default";
  // --open implies --default if no other filter
  if (options.open) return "default";
  return null;
}

/**
 * Get the display label for a URL type filter.
 */
function getFilterLabel(filter: UrlType | "default"): string {
  switch (filter) {
    case "doi":
      return "DOI";
    case "pubmed":
      return "PubMed";
    case "pmcid":
      return "PMC";
    case "url":
      return "URL";
    case "default":
      return "default";
  }
}

/**
 * Resolve URLs for a single item based on options.
 */
function resolveUrlsForItem(
  item: CslItem,
  id: string,
  filter: UrlType | "default" | null
): UrlResult {
  if (filter === null) {
    // No filter: return all URLs
    const urls = resolveAllUrls(item);
    if (urls.length === 0) {
      return { id, urls: [], error: `No URLs available for ${id}` };
    }
    return { id, urls };
  }

  if (filter === "default") {
    const url = resolveDefaultUrl(item);
    if (!url) {
      return { id, urls: [], error: `No URLs available for ${id}` };
    }
    return { id, urls: [url] };
  }

  // Specific type filter
  const url = resolveUrlByType(item, filter);
  if (!url) {
    return { id, urls: [], error: `No ${getFilterLabel(filter)} URL for ${id}` };
  }
  return { id, urls: [url] };
}

/**
 * Execute URL command: resolve URLs for given identifiers.
 */
export async function executeUrlCommand(
  identifiers: string[],
  options: UrlCommandOptions,
  context: ExecutionContext
): Promise<UrlCommandResult> {
  const filter = getUrlTypeFilter(options);
  const findOptions = options.uuid ? { idType: "uuid" as const } : undefined;
  const results: UrlResult[] = [];

  for (const identifier of identifiers) {
    const item = await context.library.find(identifier, findOptions);
    if (!item) {
      results.push({ id: identifier, urls: [], error: `Reference not found: ${identifier}` });
      continue;
    }

    const result = resolveUrlsForItem(item, identifier, filter);
    results.push(result);
  }

  // Handle --open: open the first successful URL
  if (options.open) {
    const firstSuccess = results.find((r) => r.urls.length > 0);
    if (firstSuccess?.urls[0]) {
      try {
        await openWithSystemApp(firstSuccess.urls[0]);
      } catch (error) {
        return {
          results,
          openError: `Failed to open URL: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }
  }

  return { results };
}

/**
 * Check if any filter option is active.
 */
function hasFilter(options: UrlCommandOptions): boolean {
  return Boolean(options.default || options.doi || options.pubmed || options.pmcid || options.open);
}

/**
 * Format URL command output based on result and options.
 *
 * Rules:
 * - Single ID, no filter: URLs only (1 per line)
 * - Multiple IDs, no filter: TSV (id\turl)
 * - With filter (--default, --doi, etc.): plain URLs, 1 per line
 */
export function formatUrlOutput(result: UrlCommandResult, options: UrlCommandOptions): string {
  const successResults = result.results.filter((r) => r.urls.length > 0);

  if (successResults.length === 0) {
    return "";
  }

  const filtered = hasFilter(options);

  // With filter or single ID: plain URLs
  if (filtered || successResults.length === 1) {
    const lines: string[] = [];
    for (const r of successResults) {
      for (const url of r.urls) {
        lines.push(url);
      }
    }
    return lines.join("\n");
  }

  // Multiple IDs, no filter: TSV
  const lines: string[] = [];
  for (const r of successResults) {
    for (const url of r.urls) {
      lines.push(`${r.id}\t${url}`);
    }
  }
  return lines.join("\n");
}

/**
 * Format URL command errors for stderr.
 */
export function formatUrlErrors(result: UrlCommandResult): string {
  const errorMessages = result.results.filter((r) => r.error).map((r) => `Error: ${r.error}`);
  if (result.openError) {
    errorMessages.push(`Error: ${result.openError}`);
  }
  return errorMessages.join("\n");
}

/**
 * Get exit code for URL command result.
 */
export function getUrlExitCode(result: UrlCommandResult): number {
  if (result.openError) return ExitCode.ERROR;
  const hasSuccess = result.results.some((r) => r.urls.length > 0);
  const hasError = result.results.some((r) => r.error);

  if (hasSuccess) return ExitCode.SUCCESS;
  if (hasError) return ExitCode.ERROR;
  return ExitCode.SUCCESS;
}

/**
 * Execute interactive selection for URL command (single-select).
 */
async function executeInteractiveSelect(
  context: ExecutionContext,
  config: Config
): Promise<string> {
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();

  const identifiers = await withAlternateScreen(() =>
    selectReferencesOrExit(allReferences, { multiSelect: false }, config.cli.tui)
  );

  // selectReferencesOrExit guarantees at least one result
  return identifiers[0] ?? "";
}

/**
 * Handle 'url' command action.
 */
export async function handleUrlAction(
  identifiers: string[] | undefined,
  options: UrlCommandOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let resolvedIdentifiers: string[];

    if (identifiers && identifiers.length > 0) {
      resolvedIdentifiers = identifiers;
    } else if (isTTY()) {
      // TTY mode: interactive selection
      const selected = await executeInteractiveSelect(context, config);
      resolvedIdentifiers = [selected];
    } else {
      // Non-TTY mode: read from stdin
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        exitWithError("Identifier is required");
        return;
      }
      resolvedIdentifiers = [stdinId];
    }

    const result = await executeUrlCommand(resolvedIdentifiers, options, context);

    // Output URLs to stdout
    const output = formatUrlOutput(result, options);
    if (output) {
      process.stdout.write(`${output}\n`);
    }

    // Output errors to stderr
    const errors = formatUrlErrors(result);
    if (errors) {
      process.stderr.write(`${errors}\n`);
    }

    setExitCode(getUrlExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
