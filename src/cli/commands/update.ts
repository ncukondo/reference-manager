import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type UpdateOperationResult, updateReference } from "../../features/operations/update.js";
import type { ServerClient } from "../server-client.js";

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
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - Update command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns Update result
 */
export async function executeUpdate(
  options: UpdateCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<UpdateCommandResult> {
  const { identifier, updates, byUuid = false } = options;

  if (serverClient) {
    // Server mode requires UUID
    if (byUuid) {
      return serverClient.update(identifier, updates);
    }
    // Find UUID by ID first using server API
    const items = await serverClient.getAll();
    const found = items.find((item) => item.id === identifier);
    if (!found?.custom?.uuid) {
      return { updated: false };
    }
    return serverClient.update(found.custom.uuid, updates);
  }

  // Direct library operation
  return updateReference(library, { identifier, updates, byUuid });
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
