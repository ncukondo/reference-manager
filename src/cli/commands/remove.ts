import { type RemoveResult, removeReference } from "../../features/operations/remove.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the remove command.
 */
export interface RemoveCommandOptions {
  identifier: string;
  byUuid?: boolean;
}

/**
 * Result from remove command execution.
 */
export type RemoveCommandResult = RemoveResult;

/**
 * Execute remove command.
 * Routes to server API or direct library operation based on execution context.
 *
 * @param options - Remove command options
 * @param context - Execution context (server or local)
 * @returns Remove result
 */
export async function executeRemove(
  options: RemoveCommandOptions,
  context: ExecutionContext
): Promise<RemoveCommandResult> {
  const { identifier, byUuid = false } = options;

  if (context.type === "server") {
    // Server mode: use client with byUuid option for direct ID or UUID lookup
    return context.client.remove(identifier, { byUuid });
  }

  // Local mode: direct library operation
  return removeReference(context.library, { identifier, byUuid });
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

  const item = result.item;
  if (item) {
    return `Removed: [${item.id}] ${item.title || "(no title)"}`;
  }

  return `Removed reference: ${identifier}`;
}
