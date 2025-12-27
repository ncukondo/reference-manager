import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";

/**
 * Options for updateReference operation
 */
export interface UpdateOperationOptions {
  /** Reference ID or UUID */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType;
  /** Partial updates to apply to the reference */
  updates: Partial<CslItem>;
  /** How to handle ID collision: 'fail' (default) or 'suffix' */
  onIdCollision?: "fail" | "suffix";
}

/**
 * Result of updateReference operation
 */
export interface UpdateOperationResult {
  /** Whether the update was successful */
  updated: boolean;
  /** The updated item (if successful) */
  item?: CslItem;
  /** True if ID collision occurred (only when updated=false and onIdCollision='fail') */
  idCollision?: boolean;
  /** True if the ID was changed due to collision resolution */
  idChanged?: boolean;
  /** The new ID after collision resolution (only when idChanged=true) */
  newId?: string;
}

/**
 * Update a reference in the library.
 *
 * @param library - The library to update
 * @param options - Update options including identifier, updates, and collision handling
 * @returns Result indicating success and the updated item
 */
export async function updateReference(
  library: ILibrary,
  options: UpdateOperationOptions
): Promise<UpdateOperationResult> {
  const { identifier, idType = "id", updates, onIdCollision = "fail" } = options;

  // Update the reference using unified update() method
  const updateResult = await library.update(identifier, updates, { idType, onIdCollision });

  if (!updateResult.updated) {
    const result: UpdateOperationResult = { updated: false };
    if (updateResult.idCollision) {
      result.idCollision = true;
    }
    return result;
  }

  // Save the library
  await library.save();

  // Build result from UpdateResult (item is now included)
  const result: UpdateOperationResult = { updated: true };

  if (updateResult.item) {
    result.item = updateResult.item;
  }

  if (updateResult.idChanged && updateResult.newId) {
    result.idChanged = true;
    result.newId = updateResult.newId;
  }

  return result;
}
