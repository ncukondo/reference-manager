import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { formatBibtex, formatJson, formatPretty } from "../../features/format/index.js";
import {
  type ListFormat,
  type ListResult,
  listReferences,
} from "../../features/operations/list.js";
import type { ServerClient } from "../server-client.js";

/**
 * Options for the list command.
 */
export interface ListCommandOptions {
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
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
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - List command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns List result containing formatted items
 */
export async function executeList(
  options: ListCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<ListCommandResult> {
  validateOptions(options);
  const format = getListFormat(options);

  if (serverClient) {
    // Use server's list API with format option
    return serverClient.list({ format });
  }

  // Direct library operation
  return listReferences(library, { format });
}

/**
 * Format list result for CLI output.
 *
 * @param result - List result
 * @returns Formatted output string
 */
export function formatListOutput(result: ListCommandResult): string {
  if (result.items.length === 0) {
    return "";
  }
  return result.items.join("\n");
}

// Keep the old function for backwards compatibility during transition
/**
 * @deprecated Use executeList and formatListOutput instead
 */
export async function list(items: CslItem[], options: ListCommandOptions): Promise<void> {
  validateOptions(options);

  if (options.json) {
    process.stdout.write(formatJson(items));
  } else if (options.idsOnly) {
    for (const item of items) {
      process.stdout.write(`${item.id}\n`);
    }
  } else if (options.uuid) {
    for (const item of items) {
      if (item.custom) {
        process.stdout.write(`${item.custom.uuid}\n`);
      }
    }
  } else if (options.bibtex) {
    process.stdout.write(formatBibtex(items));
  } else {
    process.stdout.write(formatPretty(items));
  }
}
