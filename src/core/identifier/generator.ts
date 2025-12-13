import type { CslItem } from "../csl-json/types";
import { normalizeAuthorName, normalizeTitleSlug } from "./normalize";

/**
 * Extract author name from CSL-JSON item
 * Returns family name, literal name, or empty string
 */
function extractAuthorName(item: CslItem): string {
  if (!item.author || item.author.length === 0) {
    return "";
  }

  const firstAuthor = item.author[0];
  if (!firstAuthor) {
    return "";
  }

  // Try family name first
  if (firstAuthor.family) {
    return normalizeAuthorName(firstAuthor.family);
  }

  // Try literal name (e.g., institutional authors)
  if (firstAuthor.literal) {
    return normalizeAuthorName(firstAuthor.literal);
  }

  return "";
}

/**
 * Extract year from CSL-JSON item
 * Returns year string or empty string
 */
function extractYear(item: CslItem): string {
  if (!item.issued || !item.issued["date-parts"] || item.issued["date-parts"].length === 0) {
    return "";
  }

  const dateParts = item.issued["date-parts"][0];
  if (!dateParts || dateParts.length === 0) {
    return "";
  }

  const year = dateParts[0];
  return year ? year.toString() : "";
}

/**
 * Determine the title part of the ID based on author, year, and title availability
 * @param hasAuthor - Whether author is available
 * @param hasYear - Whether year is available
 * @param title - Title slug
 * @returns Title part of the ID
 */
function determineTitlePart(hasAuthor: boolean, hasYear: boolean, title: string): string {
  // No title part needed if both author and year are present
  if (hasAuthor && hasYear) {
    return "";
  }

  // Add title if available
  if (title) {
    return `-${title}`;
  }

  // Add "untitled" only if both author and year are missing
  if (!hasAuthor && !hasYear) {
    return "-untitled";
  }

  return "";
}

/**
 * Generate a BibTeX-style ID for a CSL-JSON item
 * Format: <FirstAuthorFamily>-<Year>[<TitleSlug>][a-z suffix]
 * @param item - CSL-JSON item
 * @returns Generated ID
 */
export function generateId(item: CslItem): string {
  const author = extractAuthorName(item);
  const year = extractYear(item);
  const title = item.title ? normalizeTitleSlug(item.title) : "";

  // Build base ID with fallbacks
  const authorPart = author || "anon";
  const yearPart = year || "nd"; // no date
  const titlePart = determineTitlePart(Boolean(author), Boolean(year), title);

  return `${authorPart}-${yearPart}${titlePart}`;
}

/**
 * Generate suffix for collision handling
 * a, b, c, ..., z, aa, ab, ...
 * @param index - Collision index (0 = no suffix, 1 = 'a', 2 = 'b', ...)
 * @returns Suffix string
 */
function generateSuffix(index: number): string {
  if (index === 0) {
    return "";
  }

  let suffix = "";
  let num = index;

  while (num > 0) {
    num--; // Adjust for 0-based indexing
    suffix = String.fromCharCode(97 + (num % 26)) + suffix;
    num = Math.floor(num / 26);
  }

  return suffix;
}

/**
 * Generate ID with collision check
 * Appends a, b, c, ... suffix if the base ID already exists
 * @param item - CSL-JSON item
 * @param existingIds - Array of existing IDs
 * @returns Generated ID with collision handling
 */
export function generateIdWithCollisionCheck(item: CslItem, existingIds: string[]): string {
  const baseId = generateId(item);

  // Normalize existing IDs to lowercase for case-insensitive comparison
  const normalizedExistingIds = existingIds.map((id) => id.toLowerCase());

  // Check for collisions
  let candidate = baseId;
  let suffixIndex = 0;

  while (normalizedExistingIds.includes(candidate.toLowerCase())) {
    suffixIndex++;
    const suffix = generateSuffix(suffixIndex);
    candidate = `${baseId}${suffix}`;
  }

  return candidate;
}
