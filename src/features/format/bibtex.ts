import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Map CSL-JSON type to BibTeX entry type
 */
function mapEntryType(cslType: string): string {
  const typeMap: Record<string, string> = {
    article: "article",
    "article-journal": "article",
    "article-magazine": "article",
    "article-newspaper": "article",
    book: "book",
    chapter: "inbook",
    "paper-conference": "inproceedings",
    thesis: "phdthesis",
    report: "techreport",
    webpage: "misc",
  };

  return typeMap[cslType] || "misc";
}

/**
 * Format a single author as "Family, Given"
 */
function formatBibtexAuthor(author: {
  family?: string | undefined;
  given?: string | undefined;
  literal?: string | undefined;
}): string {
  if (author.literal) {
    return author.literal;
  }
  const family = author.family || "";
  const given = author.given || "";
  return given ? `${family}, ${given}` : family;
}

/**
 * Format authors for BibTeX as "Family1, Given1 and Family2, Given2"
 */
function formatBibtexAuthors(
  authors: Array<{
    family?: string | undefined;
    given?: string | undefined;
    literal?: string | undefined;
    "dropping-particle"?: string | undefined;
    "non-dropping-particle"?: string | undefined;
    suffix?: string | undefined;
  }>
): string {
  return authors.map(formatBibtexAuthor).join(" and ");
}

/**
 * Format a BibTeX field
 */
function formatField(name: string, value: string): string {
  return `  ${name} = {${value}},`;
}

/**
 * Add basic bibliographic fields to BibTeX entry
 */
function addBasicFields(lines: string[], item: CslItem): void {
  // Title
  if (item.title) {
    lines.push(formatField("title", item.title));
  }

  // Authors
  if (item.author && item.author.length > 0) {
    lines.push(formatField("author", formatBibtexAuthors(item.author)));
  }

  // Year
  const year = item.issued?.["date-parts"]?.[0]?.[0];
  if (year) {
    lines.push(formatField("year", String(year)));
  }
}

/**
 * Add publication details to BibTeX entry
 */
function addPublicationDetails(lines: string[], item: CslItem, entryType: string): void {
  // Container-title (journal or booktitle depending on type)
  if (item["container-title"]) {
    if (entryType === "article") {
      lines.push(formatField("journal", item["container-title"]));
    } else if (entryType === "inbook" || entryType === "inproceedings") {
      lines.push(formatField("booktitle", item["container-title"]));
    }
  }

  // Volume
  if (item.volume) {
    lines.push(formatField("volume", item.volume));
  }

  // Issue -> number
  if (item.issue) {
    lines.push(formatField("number", item.issue));
  }

  // Pages
  if (item.page) {
    lines.push(formatField("pages", item.page));
  }

  // Publisher
  if (item.publisher) {
    lines.push(formatField("publisher", item.publisher));
  }
}

/**
 * Add identifier fields to BibTeX entry
 */
function addIdentifierFields(lines: string[], item: CslItem): void {
  // DOI
  if (item.DOI) {
    lines.push(formatField("doi", item.DOI));
  }

  // URL
  if (item.URL) {
    lines.push(formatField("url", item.URL));
  }

  // PMID or PMCID in note field
  if (item.PMID) {
    lines.push(formatField("note", `PMID: ${item.PMID}`));
  } else if (item.PMCID) {
    lines.push(formatField("note", `PMCID: ${item.PMCID}`));
  }
}

/**
 * Format a single reference as BibTeX entry
 */
function formatSingleBibtexEntry(item: CslItem): string {
  const entryType = mapEntryType(item.type);
  const lines: string[] = [];

  // Opening line: @type{citation-key,
  lines.push(`@${entryType}{${item.id},`);

  // Add fields in sections
  addBasicFields(lines, item);
  addPublicationDetails(lines, item, entryType);
  addIdentifierFields(lines, item);

  // Closing brace
  lines.push("}");

  return lines.join("\n");
}

/**
 * Format references as BibTeX
 */
export function formatBibtex(items: CslItem[]): string {
  if (items.length === 0) {
    return "";
  }

  return items.map(formatSingleBibtexEntry).join("\n\n");
}
