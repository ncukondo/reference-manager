/**
 * Normalize text for identifier generation
 * Converts to lowercase, removes non-ASCII characters, keeps only alphanumeric
 * @param text - Text to normalize
 * @returns Normalized text (ASCII alphanumeric only)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Normalize author name for identifier
 * @param name - Author name to normalize
 * @returns Normalized name (max 32 chars)
 */
export function normalizeAuthorName(name: string): string {
  const normalized = normalizeText(name);
  return normalized.slice(0, 32);
}

/**
 * Create a title slug for identifier
 * @param title - Title to create slug from
 * @returns Title slug (max 32 chars)
 */
export function normalizeTitleSlug(title: string): string {
  const normalized = normalizeText(title);
  return normalized.slice(0, 32);
}