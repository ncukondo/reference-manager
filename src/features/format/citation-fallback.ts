import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Extract first author name with initial
 * Returns "Family G" or "Family" if no given name
 */
function formatFirstAuthor(item: CslItem): string {
  if (!item.author || item.author.length === 0) {
    return "Unknown";
  }

  const firstAuthor = item.author[0];
  if (!firstAuthor) {
    return "Unknown";
  }

  if (firstAuthor.literal) return firstAuthor.literal;

  const family = firstAuthor.family || "Unknown";
  const givenInitial = firstAuthor.given ? firstAuthor.given[0] : "";

  if (givenInitial) {
    return `${family} ${givenInitial}`;
  }
  return family;
}

/**
 * Check if item has multiple authors
 */
function hasMultipleAuthors(item: CslItem): boolean {
  return (item.author?.length || 0) > 1;
}

/**
 * Extract year from CSL-JSON issued field
 */
function extractYear(item: CslItem): string {
  if (item.issued?.["date-parts"]?.[0]?.[0]) {
    return String(item.issued["date-parts"][0][0]);
  }
  return "n.d.";
}

/**
 * Get journal abbreviation (prefer short title)
 */
function getJournalAbbrev(item: CslItem): string {
  const containerTitleShort = item["container-title-short"];
  if (containerTitleShort) {
    return containerTitleShort;
  }
  return item["container-title"] || "";
}

/**
 * Format volume/issue/pages section
 * Returns formats like: "10(2):123-145", "10:123-145", "10(2)", "10", or ""
 */
function formatVolumeIssuePage(item: CslItem): string {
  const volume = item.volume;
  const issue = item.issue;
  const page = item.page;

  if (!volume && !issue && !page) {
    return "";
  }

  let result = "";

  if (volume) {
    result += volume;
    if (issue) {
      result += `(${issue})`;
    }
    if (page) {
      result += `:${page}`;
    }
  } else if (page) {
    result += page;
  }

  return result;
}

/**
 * Get identifier (PMID > DOI > URL priority)
 */
function getIdentifier(item: CslItem): string {
  if (item.PMID) {
    return `PMID:${item.PMID}`;
  }
  if (item.DOI) {
    return `DOI:${item.DOI}`;
  }
  if (item.URL) {
    return item.URL;
  }
  return "";
}

/**
 * Format a single bibliography entry
 */
function formatBibliographyEntry(item: CslItem): string {
  const parts: string[] = [];

  // Author
  const author = formatFirstAuthor(item);
  const etAl = hasMultipleAuthors(item) ? " et al" : "";
  parts.push(`${author}${etAl}.`);

  // Journal
  const journal = getJournalAbbrev(item);
  if (journal) {
    parts.push(`${journal}.`);
  }

  // Year and volume/issue/pages
  const year = extractYear(item);
  const volumeIssuePage = formatVolumeIssuePage(item);

  if (volumeIssuePage) {
    parts.push(`${year};${volumeIssuePage}.`);
  } else {
    parts.push(`${year}.`);
  }

  // Identifier
  const identifier = getIdentifier(item);
  if (identifier) {
    parts.push(`${identifier}.`);
  }

  // Title
  if (item.title) {
    parts.push(`${item.title}.`);
  }

  return parts.join(" ");
}

/**
 * Get first author family name only (for in-text citations)
 */
function getFirstAuthorFamilyName(item: CslItem): string {
  if (!item.author || item.author.length === 0) {
    return "Unknown";
  }

  const firstAuthor = item.author[0];
  if (!firstAuthor) {
    return "Unknown";
  }

  if (firstAuthor.literal) return firstAuthor.literal;
  return firstAuthor.family || "Unknown";
}

/**
 * Format a single in-text citation (without parentheses)
 * Returns "Family et al, YYYY" or "Family, YYYY"
 */
function formatInTextEntry(item: CslItem): string {
  const author = getFirstAuthorFamilyName(item);
  const etAl = hasMultipleAuthors(item) ? " et al" : "";
  const year = extractYear(item);

  return `${author}${etAl}, ${year}`;
}

/**
 * Format CSL-JSON items as simplified AMA-like bibliography entries.
 *
 * Format: FirstAuthor [et al]. JournalAbbrev. YYYY;volume(issue):pages. PMID:xxxxx [or DOI:xxxxx]. Title.
 *
 * Multiple items are separated by double newlines.
 *
 * @param items - Array of CSL-JSON items
 * @returns Formatted bibliography entries separated by double newlines
 */
export function formatBibliography(items: CslItem[]): string {
  if (items.length === 0) {
    return "";
  }

  return items.map(formatBibliographyEntry).join("\n\n");
}

/**
 * Format CSL-JSON items as simplified in-text citations.
 *
 * Format: (FirstAuthor et al, YYYY)
 *
 * Multiple items are separated by semicolons and enclosed in parentheses.
 *
 * @param items - Array of CSL-JSON items
 * @returns Formatted in-text citation(s) enclosed in parentheses
 */
export function formatInText(items: CslItem[]): string {
  if (items.length === 0) {
    return "";
  }

  const citations = items.map(formatInTextEntry).join("; ");
  return `(${citations})`;
}
