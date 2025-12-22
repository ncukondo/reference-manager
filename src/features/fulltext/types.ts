/**
 * Fulltext management types
 */

/**
 * Supported fulltext file types
 */
export type FulltextType = "pdf" | "markdown";

/**
 * File extensions for each fulltext type
 */
export const FULLTEXT_EXTENSIONS: Record<FulltextType, string> = {
  pdf: ".pdf",
  markdown: ".md",
};
