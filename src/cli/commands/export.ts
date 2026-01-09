/**
 * Export Command
 *
 * Exports raw CSL-JSON for external tool integration (pandoc, jq, etc.).
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the export command
 */
export interface ExportCommandOptions {
  /** Citation keys or UUIDs to export */
  ids?: string[];
  /** Interpret identifiers as UUIDs */
  uuid?: boolean;
  /** Output format */
  format?: "json" | "yaml" | "bibtex";
}

/**
 * Result of the export command
 */
export interface ExportCommandResult {
  /** Exported items */
  items: CslItem[];
  /** IDs that were not found */
  notFound: string[];
}

/**
 * Execute the export command
 */
export async function executeExport(
  options: ExportCommandOptions,
  context: ExecutionContext
): Promise<ExportCommandResult> {
  const items: CslItem[] = [];
  const notFound: string[] = [];

  const ids = options.ids ?? [];
  const idType = options.uuid ? "uuid" : "id";

  for (const id of ids) {
    const item = await context.library.find(id, { idType });
    if (item) {
      items.push(item);
    } else {
      notFound.push(id);
    }
  }

  return { items, notFound };
}

/**
 * Format the export output
 */
export function formatExportOutput(
  result: ExportCommandResult,
  options: ExportCommandOptions
): string {
  const format = options.format ?? "json";

  if (format === "json") {
    // Single item: output as object, not array
    if (result.items.length === 1 && (options.ids?.length ?? 0) === 1) {
      return JSON.stringify(result.items[0], null, 2);
    }
    // Multiple items or --all/--search: output as array
    return JSON.stringify(result.items, null, 2);
  }

  // TODO: yaml and bibtex formats
  return JSON.stringify(result.items, null, 2);
}

/**
 * Get exit code for export command
 */
export function getExportExitCode(result: ExportCommandResult): number {
  return result.notFound.length > 0 ? 1 : 0;
}
