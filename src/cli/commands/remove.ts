import type { Library } from "../../core/library.js";
import { type RemoveResult, removeReference } from "../../features/operations/remove.js";
import type { ServerClient } from "../server-client.js";

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
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - Remove command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns Remove result
 */
export async function executeRemove(
  options: RemoveCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<RemoveCommandResult> {
  const { identifier, byUuid = false } = options;

  if (serverClient) {
    // Server mode requires UUID
    if (byUuid) {
      return serverClient.remove(identifier);
    }
    // Find UUID by ID first using server API
    const items = await serverClient.getAll();
    const found = items.find((item) => item.id === identifier);
    if (!found?.custom?.uuid) {
      return { removed: false };
    }
    return serverClient.remove(found.custom.uuid);
  }

  // Direct library operation
  return removeReference(library, { identifier, byUuid });
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
