import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import type { FulltextType } from "../../features/fulltext/index.js";
import type { RemoveResult } from "../../features/operations/remove.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the remove command.
 */
export interface RemoveCommandOptions {
  identifier: string;
  idType?: IdentifierType;
}

/**
 * Result from remove command execution.
 */
export type RemoveCommandResult = RemoveResult;

/**
 * Execute remove command.
 * Uses context.library.remove() which works for both local and server modes.
 *
 * @param options - Remove command options
 * @param context - Execution context
 * @returns Remove result
 */
export async function executeRemove(
  options: RemoveCommandOptions,
  context: ExecutionContext
): Promise<RemoveCommandResult> {
  const { identifier, idType = "id" } = options;

  return context.library.remove(identifier, { idType });
}

/**
 * Format remove result for CLI output.
 *
 * @param result - Remove result
 * @param identifier - The identifier that was used
 * @returns Formatted output string
 */
export function formatRemoveOutput(result: RemoveCommandResult, identifier: string): string {
  if (!result.removed) {
    return `Reference not found: ${identifier}`;
  }

  const item = result.removedItem;
  if (item) {
    return `Removed: [${item.id}] ${item.title || "(no title)"}`;
  }

  return `Removed reference: ${identifier}`;
}

/**
 * Get fulltext attachment types from a CSL item.
 *
 * @param item - CSL item to check
 * @returns Array of attached fulltext types
 */
export function getFulltextAttachmentTypes(item: CslItem): FulltextType[] {
  const types: FulltextType[] = [];
  const fulltext = item.custom?.fulltext;

  if (fulltext?.pdf) {
    types.push("pdf");
  }
  if (fulltext?.markdown) {
    types.push("markdown");
  }

  return types;
}

/**
 * Format fulltext warning message for remove confirmation.
 *
 * @param types - Attached fulltext types
 * @returns Warning message string
 */
export function formatFulltextWarning(types: FulltextType[]): string {
  const typeLabels = types.map((t) => (t === "pdf" ? "PDF" : "Markdown"));
  const fileTypes = typeLabels.join(" and ");
  return `Warning: This reference has fulltext files attached (${fileTypes}). Use --force to also delete the fulltext files.`;
}

/**
 * Delete fulltext files associated with a CSL item.
 *
 * @param item - CSL item with fulltext attachments
 * @param fulltextDirectory - Directory containing fulltext files
 */
export async function deleteFulltextFiles(item: CslItem, fulltextDirectory: string): Promise<void> {
  const fulltext = item.custom?.fulltext;
  if (!fulltext) {
    return;
  }

  const filesToDelete: string[] = [];

  if (fulltext.pdf) {
    filesToDelete.push(join(fulltextDirectory, fulltext.pdf));
  }
  if (fulltext.markdown) {
    filesToDelete.push(join(fulltextDirectory, fulltext.markdown));
  }

  for (const filePath of filesToDelete) {
    try {
      await unlink(filePath);
    } catch {
      // Ignore errors (file might not exist)
    }
  }
}
