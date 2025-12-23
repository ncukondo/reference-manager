/**
 * Fulltext detach operation
 */

import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import {
  FulltextIOError,
  FulltextManager,
  FulltextNotAttachedError,
  type FulltextType,
} from "../../fulltext/index.js";
import { updateReference } from "../update.js";

/**
 * Options for fulltextDetach operation
 */
export interface FulltextDetachOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Specific type to detach (pdf or markdown) */
  type?: FulltextType | undefined;
  /** Delete the file from disk */
  delete?: boolean | undefined;
  /** Use uuid instead of id for lookup */
  byUuid?: boolean | undefined;
  /** Directory for fulltext files */
  fulltextDirectory: string;
}

/**
 * Result of fulltextDetach operation
 */
export interface FulltextDetachResult {
  success: boolean;
  detached?: FulltextType[];
  deleted?: FulltextType[];
  error?: string;
}

/**
 * Perform detach operations for specified types
 */
async function performDetachOperations(
  manager: FulltextManager,
  item: CslItem,
  typesToDetach: FulltextType[],
  deleteFile: boolean | undefined
): Promise<{ detached: FulltextType[]; deleted: FulltextType[] }> {
  const detached: FulltextType[] = [];
  const deleted: FulltextType[] = [];

  for (const t of typesToDetach) {
    const detachOptions = deleteFile ? { delete: deleteFile } : {};
    const result = await manager.detachFile(item, t, detachOptions);
    detached.push(t);
    if (result.deleted) {
      deleted.push(t);
    }
  }

  return { detached, deleted };
}

/**
 * Build remaining fulltext metadata after detach
 */
function buildRemainingFulltext(
  currentFulltext: { pdf?: string | undefined; markdown?: string | undefined },
  detached: FulltextType[]
): { pdf?: string; markdown?: string } | undefined {
  const newFulltext: { pdf?: string; markdown?: string } = {};
  if (currentFulltext.pdf && !detached.includes("pdf")) {
    newFulltext.pdf = currentFulltext.pdf;
  }
  if (currentFulltext.markdown && !detached.includes("markdown")) {
    newFulltext.markdown = currentFulltext.markdown;
  }
  return Object.keys(newFulltext).length > 0 ? newFulltext : undefined;
}

/**
 * Handle detach errors
 */
function handleDetachError(error: unknown): FulltextDetachResult {
  if (error instanceof FulltextNotAttachedError || error instanceof FulltextIOError) {
    return { success: false, error: error.message };
  }
  throw error;
}

/**
 * Detach fulltext file(s) from a reference.
 *
 * @param library - The library containing the reference
 * @param options - Detach options
 * @returns Result of the detach operation
 */
export async function fulltextDetach(
  library: ILibrary,
  options: FulltextDetachOptions
): Promise<FulltextDetachResult> {
  const { identifier, type, delete: deleteFile, byUuid = false, fulltextDirectory } = options;

  // Find reference (returns CslItem directly)
  const item = byUuid ? library.findByUuid(identifier) : library.findById(identifier);

  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const manager = new FulltextManager(fulltextDirectory);
  const typesToDetach: FulltextType[] = type ? [type] : manager.getAttachedTypes(item);

  if (typesToDetach.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  try {
    const { detached, deleted } = await performDetachOperations(
      manager,
      item,
      typesToDetach,
      deleteFile
    );

    const updatedFulltext = buildRemainingFulltext(item.custom?.fulltext ?? {}, detached);
    await updateReference(library, {
      identifier,
      updates: {
        custom: { fulltext: updatedFulltext },
      } as Partial<CslItem>,
      byUuid,
    });

    const resultData: FulltextDetachResult = { success: true, detached };
    if (deleted.length > 0) {
      resultData.deleted = deleted;
    }
    return resultData;
  } catch (error) {
    return handleDetachError(error);
  }
}
