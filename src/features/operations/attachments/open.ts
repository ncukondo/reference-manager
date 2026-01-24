/**
 * Attachment open operation
 *
 * Opens attachments directory or specific file with system application.
 */

import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { openWithSystemApp } from "../../../utils/opener.js";
import { normalizePathForOutput } from "../../../utils/path.js";
import { ensureDirectory } from "../../attachments/directory-manager.js";
import type { Attachments } from "../../attachments/types.js";

/**
 * Options for openAttachment operation
 */
export interface OpenAttachmentOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Specific filename to open */
  filename?: string;
  /** Role to open (opens first matching file) */
  role?: string;
  /** Print path instead of opening */
  print?: boolean;
  /** Identifier type */
  idType?: IdentifierType;
  /** Base directory for attachments */
  attachmentsDirectory: string;
}

/**
 * Result of openAttachment operation
 */
export interface OpenAttachmentResult {
  success: boolean;
  /** Path that was opened or would be opened */
  path?: string;
  /** Whether the directory was created */
  directoryCreated?: boolean;
  error?: string;
}

/**
 * Reference with attachment-related fields
 */
interface ReferenceForAttachments {
  id: string;
  PMID?: string;
  custom?: {
    uuid?: string;
    attachments?: Attachments;
  };
}

/**
 * Directory resolution result
 */
interface DirectoryResult {
  dirPath: string;
  directoryCreated: boolean;
}

/**
 * Check if a path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find file by role in attachments
 */
function findFileByRole(attachments: Attachments | undefined, role: string): string | null {
  if (!attachments?.files) {
    return null;
  }
  const file = attachments.files.find((f) => f.role === role);
  return file?.filename ?? null;
}

/**
 * Get or create attachment directory
 */
async function resolveDirectory(
  ref: ReferenceForAttachments,
  attachmentsDirectory: string
): Promise<DirectoryResult> {
  const attachments = ref.custom?.attachments;
  let dirPath: string;
  let directoryCreated = false;

  if (attachments?.directory) {
    dirPath = join(attachmentsDirectory, attachments.directory);
  } else {
    dirPath = await ensureDirectory(ref, attachmentsDirectory);
    directoryCreated = true;
  }

  // Ensure directory exists on disk
  if (!(await pathExists(dirPath))) {
    dirPath = await ensureDirectory(ref, attachmentsDirectory);
    directoryCreated = true;
  }

  return { dirPath, directoryCreated };
}

/**
 * Update metadata with new directory information
 */
async function updateDirectoryMetadata(
  library: ILibrary,
  ref: ReferenceForAttachments,
  dirPath: string
): Promise<void> {
  const dirName = basename(dirPath);
  const item = ref as CslItem;
  await library.update(ref.id, {
    custom: {
      ...item.custom,
      attachments: {
        directory: dirName,
        files: [],
      },
    },
  } as Partial<CslItem>);
  await library.save();
}

/**
 * Resolve target path for file or role
 * Returns native path for file operations
 */
async function resolveTargetPath(
  dirPath: string,
  filename: string | undefined,
  role: string | undefined,
  attachments: Attachments | undefined
): Promise<{ path: string } | { error: string }> {
  if (filename) {
    const targetPath = join(dirPath, filename);
    if (!(await pathExists(targetPath))) {
      return { error: `Attachment file not found: ${filename}` };
    }
    return { path: targetPath };
  }

  if (role) {
    const foundFilename = findFileByRole(attachments, role);
    if (!foundFilename) {
      return { error: `No ${role} attachment found` };
    }
    const targetPath = join(dirPath, foundFilename);
    if (!(await pathExists(targetPath))) {
      return { error: `Attachment file not found: ${foundFilename}` };
    }
    return { path: targetPath };
  }

  return { path: dirPath };
}

/**
 * Open attachment directory or file
 */
export async function openAttachment(
  library: ILibrary,
  options: OpenAttachmentOptions
): Promise<OpenAttachmentResult> {
  const {
    identifier,
    filename,
    role,
    print = false,
    idType = "id",
    attachmentsDirectory,
  } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const ref = item as ReferenceForAttachments;

  // Check UUID exists
  if (!ref.custom?.uuid) {
    return {
      success: false,
      error: "Reference has no UUID. Cannot determine attachment directory.",
    };
  }

  // Resolve directory
  const attachments = ref.custom?.attachments;
  const { dirPath, directoryCreated } = await resolveDirectory(ref, attachmentsDirectory);

  // Update metadata if directory was created and no attachments metadata exists yet
  if (directoryCreated && !attachments?.directory) {
    await updateDirectoryMetadata(library, ref, dirPath);
  }

  // Resolve target path
  const targetResult = await resolveTargetPath(dirPath, filename, role, attachments);
  if ("error" in targetResult) {
    return { success: false, error: targetResult.error };
  }

  // Open or return path
  if (!print) {
    await openWithSystemApp(targetResult.path);
  }

  return {
    success: true,
    // Normalize for output (forward slashes for cross-platform consistency)
    path: normalizePathForOutput(targetResult.path),
    directoryCreated,
  };
}
