import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";

/**
 * Options for updateReference operation
 */
export interface UpdateOperationOptions {
  /** Reference ID or UUID */
  identifier: string;
  /** If true, identifier is treated as UUID; otherwise as ID (default: false) */
  byUuid?: boolean;
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
  library: Library,
  options: UpdateOperationOptions
): Promise<UpdateOperationResult> {
  const { identifier, byUuid = false, updates, onIdCollision = "fail" } = options;

  // Update the reference
  const updateResult = byUuid
    ? library.updateByUuid(identifier, updates, { onIdCollision })
    : library.updateById(identifier, updates, { onIdCollision });

  if (!updateResult.updated) {
    const result: UpdateOperationResult = { updated: false };
    if (updateResult.idCollision) {
      result.idCollision = true;
    }
    return result;
  }

  // Save the library
  await library.save();

  // Get the updated reference to return its item
  const reference = byUuid
    ? library.findByUuid(identifier)
    : library.findById(updateResult.newId ?? identifier);

  const result: UpdateOperationResult = { updated: true };

  const item = reference?.getItem();
  if (item) {
    result.item = item;
  }

  if (updateResult.idChanged && updateResult.newId) {
    result.idChanged = true;
    result.newId = updateResult.newId;
  }

  return result;
}
