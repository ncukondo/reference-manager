import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";

/**
 * Options for addReference operation.
 */
export interface AddReferenceOptions {
  /** The CSL item to add. */
  item: CslItem;
}

/**
 * Result of addReference operation.
 */
export interface AddReferenceResult {
  /** Whether the reference was added. */
  added: true;
  /** The item returned by the library (with generated ID/UUID as needed). */
  item: CslItem;
}

/**
 * Add a reference to the library and persist the change to disk.
 *
 * Mirrors the shape of updateReference/removeReference by bundling the
 * library mutation together with the save(), so callers (e.g. server
 * routes) cannot accidentally skip persistence.
 */
export async function addReference(
  library: ILibrary,
  options: AddReferenceOptions
): Promise<AddReferenceResult> {
  const added = await library.add(options.item);
  await library.save();
  return { added: true, item: added };
}
