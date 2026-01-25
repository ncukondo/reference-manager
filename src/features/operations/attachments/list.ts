/**
 * Attachment list operation
 */

import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";

/**
 * Options for listAttachments operation
 */
export interface ListAttachmentsOptions {
  /** Reference identifier */
  identifier: string;
  /** Identifier type */
  idType?: IdentifierType;
  /** Filter by role */
  role?: string;
  /** Base directory for attachments */
  attachmentsDirectory: string;
}

/**
 * Result of listAttachments operation
 */
export interface ListAttachmentsResult {
  success: boolean;
  directory?: string;
  files: AttachmentFile[];
  error?: string;
}

/**
 * List attachments for a reference
 */
export async function listAttachments(
  library: ILibrary,
  options: ListAttachmentsOptions
): Promise<ListAttachmentsResult> {
  const { identifier, idType = "id", role } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, files: [], error: `Reference '${identifier}' not found` };
  }

  // Get attachments
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;
  if (!attachments || attachments.files.length === 0) {
    return { success: false, files: [], error: `No attachments for reference '${identifier}'` };
  }

  // Filter by role if specified
  let files = attachments.files;
  if (role) {
    files = files.filter((f) => f.role === role);
    if (files.length === 0) {
      return {
        success: false,
        files: [],
        error: `No ${role} attachments for reference '${identifier}'`,
      };
    }
  }

  return {
    success: true,
    directory: attachments.directory,
    files,
  };
}
