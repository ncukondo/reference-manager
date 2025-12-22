import type { CslItem } from "../../core/csl-json/types.js";
import { type UpdateOperationResult, updateReference } from "../../features/operations/update.js";
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
 * Routes to server API or direct library operation based on execution context.
 *
 * @param options - Update command options
 * @param context - Execution context (server or local)
 * @returns Update result
 */
export async function executeUpdate(
  options: UpdateCommandOptions,
  context: ExecutionContext
): Promise<UpdateCommandResult> {
  const { identifier, updates, byUuid = false } = options;

  if (context.type === "server") {
    // Server mode: use client with byUuid option for direct ID or UUID lookup
    return context.client.update(identifier, updates, { byUuid });
  }

  // Local mode: direct library operation
  return updateReference(context.library, { identifier, updates, byUuid });
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
