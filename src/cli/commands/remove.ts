import type { IdentifierType } from "../../core/library-interface.js";
import type { FulltextType } from "../../features/fulltext/index.js";
import { type RemoveResult, getFulltextAttachmentTypes } from "../../features/operations/remove.js";
import type { ExecutionContext } from "../execution-context.js";

// Re-export for convenience
export { getFulltextAttachmentTypes };
export type { RemoveResult };

/**
 * Options for the remove command.
 */
export interface RemoveCommandOptions {
  identifier: string;
  idType?: IdentifierType;
  /** Directory containing fulltext files */
  fulltextDirectory?: string;
  /** Whether to delete associated fulltext files */
  deleteFulltext?: boolean;
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
  const { identifier, idType = "id", fulltextDirectory, deleteFulltext = false } = options;

  // For local library, use removeReference which handles fulltext deletion
  // For server mode, just call remove (fulltext deletion not supported yet)
  if (context.mode === "local" && deleteFulltext && fulltextDirectory) {
    // Import dynamically to avoid circular dependency
    const { removeReference } = await import("../../features/operations/remove.js");
    return removeReference(context.library, {
      identifier,
      idType,
      fulltextDirectory,
      deleteFulltext,
    });
  }

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
  let output = "";

  if (item) {
    output = `Removed: [${item.id}] ${item.title || "(no title)"}`;
  } else {
    output = `Removed reference: ${identifier}`;
  }

  // Append fulltext deletion info if applicable
  if (result.deletedFulltextTypes && result.deletedFulltextTypes.length > 0) {
    const typeLabels = result.deletedFulltextTypes.map((t) => (t === "pdf" ? "PDF" : "Markdown"));
    output += `\nDeleted fulltext files: ${typeLabels.join(" and ")}`;
  }

  return output;
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
