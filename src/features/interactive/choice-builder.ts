import type { CslItem } from "../../core/csl-json/types.js";
import { buildResourceIndicators } from "../format/resource-indicators.js";
import type { Choice } from "./components/index.js";
import { formatAuthors } from "./format.js";

/**
 * Extract year from CSL item
 */
function extractYear(item: CslItem): number | undefined {
  const dateParts = item.issued?.["date-parts"];
  if (!dateParts || dateParts.length === 0) return undefined;
  const firstDatePart = dateParts[0];
  if (!firstDatePart || firstDatePart.length === 0) return undefined;
  return firstDatePart[0];
}

/**
 * Extract published date from CSL item
 */
function extractPublishedDate(item: CslItem): Date | undefined {
  const dateParts = item.issued?.["date-parts"];
  if (!dateParts || dateParts.length === 0) return undefined;
  const firstDatePart = dateParts[0];
  if (!firstDatePart || firstDatePart.length === 0) return undefined;
  const [year, month = 1, day = 1] = firstDatePart;
  if (year === undefined) return undefined;
  return new Date(year, month - 1, day);
}

/**
 * Extract updated date from CSL item (custom.timestamp)
 */
function extractUpdatedDate(item: CslItem): Date | undefined {
  const dateStr = item.custom?.timestamp;
  if (!dateStr || typeof dateStr !== "string") return undefined;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Extract created date from CSL item (custom.created_at)
 */
function extractCreatedDate(item: CslItem): Date | undefined {
  const dateStr = item.custom?.created_at;
  if (!dateStr || typeof dateStr !== "string") return undefined;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Format identifiers (DOI, PMID, PMCID, ISBN) for display
 */
export function formatIdentifiers(item: CslItem, separator = " · "): string {
  const parts: string[] = [];
  if (item.DOI) parts.push(`DOI: ${item.DOI}`);
  if (item.PMID) parts.push(`PMID: ${item.PMID}`);
  if (item.PMCID) parts.push(`PMCID: ${item.PMCID}`);
  if (item.ISBN) parts.push(`ISBN: ${item.ISBN}`);
  return parts.join(separator);
}

/**
 * Format item type for display
 */
function formatType(type: string): string {
  const typeMap: Record<string, string> = {
    "article-journal": "Journal article",
    "article-magazine": "Magazine article",
    "article-newspaper": "Newspaper article",
    book: "Book",
    chapter: "Book chapter",
    "paper-conference": "Conference paper",
    thesis: "Thesis",
    report: "Report",
    webpage: "Web page",
  };
  return typeMap[type] ?? type;
}

/**
 * Format source name for the meta line.
 *
 * Fallback order:
 * 1. container-title-short
 * 2. container-title
 * 3. Type-specific: book → publisher, others → formatted type name
 */
export function formatSource(item: CslItem): string {
  const shortTitle = item["container-title-short"];
  if (shortTitle) return shortTitle;

  const containerTitle = item["container-title"];
  if (containerTitle) return containerTitle;

  if (item.type === "book" && item.publisher) return item.publisher;

  return formatType(item.type);
}

/**
 * Build a Choice object from a CSL item for TUI display.
 *
 * Meta line format: [indicators · ] year · source · identifiers
 */
export function toChoice(item: CslItem): Choice<CslItem> {
  const authors = formatAuthors(item.author);
  const year = extractYear(item);
  const identifiers = formatIdentifiers(item);
  const source = formatSource(item);

  // Build meta line: Year · Source · Identifiers
  const metaParts: string[] = [];
  if (year) metaParts.push(String(year));
  metaParts.push(source);
  if (identifiers) metaParts.push(identifiers);

  const updatedDate = extractUpdatedDate(item);
  const createdDate = extractCreatedDate(item);
  const publishedDate = extractPublishedDate(item);

  // Prepend resource indicators to meta if present
  const indicators = buildResourceIndicators(item);
  const metaStr = metaParts.join(" · ");
  const meta = indicators ? `${indicators} · ${metaStr}` : metaStr;

  return {
    id: item.id,
    title: item.title ?? "(No title)",
    subtitle: authors || "(No authors)",
    meta,
    value: item,
    ...(updatedDate && { updatedDate }),
    ...(createdDate && { createdDate }),
    ...(publishedDate && { publishedDate }),
  };
}
