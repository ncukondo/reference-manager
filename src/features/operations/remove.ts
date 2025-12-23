import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";

/**
 * Options for removeReference operation
 */
export interface RemoveOperationOptions {
  /** Reference ID or UUID */
  identifier: string;
  /** If true, identifier is treated as UUID; otherwise as ID (default: false) */
  byUuid?: boolean;
}

/**
 * Result of removeReference operation
 */
export interface RemoveResult {
  /** Whether the reference was removed */
  removed: boolean;
  /** The removed item (if found) */
  item?: CslItem;
}

/**
 * Remove a reference from the library.
 *
 * @param library - The library to remove from
 * @param options - Remove options including identifier and lookup method
 * @returns Result indicating success and the removed item
 */
export async function removeReference(
  library: ILibrary,
  options: RemoveOperationOptions
): Promise<RemoveResult> {
  const { identifier, byUuid = false } = options;

  // Find the reference first (returns CslItem directly)
  const item = byUuid ? await library.findByUuid(identifier) : await library.findById(identifier);

  if (!item) {
    return { removed: false };
  }

  // Remove from library
  const removed = byUuid ? await library.removeByUuid(identifier) : await library.removeById(identifier);

  if (removed) {
    await library.save();
  }

  return { removed, item };
}
