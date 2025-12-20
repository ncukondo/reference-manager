/**
 * DOI normalizer module
 *
 * Normalizes DOI identifiers by:
 * - Removing URL prefixes (doi.org, dx.doi.org)
 * - Trimming whitespace
 */

/**
 * URL prefixes to remove from DOI
 */
const DOI_URL_PREFIXES = [
  "https://doi.org/",
  "http://doi.org/",
  "https://dx.doi.org/",
  "http://dx.doi.org/",
];

/**
 * Normalize a DOI identifier
 *
 * @param doi - DOI string, possibly with URL prefix
 * @returns Normalized DOI (10.xxx/xxx format)
 */
export function normalizeDoi(doi: string): string {
  // Trim whitespace
  const trimmed = doi.trim();

  if (!trimmed) {
    return "";
  }

  // Check for URL prefixes (case-insensitive)
  const lowerInput = trimmed.toLowerCase();

  for (const prefix of DOI_URL_PREFIXES) {
    if (lowerInput.startsWith(prefix.toLowerCase())) {
      // Remove the prefix while preserving the original case of the DOI
      return trimmed.slice(prefix.length);
    }
  }

  // No prefix found, return as-is
  return trimmed;
}
