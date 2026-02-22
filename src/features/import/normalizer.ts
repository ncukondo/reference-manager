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

/**
 * Normalizes an ISBN by removing the "ISBN:" prefix, hyphens, spaces, and uppercasing X.
 *
 * Supported formats:
 * - "ISBN:978-4-00-000000-0" -> "9784000000000"
 * - "isbn:4-00-000000-0" -> "4000000000"
 * - "ISBN: 978 4 00 000000 0" -> "9784000000000"
 * - "ISBN:400000000x" -> "400000000X" (uppercase X)
 *
 * @param isbn - The ISBN string to normalize
 * @returns The normalized ISBN (digits only, X uppercase at end for ISBN-10) or empty string if invalid
 */
export function normalizeIsbn(isbn: string): string {
  // Trim whitespace
  const trimmed = isbn.trim();

  if (!trimmed) {
    return "";
  }

  // Check for ISBN: prefix (case-insensitive)
  if (!/^isbn:/i.test(trimmed)) {
    return "";
  }

  // Remove "ISBN:" prefix (case-insensitive, optional whitespace after colon)
  let normalized = trimmed.replace(/^isbn:\s*/i, "");

  // Remove hyphens and spaces
  normalized = normalized.replace(/[-\s]/g, "");

  // Uppercase X (for ISBN-10 check digit)
  normalized = normalized.toUpperCase();

  return normalized;
}

/**
 * URL prefixes to remove from arXiv identifiers
 */
const ARXIV_URL_PREFIXES = [
  "https://arxiv.org/abs/",
  "http://arxiv.org/abs/",
  "https://arxiv.org/pdf/",
  "http://arxiv.org/pdf/",
  "https://arxiv.org/html/",
  "http://arxiv.org/html/",
];

/**
 * Normalizes an arXiv identifier by removing URL prefixes and arXiv: prefix.
 *
 * Supported formats:
 * - "2301.13867" -> "2301.13867"
 * - "2301.13867v2" -> "2301.13867v2"
 * - "arXiv:2301.13867" -> "2301.13867"
 * - "arxiv:2301.13867v2" -> "2301.13867v2"
 * - "https://arxiv.org/abs/2301.13867" -> "2301.13867"
 * - "https://arxiv.org/pdf/2301.13867" -> "2301.13867"
 * - "https://arxiv.org/html/2301.13867v2" -> "2301.13867v2"
 *
 * @param arxiv - The arXiv string to normalize
 * @returns The normalized arXiv ID or empty string if invalid input
 */
export function normalizeArxiv(arxiv: string): string {
  const trimmed = arxiv.trim();

  if (!trimmed) {
    return "";
  }

  // Check for URL prefixes (case-insensitive)
  const lowerInput = trimmed.toLowerCase();

  for (const prefix of ARXIV_URL_PREFIXES) {
    if (lowerInput.startsWith(prefix.toLowerCase())) {
      return trimmed.slice(prefix.length);
    }
  }

  // Remove "arXiv:" prefix (case-insensitive)
  const withoutPrefix = trimmed.replace(/^arxiv:\s*/i, "");

  return withoutPrefix;
}
