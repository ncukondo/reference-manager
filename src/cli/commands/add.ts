import type { Library } from "../../core/library.js";
import type { InputFormat } from "../../features/import/detector.js";
import type { PubmedConfig } from "../../features/import/fetcher.js";
import {
  type AddReferencesOptions,
  type AddReferencesResult,
  type AddedItem,
  type FailedItem,
  type SkippedItem,
  addReferences,
} from "../../features/operations/add.js";
import type { ServerClient } from "../server-client.js";

/**
 * Options for the add command.
 */
export interface AddCommandOptions {
  /** Input strings (file paths, PMIDs, DOIs) */
  inputs: string[];
  /** Skip duplicate detection */
  force: boolean;
  /** Explicit input format */
  format?: string;
  /** PubMed API configuration */
  pubmedConfig?: PubmedConfig;
  /** Show verbose error output */
  verbose?: boolean;
}

/**
 * Result from add command execution.
 */
export type AddCommandResult = AddReferencesResult;

// Re-export types for convenience
export type { AddedItem, FailedItem, SkippedItem };

/** Maximum error message length in non-verbose mode */
const MAX_ERROR_LENGTH = 80;

/**
 * Execute add command.
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - Add command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns Add result containing added, failed, and skipped items
 */
export async function executeAdd(
  options: AddCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<AddCommandResult> {
  const { inputs, force, format, pubmedConfig } = options;

  if (serverClient) {
    // Route through server - build options without undefined values
    const serverOptions: { force: boolean; format?: string } = { force };
    if (format !== undefined) {
      serverOptions.format = format;
    }
    return serverClient.addFromInputs(inputs, serverOptions);
  }

  // Direct library operation - build options without undefined values
  const addOptions: AddReferencesOptions = { force };
  if (format !== undefined) {
    addOptions.format = format as InputFormat | "auto";
  }
  if (pubmedConfig !== undefined) {
    addOptions.pubmedConfig = pubmedConfig;
  }

  return addReferences(inputs, library, addOptions);
}

/**
 * Format a single added item for output.
 */
function formatAddedItem(item: AddedItem): string {
  const idPart = item.idChanged ? `${item.id} (was: ${item.originalId})` : item.id;
  const title = item.title ?? "(no title)";
  return `  - ${idPart}: "${title}"`;
}

/**
 * Format a single failed item for output.
 */
function formatFailedItem(item: FailedItem, verbose: boolean): string {
  let error = item.error;
  if (!verbose && error.length > MAX_ERROR_LENGTH) {
    error = `${error.substring(0, MAX_ERROR_LENGTH - 3)}...`;
  }
  // In verbose mode, preserve multi-line errors; in non-verbose mode, take first line
  if (!verbose && error.includes("\n")) {
    error = error.split("\n")[0] ?? error;
  }
  return `  - ${item.source}: ${error}`;
}

/**
 * Format a single skipped item for output.
 */
function formatSkippedItem(item: SkippedItem): string {
  return `  - ${item.source}: matches existing '${item.existingId}'`;
}

/**
 * Format add result for CLI output.
 *
 * @param result - Add result
 * @param verbose - Show verbose error output
 * @returns Formatted output string
 */
export function formatAddOutput(result: AddCommandResult, verbose: boolean): string {
  const lines: string[] = [];

  // Added section
  if (result.added.length > 0) {
    lines.push(`Added ${result.added.length} reference(s):`);
    for (const item of result.added) {
      lines.push(formatAddedItem(item));
    }
  } else if (result.failed.length === 0 && result.skipped.length === 0) {
    lines.push("Added 0 reference(s).");
  }

  // Failed section
  if (result.failed.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`Failed to add ${result.failed.length} item(s):`);
    for (const item of result.failed) {
      lines.push(formatFailedItem(item, verbose));
    }
  }

  // Skipped section
  if (result.skipped.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(`Skipped ${result.skipped.length} duplicate(s):`);
    for (const item of result.skipped) {
      lines.push(formatSkippedItem(item));
    }
  }

  return lines.join("\n");
}

/**
 * Determine exit code based on result.
 *
 * @param result - Add result
 * @returns Exit code (0 for success/partial success, 1 for complete failure)
 */
export function getExitCode(result: AddCommandResult): number {
  // Success if anything was added
  if (result.added.length > 0) {
    return 0;
  }

  // Complete failure if nothing added and there were failures
  if (result.failed.length > 0) {
    return 1;
  }

  // All skipped or empty input is considered success
  return 0;
}
