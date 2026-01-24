/**
 * Attachment open operation
 *
 * Opens attachments directory or specific file with system application.
 */

import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { openWithSystemApp } from "../../../utils/opener.js";
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
  const uuid = ref.custom?.uuid;

  // Check UUID exists
  if (!uuid) {
    return {
      success: false,
      error: "Reference has no UUID. Cannot determine attachment directory.",
    };
  }

  // Get or create directory
  const attachments = ref.custom?.attachments;
  let dirPath: string;
  let directoryCreated = false;

  if (attachments?.directory) {
    dirPath = join(attachmentsDirectory, attachments.directory);
  } else {
    // Need to create directory
    dirPath = await ensureDirectory(ref, attachmentsDirectory);
    directoryCreated = true;
  }

  // Ensure directory exists
  if (!(await pathExists(dirPath))) {
    dirPath = await ensureDirectory(ref, attachmentsDirectory);
    directoryCreated = true;
  }

  // Determine what to open
  let targetPath: string;

  if (filename) {
    // Open specific file
    targetPath = join(dirPath, filename);
    if (!(await pathExists(targetPath))) {
      return { success: false, error: `Attachment file not found: ${filename}` };
    }
  } else if (role) {
    // Open file by role
    const foundFilename = findFileByRole(attachments, role);
    if (!foundFilename) {
      return { success: false, error: `No ${role} attachment found` };
    }
    targetPath = join(dirPath, foundFilename);
    if (!(await pathExists(targetPath))) {
      return { success: false, error: `Attachment file not found: ${foundFilename}` };
    }
  } else {
    // Open directory
    targetPath = dirPath;
  }

  // Open or return path
  if (!print) {
    await openWithSystemApp(targetPath);
  }

  return {
    success: true,
    path: targetPath,
    directoryCreated,
  };
}
