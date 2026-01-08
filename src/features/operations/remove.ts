import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";
import type { FulltextType } from "../fulltext/index.js";

/**
 * Options for removeReference operation
 */
export interface RemoveOperationOptions {
  /** Reference ID or UUID */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType;
  /** Directory containing fulltext files (required if deleteFulltext is true) */
  fulltextDirectory?: string;
  /** Whether to delete associated fulltext files */
  deleteFulltext?: boolean;
}

/**
 * Result of removeReference operation
 */
export interface RemoveResult {
  /** Whether the reference was removed */
  removed: boolean;
  /** The removed item (if found and removal succeeded) */
  removedItem?: CslItem;
  /** Fulltext types that were deleted (only when deleteFulltext=true) */
  deletedFulltextTypes?: FulltextType[];
}

/**
 * Get fulltext attachment types from a CSL item.
 */
export function getFulltextAttachmentTypes(item: CslItem): FulltextType[] {
  const types: FulltextType[] = [];
  const fulltext = item.custom?.fulltext;

  if (fulltext?.pdf) {
    types.push("pdf");
  }
  if (fulltext?.markdown) {
    types.push("markdown");
  }

  return types;
}

/**
 * Delete fulltext files associated with an item.
 */
async function deleteFulltextFiles(item: CslItem, fulltextDirectory: string): Promise<void> {
  const fulltext = item.custom?.fulltext;
  if (!fulltext) {
    return;
  }

  const filesToDelete: string[] = [];

  if (fulltext.pdf) {
    filesToDelete.push(join(fulltextDirectory, fulltext.pdf));
  }
  if (fulltext.markdown) {
    filesToDelete.push(join(fulltextDirectory, fulltext.markdown));
  }

  for (const filePath of filesToDelete) {
    try {
      await unlink(filePath);
    } catch {
      // Ignore errors (file might not exist)
    }
  }
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
  const { identifier, idType = "id", fulltextDirectory, deleteFulltext = false } = options;

  const result = await library.remove(identifier, { idType });

  if (!result.removed || !result.removedItem) {
    return { removed: false };
  }

  // Delete fulltext files if requested
  let deletedFulltextTypes: FulltextType[] | undefined;
  if (deleteFulltext && fulltextDirectory) {
    deletedFulltextTypes = getFulltextAttachmentTypes(result.removedItem);
    if (deletedFulltextTypes.length > 0) {
      await deleteFulltextFiles(result.removedItem, fulltextDirectory);
    }
  }

  await library.save();

  return {
    removed: true,
    removedItem: result.removedItem,
    ...(deletedFulltextTypes && deletedFulltextTypes.length > 0 && { deletedFulltextTypes }),
  };
}
