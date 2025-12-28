import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";

/**
 * Options for removeReference operation
 */
export interface RemoveOperationOptions {
  /** Reference ID or UUID */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType;
}

/**
 * Result of removeReference operation
 */
export interface RemoveResult {
  /** Whether the reference was removed */
  removed: boolean;
  /** The removed item (if found and removal succeeded) */
  removedItem?: CslItem;
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
  const { identifier, idType = "id" } = options;

  const result = await library.remove(identifier, { idType });

  if (result.removed) {
    await library.save();
  }

  return result;
}
