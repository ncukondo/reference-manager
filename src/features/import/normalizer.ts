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

/**
 * Normalizes a PMID by removing the optional "PMID:" prefix and trimming whitespace.
 *
 * Supported formats:
 * - "12345678" -> "12345678"
 * - "PMID:12345678" -> "12345678"
 * - "pmid:12345678" -> "12345678"
 * - "PMID: 12345678" -> "12345678" (space after colon)
 *
 * @param pmid - The PMID string to normalize
 * @returns The normalized PMID (digits only) or empty string if invalid
 */
export function normalizePmid(pmid: string): string {
  // Trim whitespace
  const trimmed = pmid.trim();

  if (!trimmed) {
    return "";
  }

  // Remove "PMID:" prefix (case-insensitive, optional whitespace after colon)
  const normalized = trimmed.replace(/^pmid:\s*/i, "");

  return normalized.trim();
}
