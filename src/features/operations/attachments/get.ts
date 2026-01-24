/**
 * Attachment get operation
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";

/**
 * Options for getAttachment operation
 */
export interface GetAttachmentOptions {
  /** Reference identifier */
  identifier: string;
  /** Filename to get */
  filename?: string;
  /** Get by role instead of filename */
  role?: string;
  /** Identifier type */
  idType?: IdentifierType;
  /** Output content to stdout */
  stdout?: boolean;
  /** Base directory for attachments */
  attachmentsDirectory: string;
}

/**
 * Result of getAttachment operation
 */
export interface GetAttachmentResult {
  success: boolean;
  path?: string;
  content?: Buffer;
  error?: string;
}

/**
 * Find attachment by filename or role
 */
function findAttachment(
  files: AttachmentFile[],
  filename?: string,
  role?: string
): AttachmentFile | undefined {
  if (filename) {
    return files.find((f) => f.filename === filename);
  }
  if (role) {
    return files.find((f) => f.role === role);
  }
  return undefined;
}

/**
 * Get an attachment file path or content
 */
export async function getAttachment(
  library: ILibrary,
  options: GetAttachmentOptions
): Promise<GetAttachmentResult> {
  const {
    identifier,
    filename,
    role,
    idType = "id",
    stdout = false,
    attachmentsDirectory,
  } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Get attachments
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;
  if (!attachments || attachments.files.length === 0) {
    return { success: false, error: `No attachments for reference '${identifier}'` };
  }

  // Find the attachment
  const attachment = findAttachment(attachments.files, filename, role);
  if (!attachment) {
    if (filename) {
      return { success: false, error: `Attachment '${filename}' not found` };
    }
    if (role) {
      return { success: false, error: `No ${role} attachment found` };
    }
    return { success: false, error: "No filename or role specified" };
  }

  // Build path (native for file operations)
  const filePath = join(attachmentsDirectory, attachments.directory, attachment.filename);
  // Normalize for output (forward slashes for cross-platform consistency)
  const normalizedPath = filePath.replace(/\\/g, "/");

  // If stdout, read and return content
  if (stdout) {
    try {
      const content = await readFile(filePath);
      return { success: true, path: normalizedPath, content };
    } catch {
      return {
        success: false,
        error: `File not found on disk: ${normalizedPath}`,
      };
    }
  }

  return { success: true, path: normalizedPath };
}
