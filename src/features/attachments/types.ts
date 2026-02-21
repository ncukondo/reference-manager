import path from "node:path";
import type { z } from "zod";
import type { AttachmentFileSchema, AttachmentsSchema } from "../../core/csl-json/types.js";

/**
 * Attachment file metadata stored in reference's custom field.
 * Derived from AttachmentFileSchema (Zod) to ensure single source of truth.
 */
export type AttachmentFile = z.infer<typeof AttachmentFileSchema>;

/**
 * Attachments container stored in reference's custom.attachments field.
 * Derived from AttachmentsSchema (Zod) to ensure single source of truth.
 */
export type Attachments = z.infer<typeof AttachmentsSchema>;

/**
 * Reserved role identifiers with special constraints
 */
export const RESERVED_ROLES = ["fulltext", "supplement", "notes", "draft"] as const;

export type ReservedRole = (typeof RESERVED_ROLES)[number];

/**
 * Check if a role is a reserved role
 */
export function isReservedRole(role: string): role is ReservedRole {
  return RESERVED_ROLES.includes(role as ReservedRole);
}

/**
 * Get file extension from filename (without leading dot)
 */
export function getExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext.startsWith(".") ? ext.slice(1).toLowerCase() : ext.toLowerCase();
}

/**
 * Check if fulltext files satisfy the constraint: max 2 files (1 PDF + 1 Markdown)
 */
export function isValidFulltextFiles(files: AttachmentFile[]): boolean {
  const fulltextFiles = files.filter((f) => f.role === "fulltext");

  if (fulltextFiles.length > 2) {
    return false;
  }

  if (fulltextFiles.length <= 1) {
    return true;
  }

  // Exactly 2 files: must be 1 PDF and 1 Markdown
  const extensions = fulltextFiles.map((f) => getExtension(f.filename));
  const pdfCount = extensions.filter((ext) => ext === "pdf").length;
  const mdCount = extensions.filter((ext) => ext === "md").length;

  return pdfCount === 1 && mdCount === 1;
}
