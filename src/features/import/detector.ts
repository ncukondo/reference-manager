/**
 * Format detection module for multi-format import
 *
 * Detects input format based on:
 * - File extension (.json, .bib, .ris)
 * - Content patterns (JSON, BibTeX, RIS)
 * - Identifier patterns (PMID, DOI)
 * - Multiple whitespace-separated identifiers
 */

import { normalizeIsbn, normalizePmid } from "./normalizer.js";

/**
 * Supported input formats
 */
export type InputFormat =
  | "json"
  | "bibtex"
  | "ris"
  | "nbib"
  | "pmid"
  | "doi"
  | "isbn"
  | "identifiers"
  | "unknown";

/**
 * Extension to format mapping
 */
const EXTENSION_MAP: Record<string, InputFormat> = {
  ".json": "json",
  ".bib": "bibtex",
  ".ris": "ris",
  ".nbib": "nbib",
};

/**
 * DOI URL prefixes to strip
 */
const DOI_URL_PREFIXES = [
  "https://doi.org/",
  "http://doi.org/",
  "https://dx.doi.org/",
  "http://dx.doi.org/",
];

/**
 * Detect the format of the given input
 *
 * @param input - File path, identifier, or empty string for stdin
 * @param content - Optional content to analyze (for stdin or unknown extension)
 * @returns Detected format
 */
export function detectFormat(input: string, content?: string): InputFormat {
  // 1. Try extension-based detection first
  const extFormat = detectByExtension(input);
  if (extFormat !== "unknown") {
    return extFormat;
  }

  // 2. If content provided, try content-based detection
  if (content !== undefined) {
    const contentFormat = detectByContent(content);
    if (contentFormat !== "unknown") {
      return contentFormat;
    }
  }

  // 3. Try identifier detection on input string
  if (input.length > 0) {
    const identifierFormat = detectIdentifier(input);
    if (identifierFormat !== "unknown") {
      return identifierFormat;
    }
  }

  return "unknown";
}

/**
 * Detect format based on file extension
 */
export function detectByExtension(input: string): InputFormat {
  if (!input) return "unknown";

  // Extract extension (last dot and onwards)
  const dotIndex = input.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === input.length - 1) {
    return "unknown";
  }

  const ext = input.slice(dotIndex).toLowerCase();
  return EXTENSION_MAP[ext] ?? "unknown";
}

/**
 * Detect format based on content patterns
 */
export function detectByContent(content: string): InputFormat {
  const trimmed = content.trim();
  if (!trimmed) return "unknown";

  // JSON: starts with [ or {
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return "json";
  }

  // BibTeX: starts with @
  if (trimmed.startsWith("@")) {
    return "bibtex";
  }

  // RIS: starts with TY  - (tag format)
  if (trimmed.startsWith("TY  -")) {
    return "ris";
  }

  // NBIB (PubMed MEDLINE): starts with PMID-
  if (trimmed.startsWith("PMID-")) {
    return "nbib";
  }

  // Check if content is multiple identifiers
  return detectIdentifier(trimmed);
}

/**
 * Detect if input is an identifier (PMID, DOI, ISBN) or multiple identifiers
 */
function detectIdentifier(input: string): InputFormat {
  // Split by whitespace
  const parts = input.split(/\s+/).filter((p) => p.length > 0);

  if (parts.length === 0) {
    return "unknown";
  }

  // Check each part
  const formats: ("pmid" | "doi" | "isbn")[] = [];
  for (const part of parts) {
    const format = detectSingleIdentifier(part);
    if (format === "unknown") {
      // If any part is not a valid identifier, return unknown
      return "unknown";
    }
    formats.push(format);
  }

  // Single identifier returns its specific format
  if (formats.length === 1) {
    // formats[0] is guaranteed to exist when length === 1
    return formats[0] as "pmid" | "doi" | "isbn";
  }

  // Multiple valid identifiers
  return "identifiers";
}

/**
 * Detect if a single string is a PMID, DOI, or ISBN
 */
export function detectSingleIdentifier(input: string): "pmid" | "doi" | "isbn" | "unknown" {
  // DOI: starts with 10. or is a DOI URL
  if (isDoi(input)) {
    return "doi";
  }

  // ISBN: requires ISBN: prefix
  if (isIsbn(input)) {
    return "isbn";
  }

  // PMID: numeric only (must be after ISBN check to avoid conflicts)
  if (isPmid(input)) {
    return "pmid";
  }

  return "unknown";
}

/**
 * Check if string is a valid DOI
 */
export function isDoi(input: string): boolean {
  // Check DOI URL formats
  for (const prefix of DOI_URL_PREFIXES) {
    if (input.toLowerCase().startsWith(prefix.toLowerCase())) {
      const remainder = input.slice(prefix.length);
      return isDoiFormat(remainder);
    }
  }

  // Check standard DOI format (10.xxx/xxx)
  return isDoiFormat(input);
}

/**
 * Check if string is a valid DOI format (10.xxx/xxx)
 */
function isDoiFormat(input: string): boolean {
  // DOI starts with 10. followed by registrant code and suffix
  // Pattern: 10.{registrant}/{suffix}
  if (!input.startsWith("10.")) {
    return false;
  }

  // Must have content after 10.
  if (input.length <= 3) {
    return false;
  }

  // Must have a slash after registrant code
  const slashIndex = input.indexOf("/");
  if (slashIndex === -1 || slashIndex <= 3) {
    return false;
  }

  return true;
}

/**
 * Check if string is a valid PMID (numeric only)
 */
export function isPmid(input: string): boolean {
  if (!input || input.length === 0) {
    return false;
  }

  // Normalize input (removes PMID: prefix if present)
  const normalized = normalizePmid(input);

  if (!normalized) {
    return false;
  }

  // PMID is all digits
  return /^\d+$/.test(normalized);
}

/**
 * Check if string is a valid ISBN (requires ISBN: prefix)
 *
 * ISBN must have ISBN: prefix and be either:
 * - ISBN-13: 13 digits
 * - ISBN-10: 10 digits (last may be X)
 */
export function isIsbn(input: string): boolean {
  if (!input || input.length === 0) {
    return false;
  }

  // Normalize input (removes ISBN: prefix if present, hyphens, spaces)
  const normalized = normalizeIsbn(input);

  if (!normalized) {
    return false;
  }

  // Check length: ISBN-10 (10 chars) or ISBN-13 (13 chars)
  if (normalized.length !== 10 && normalized.length !== 13) {
    return false;
  }

  // ISBN-10: 9 digits + (digit or X)
  if (normalized.length === 10) {
    // First 9 must be digits, last can be digit or X
    if (!/^\d{9}[\dX]$/.test(normalized)) {
      return false;
    }
    return true;
  }

  // ISBN-13: all digits
  if (!/^\d{13}$/.test(normalized)) {
    return false;
  }

  return true;
}
