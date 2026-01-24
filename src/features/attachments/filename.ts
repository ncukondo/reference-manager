import path from "node:path";

/**
 * Filename utilities for attachments
 *
 * File format: {role}[-{label-slug}].{ext}
 * Examples:
 *   - fulltext.pdf
 *   - supplement-table-s1.xlsx
 *   - notes-reading-analysis.md
 */

interface ParsedFilename {
  role: string;
  ext: string;
  label?: string;
}

/**
 * Convert a human-readable label to a filesystem-safe slug
 */
export function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Generate filename from role, extension, and optional label
 */
export function generateFilename(role: string, ext: string, label?: string): string {
  if (label) {
    const slug = slugifyLabel(label);
    return `${role}-${slug}.${ext}`;
  }
  return `${role}.${ext}`;
}

/**
 * Parse filename to extract role, extension, and label
 *
 * Returns null for empty filenames
 */
export function parseFilename(filename: string): ParsedFilename | null {
  if (!filename) {
    return null;
  }

  const ext = path.extname(filename);
  const extWithoutDot = ext.startsWith(".") ? ext.slice(1) : ext;
  const basename = ext ? filename.slice(0, -ext.length) : filename;

  // Split basename by first hyphen to get role and potential label
  const firstHyphenIndex = basename.indexOf("-");

  if (firstHyphenIndex === -1) {
    // No hyphen: just role, no label
    return {
      role: basename,
      ext: extWithoutDot,
    };
  }

  const role = basename.slice(0, firstHyphenIndex);
  const label = basename.slice(firstHyphenIndex + 1);

  if (label) {
    return {
      role,
      ext: extWithoutDot,
      label,
    };
  }

  return {
    role,
    ext: extWithoutDot,
  };
}
