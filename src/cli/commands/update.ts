import type { CslItem } from "../../core/csl-json/types.js";
import type { UpdateOperationResult } from "../../features/operations/update.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  identifier: string;
  updates: Partial<CslItem>;
  byUuid?: boolean;
}

/**
 * Result from update command execution.
 */
export type UpdateCommandResult = UpdateOperationResult;

/**
 * Execute update command.
 * Uses context.library.update() which works for both local and server modes.
 *
 * @param options - Update command options
 * @param context - Execution context
 * @returns Update result
 */
export async function executeUpdate(
  options: UpdateCommandOptions,
  context: ExecutionContext
): Promise<UpdateCommandResult> {
  const { identifier, updates, byUuid = false } = options;

  return context.library.update(identifier, updates, { byUuid });
}

/**
 * Format update result for CLI output.
 *
 * @param result - Update result
 * @param identifier - The identifier that was used
 * @returns Formatted output string
 */
export function formatUpdateOutput(result: UpdateCommandResult, identifier: string): string {
  if (!result.updated) {
    if (result.idCollision) {
      return `Update failed: ID collision for ${identifier}`;
    }
    return `Reference not found: ${identifier}`;
  }

  const item = result.item;
  const parts: string[] = [];

  if (item) {
    parts.push(`Updated: [${item.id}] ${item.title || "(no title)"}`);
  } else {
    parts.push(`Updated reference: ${identifier}`);
  }

  if (result.idChanged && result.newId) {
    parts.push(`ID changed to: ${result.newId}`);
  }

  return parts.join("\n");
}
