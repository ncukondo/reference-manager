import type { Reference } from "../../core/reference";

/**
 * Format a single author as "Family, Given-Initial."
 */
function formatAuthor(author: {
  family?: string | undefined;
  given?: string | undefined;
}): string {
  const family = author.family || "";
  const givenInitial = author.given ? `${author.given.charAt(0)}.` : "";
  return givenInitial ? `${family}, ${givenInitial}` : family;
}

/**
 * Format authors array as "Family1, G.; Family2, G."
 */
function formatAuthors(
  authors: Array<{
    family?: string | undefined;
    given?: string | undefined;
    literal?: string | undefined;
    "dropping-particle"?: string | undefined;
    "non-dropping-particle"?: string | undefined;
    suffix?: string | undefined;
  }>
): string {
  return authors.map(formatAuthor).join("; ");
}

/**
 * Format a single reference in pretty format
 */
function formatSingleReference(ref: Reference): string {
  const item = ref.getItem();
  const lines: string[] = [];

  // Header line: [id] title
  const header = item.title ? `[${item.id}] ${item.title}` : `[${item.id}]`;
  lines.push(header);

  // Authors (if present)
  if (item.author && item.author.length > 0) {
    lines.push(`  Authors: ${formatAuthors(item.author)}`);
  }

  // Year
  const year = item.issued?.["date-parts"]?.[0]?.[0];
  lines.push(`  Year: ${year || "(no year)"}`);

  // Type
  lines.push(`  Type: ${item.type}`);

  // DOI (if present)
  if (item.DOI) {
    lines.push(`  DOI: ${item.DOI}`);
  }

  // PMID (if present)
  if (item.PMID) {
    lines.push(`  PMID: ${item.PMID}`);
  }

  // PMCID (if present)
  if (item.PMCID) {
    lines.push(`  PMCID: ${item.PMCID}`);
  }

  // URL (if present)
  if (item.URL) {
    lines.push(`  URL: ${item.URL}`);
  }

  // UUID (always)
  lines.push(`  UUID: ${ref.getUuid()}`);

  return lines.join("\n");
}

/**
 * Format references in pretty-printed format
 */
export function formatPretty(references: Reference[]): string {
  if (references.length === 0) {
    return "";
  }

  return references.map(formatSingleReference).join("\n\n");
}
