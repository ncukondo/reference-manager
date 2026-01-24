/**
 * Fulltext detach operation
 *
 * Uses attachments system internally with role='fulltext'.
 */

import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";
import { detachAttachment } from "../attachments/detach.js";
import {
  type FulltextFormat,
  extensionToFormat,
  findFulltextFile,
  findFulltextFiles,
} from "../fulltext-adapter/index.js";

/**
 * Fulltext type (matches existing FulltextType for backward compatibility)
 */
export type FulltextType = FulltextFormat;

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
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for attachments (replaces fulltextDirectory) */
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
 * Determine which files to detach based on type option
 */
function getFilesToDetach(
  attachments: Attachments | undefined,
  type: FulltextType | undefined
): AttachmentFile[] {
  if (type) {
    const file = findFulltextFile(attachments, type);
    return file ? [file] : [];
  }
  return findFulltextFiles(attachments);
}

/**
 * Perform detach operations for each file
 */
async function detachFiles(
  library: ILibrary,
  files: AttachmentFile[],
  identifier: string,
  deleteFile: boolean | undefined,
  idType: IdentifierType,
  fulltextDirectory: string
): Promise<{ detached: FulltextType[]; deleted: FulltextType[] }> {
  const detached: FulltextType[] = [];
  const deleted: FulltextType[] = [];

  for (const file of files) {
    const result = await detachAttachment(library, {
      identifier,
      filename: file.filename,
      delete: deleteFile ?? false,
      idType,
      attachmentsDirectory: fulltextDirectory,
    });

    if (result.success) {
      const ext = file.filename.split(".").pop() || "";
      const format = extensionToFormat(ext);
      if (format) {
        detached.push(format);
        if (result.deleted.length > 0) {
          deleted.push(format);
        }
      }
    }
  }

  return { detached, deleted };
}

/**
 * Build result from detach operations
 */
function buildResult(
  detached: FulltextType[],
  deleted: FulltextType[],
  identifier: string
): FulltextDetachResult {
  if (detached.length === 0) {
    return { success: false, error: `Failed to detach fulltext from '${identifier}'` };
  }

  const result: FulltextDetachResult = { success: true, detached };
  if (deleted.length > 0) {
    result.deleted = deleted;
  }
  return result;
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
  const { identifier, type, delete: deleteFile, idType = "id", fulltextDirectory } = options;

  // Find reference first to check for fulltext files
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Get attachments metadata
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;

  // Find fulltext files
  const fulltextFiles = findFulltextFiles(attachments);
  if (fulltextFiles.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  // Determine which files to detach
  const filesToDetach = getFilesToDetach(attachments, type);

  if (filesToDetach.length === 0) {
    return { success: false, error: `No ${type} fulltext attached to '${identifier}'` };
  }

  // Perform detach operations
  const { detached, deleted } = await detachFiles(
    library,
    filesToDetach,
    identifier,
    deleteFile,
    idType,
    fulltextDirectory
  );

  return buildResult(detached, deleted, identifier);
}
