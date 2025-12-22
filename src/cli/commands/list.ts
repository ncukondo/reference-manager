import {
  type ListFormat,
  type ListResult,
  listReferences,
} from "../../features/operations/list.js";
import type { ExecutionContext } from "../execution-context.js";

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
 * Routes to server API or direct library operation based on execution context.
 *
 * @param options - List command options
 * @param context - Execution context (server or local)
 * @returns List result containing formatted items
 */
export async function executeList(
  options: ListCommandOptions,
  context: ExecutionContext
): Promise<ListCommandResult> {
  validateOptions(options);
  const format = getListFormat(options);

  if (context.type === "server") {
    // Use server's list API with format option
    return context.client.list({ format });
  }

  // Direct library operation
  return listReferences(context.library, { format });
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
