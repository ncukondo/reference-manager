/**
 * Export Command
 *
 * Exports raw CSL-JSON for external tool integration (pandoc, jq, etc.).
 */

import { stringify as yamlStringify } from "yaml";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibtex } from "../../features/format/bibtex.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the export command
 */
export interface ExportCommandOptions {
  /** Citation keys or UUIDs to export */
  ids?: string[];
  /** Interpret identifiers as UUIDs */
  uuid?: boolean;
  /** Export all references */
  all?: boolean;
  /** Export references matching search query */
  search?: string;
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
  // Validate mutually exclusive options
  const hasIds = (options.ids?.length ?? 0) > 0;
  const modeCount = [options.all, !!options.search, hasIds].filter(Boolean).length;

  if (modeCount > 1) {
    throw new Error("Cannot use --all, --search, and IDs together. Choose one selection mode.");
  }

  if (modeCount === 0) {
    throw new Error("No references specified. Provide IDs, use --all, or use --search <query>.");
  }

  // --all mode: export all references
  if (options.all) {
    const items = await context.library.getAll();
    return { items, notFound: [] };
  }

  // --search mode: export matching references
  if (options.search) {
    const result = await context.library.search({ query: options.search, limit: 0 });
    return { items: result.items, notFound: [] };
  }

  // ID mode: export specific references
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

  // Determine if this is a single ID request (output object vs array)
  const singleIdRequest = (options.ids?.length ?? 0) === 1 && !options.all && !options.search;
  const data = result.items.length === 1 && singleIdRequest ? result.items[0] : result.items;

  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }

  if (format === "yaml") {
    return yamlStringify(data);
  }

  if (format === "bibtex") {
    return formatBibtex(result.items);
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Get exit code for export command
 */
export function getExportExitCode(result: ExportCommandResult): number {
  return result.notFound.length > 0 ? 1 : 0;
}
