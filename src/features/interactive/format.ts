/**
 * Display format functions for interactive search
 */

import type { CslItem } from "../../core/csl-json/types.js";

/**
 * CSL name type (author structure)
 */
type CslName = NonNullable<CslItem["author"]>[number];

/**
 * Format a single author name
 * - Personal: "Smith, J." (family + initial of given)
 * - Institutional: "World Health Organization" (literal)
 */
function formatSingleAuthor(author: CslName): string {
  if (author.literal) {
    return author.literal;
  }
  if (author.family) {
    if (author.given) {
      const initial = author.given.charAt(0).toUpperCase();
      return `${author.family}, ${initial}.`;
    }
    return author.family;
  }
  return "";
}

/**
 * Format author list for display
 * - Single author: "Smith, J."
 * - Two authors: "Smith, J., & Doe, A."
 * - Three authors: "Smith, J., Doe, A., & Johnson, B."
 * - More than three: "Smith, J., et al."
 *
 * @param authors - Array of CSL author objects
 * @returns Formatted author string
 */
export function formatAuthors(authors: CslName[] | undefined): string {
  if (!authors || authors.length === 0) {
    return "";
  }

  if (authors.length > 3) {
    const first = authors[0];
    if (!first) {
      return "";
    }
    return `${formatSingleAuthor(first)}, et al.`;
  }

  const formatted = authors.map(formatSingleAuthor);
  if (formatted.length === 1) {
    return formatted[0] ?? "";
  }

  // Join all but last with ", " and append "& " + last
  const allButLast = formatted.slice(0, -1).join(", ");
  const last = formatted[formatted.length - 1] ?? "";
  return `${allButLast}, & ${last}`;
}

/**
 * Truncate title to fit terminal width
 *
 * @param title - Title string
 * @param maxWidth - Maximum display width
 * @returns Truncated title with ellipsis if needed
 */
export function formatTitle(title: string | undefined, maxWidth: number): string {
  if (!title) {
    return "";
  }

  if (title.length <= maxWidth) {
    return title;
  }

  // Truncate and add ellipsis, keeping total length at maxWidth
  return `${title.slice(0, maxWidth - 3)}...`;
}

/**
 * Format identifiers (DOI, PMID, PMCID, ISBN) for display
 *
 * @param item - CSL item
 * @returns Formatted identifier string (e.g., "DOI: 10.1000/example | PMID: 12345678")
 */
export function formatIdentifiers(item: CslItem): string {
  const identifiers: string[] = [];

  if (item.DOI) {
    identifiers.push(`DOI: ${item.DOI}`);
  }
  if (item.PMID) {
    identifiers.push(`PMID: ${item.PMID}`);
  }
  if (item.PMCID) {
    identifiers.push(`PMCID: ${item.PMCID}`);
  }
  if (item.ISBN) {
    identifiers.push(`ISBN: ${item.ISBN}`);
  }

  return identifiers.join(" | ");
}

/**
 * Extract year from CSL item
 */
function extractYear(item: CslItem): number | undefined {
  const dateParts = item.issued?.["date-parts"];
  if (!dateParts || dateParts.length === 0) {
    return undefined;
  }
  const firstDatePart = dateParts[0];
  if (!firstDatePart || firstDatePart.length === 0) {
    return undefined;
  }
  return firstDatePart[0];
}

/**
 * Compose a complete search result line
 *
 * Format:
 * ```
 * [1] Smith, J., & Doe, A. (2020)
 *     Machine learning in medicine: A comprehensive review
 *     DOI: 10.1000/example | PMID: 12345678
 * ```
 *
 * @param item - CSL item
 * @param index - Display index (1-based)
 * @param terminalWidth - Terminal width for title truncation
 * @returns Multi-line formatted string
 */
export function formatSearchResult(item: CslItem, index: number, terminalWidth: number): string {
  const lines: string[] = [];

  // Line 1: [index] Authors (year)
  const authors = formatAuthors(item.author);
  const year = extractYear(item);
  const yearPart = year !== undefined ? ` (${year})` : "";
  const line1 = `[${index}] ${authors}${yearPart}`;
  lines.push(line1);

  // Line 2: Title (indented, truncated)
  const indent = "    ";
  const titleMaxWidth = terminalWidth - indent.length;
  const title = formatTitle(item.title, titleMaxWidth);
  if (title) {
    lines.push(`${indent}${title}`);
  }

  // Line 3: Identifiers (indented)
  const identifiers = formatIdentifiers(item);
  if (identifiers) {
    lines.push(`${indent}${identifiers}`);
  }

  return lines.join("\n");
}
