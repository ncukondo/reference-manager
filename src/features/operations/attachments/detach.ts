/**
 * Attachment detach operation
 */

import { stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { deleteDirectoryIfEmpty } from "../../attachments/directory-manager.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";

/**
 * Options for detachAttachment operation
 */
export interface DetachAttachmentOptions {
  /** Reference identifier */
  identifier: string;
  /** Filename to detach */
  filename?: string;
  /** Detach by role instead of filename */
  role?: string;
  /** Detach all files of the role */
  all?: boolean;
  /** Delete file from disk */
  delete?: boolean;
  /** Identifier type */
  idType?: IdentifierType;
  /** Base directory for attachments */
  attachmentsDirectory: string;
}

/**
 * Result of detachAttachment operation
 */
export interface DetachAttachmentResult {
  success: boolean;
  detached: string[];
  deleted: string[];
  directoryDeleted?: boolean;
  error?: string;
}

/**
 * Find files to detach
 */
function findFilesToDetach(
  files: AttachmentFile[],
  filename?: string,
  role?: string,
  all?: boolean
): AttachmentFile[] {
  if (filename) {
    const file = files.find((f) => f.filename === filename);
    return file ? [file] : [];
  }

  if (role && all) {
    return files.filter((f) => f.role === role);
  }

  return [];
}

/**
 * Delete files from disk
 */
async function deleteFiles(dirPath: string, filenames: string[]): Promise<string[]> {
  const deleted: string[] = [];

  for (const filename of filenames) {
    try {
      await unlink(join(dirPath, filename));
      deleted.push(filename);
    } catch {
      // Ignore errors (file might not exist on disk)
    }
  }

  return deleted;
}

/**
 * Update library metadata after detaching
 */
async function updateMetadata(
  library: ILibrary,
  item: CslItem,
  attachments: Attachments,
  remainingFiles: AttachmentFile[]
): Promise<void> {
  const updatedAttachments: Attachments | undefined =
    remainingFiles.length > 0
      ? { directory: attachments.directory, files: remainingFiles }
      : undefined;

  await library.update(item.id, {
    custom: {
      ...item.custom,
      attachments: updatedAttachments,
    },
  } as Partial<CslItem>);
}

/**
 * Try to delete directory if empty
 */
async function tryDeleteEmptyDirectory(dirPath: string): Promise<boolean> {
  try {
    await deleteDirectoryIfEmpty(dirPath);
    // Check if directory was actually deleted
    try {
      await stat(dirPath);
      return false;
    } catch {
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Build error result
 */
function errorResult(error: string): DetachAttachmentResult {
  return { success: false, detached: [], deleted: [], error };
}

/**
 * Detach an attachment from a reference
 */
export async function detachAttachment(
  library: ILibrary,
  options: DetachAttachmentOptions
): Promise<DetachAttachmentResult> {
  const {
    identifier,
    filename,
    role,
    all = false,
    delete: deleteFile = false,
    idType = "id",
    attachmentsDirectory,
  } = options;

  // Validate options
  if (!filename && !role) {
    return errorResult("Either filename or role must be specified");
  }

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return errorResult(`Reference '${identifier}' not found`);
  }

  // Get attachments
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;
  if (!attachments || attachments.files.length === 0) {
    return errorResult(`No attachments for reference '${identifier}'`);
  }

  // Find files to detach
  const filesToDetach = findFilesToDetach(attachments.files, filename, role, all);

  if (filesToDetach.length === 0) {
    if (filename) {
      return errorResult(`Attachment '${filename}' not found`);
    }
    return errorResult(`No ${role} attachments found`);
  }

  const detachedFilenames = filesToDetach.map((f) => f.filename);
  const dirPath = join(attachmentsDirectory, attachments.directory);

  // Delete files from disk if requested
  const deletedFiles = deleteFile ? await deleteFiles(dirPath, detachedFilenames) : [];

  // Update metadata
  const remainingFiles = attachments.files.filter((f) => !detachedFilenames.includes(f.filename));
  await updateMetadata(library, item as CslItem, attachments, remainingFiles);

  // Try to delete directory if empty and files were deleted
  const directoryDeleted =
    deleteFile && remainingFiles.length === 0 ? await tryDeleteEmptyDirectory(dirPath) : false;

  return {
    success: true,
    detached: detachedFilenames,
    deleted: deletedFiles,
    directoryDeleted,
  };
}
