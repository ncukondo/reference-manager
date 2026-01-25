/**
 * Fulltext-to-attachments adapter utilities
 *
 * Maps fulltext command options and data to the new attachments system.
 * This adapter enables the fulltext command to use attachments backend
 * while maintaining backward-compatible interface.
 */

import type { AttachmentFile, Attachments } from "../../attachments/types.js";
import { getExtension } from "../../attachments/types.js";

/**
 * The role used for fulltext files in the attachments system
 */
export const FULLTEXT_ROLE = "fulltext" as const;

/**
 * Fulltext format type (matching existing FulltextType)
 */
export type FulltextFormat = "pdf" | "markdown";

/**
 * Convert fulltext format to file extension
 */
export function formatToExtension(format: FulltextFormat): string {
  return format === "markdown" ? "md" : format;
}

/**
 * Convert file extension to fulltext format
 * Returns undefined if extension is not a valid fulltext format
 */
export function extensionToFormat(ext: string): FulltextFormat | undefined {
  const normalized = ext.toLowerCase();
  if (normalized === "pdf") return "pdf";
  if (normalized === "md" || normalized === "markdown") return "markdown";
  return undefined;
}

/**
 * Get the standard filename for a fulltext file
 * Following the naming convention: fulltext.{ext}
 */
export function getFulltextFilename(format: FulltextFormat): string {
  const ext = formatToExtension(format);
  return `fulltext.${ext}`;
}

/**
 * Find a fulltext file of specific format in attachments
 */
export function findFulltextFile(
  attachments: Attachments | undefined,
  format: FulltextFormat
): AttachmentFile | undefined {
  if (!attachments?.files) {
    return undefined;
  }

  const targetExt = formatToExtension(format);

  return attachments.files.find((file) => {
    if (file.role !== FULLTEXT_ROLE) {
      return false;
    }
    const fileExt = getExtension(file.filename);
    return fileExt === targetExt;
  });
}

/**
 * Find all fulltext files in attachments
 */
export function findFulltextFiles(attachments: Attachments | undefined): AttachmentFile[] {
  if (!attachments?.files) {
    return [];
  }

  return attachments.files.filter((file) => file.role === FULLTEXT_ROLE);
}
