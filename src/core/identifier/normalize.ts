/**
 * Normalize text for identifier generation
 * Converts to lowercase, converts spaces to underscores, keeps only alphanumeric and underscores
 * @param text - Text to normalize
 * @returns Normalized text (ASCII alphanumeric and underscores only)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "_")              // Convert spaces to underscores
    .replace(/[^a-z0-9_]/g, "")        // Keep only alphanumeric and underscores
    .replace(/_+/g, "_")                // Collapse multiple underscores
    .replace(/^_|_$/g, "");             // Remove leading/trailing underscores
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