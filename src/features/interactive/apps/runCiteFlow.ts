/**
 * Runner for CiteFlowApp
 *
 * Provides the public API for running the cite flow.
 */

import { render } from "ink";
import { createElement } from "react";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { SearchResult } from "../../search/types.js";
import type { Choice, SelectOption, SortOption } from "../components/index.js";
import { formatAuthors } from "../format.js";
import { CiteFlowApp, type CiteFlowResult } from "./CiteFlowApp.js";

/**
 * Configuration for the cite flow
 */
export interface CiteFlowConfig {
  /** Maximum number of results to display */
  limit: number;
}

/**
 * Search function type for filtering references
 */
export type SearchFunction = (query: string) => SearchResult[];

/**
 * Gets terminal height, falling back to 24 if not available
 */
function getTerminalHeight(): number {
  return process.stdout.rows ?? 24;
}

/**
 * Calculates the effective limit for the autocomplete list
 */
function calculateEffectiveLimit(configLimit: number): number {
  const terminalHeight = getTerminalHeight();
  // Reserve lines for: header(2) + search box(3) + status(1) + scroll indicators(2) + footer(2) = 10
  const reservedLines = 10;
  const linesPerItem = 3;
  const availableLines = terminalHeight - reservedLines;
  const maxVisibleChoices = Math.max(1, Math.floor(availableLines / linesPerItem));
  return configLimit > 0 ? Math.min(configLimit, maxVisibleChoices) : maxVisibleChoices;
}

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
 * Extract updated date from CSL item (from custom.timestamp)
 */
function extractUpdatedDate(item: CslItem): Date | undefined {
  const dateStr = item.custom?.timestamp;
  if (!dateStr || typeof dateStr !== "string") return undefined;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Extract created date from CSL item (from custom.created_at)
 */
function extractCreatedDate(item: CslItem): Date | undefined {
  const dateStr = item.custom?.created_at;
  if (!dateStr || typeof dateStr !== "string") return undefined;
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Format identifiers for meta line
 */
function formatIdentifiers(item: CslItem): string {
  const parts: string[] = [];
  if (item.DOI) parts.push(`DOI: ${item.DOI}`);
  if (item.PMID) parts.push(`PMID: ${item.PMID}`);
  if (item.PMCID) parts.push(`PMCID: ${item.PMCID}`);
  if (item.ISBN) parts.push(`ISBN: ${item.ISBN}`);
  return parts.join(" · ");
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
 * Convert CslItem to Choice for SearchableMultiSelect
 */
function toChoice(item: CslItem): Choice<CslItem> {
  const authors = formatAuthors(item.author);
  const year = extractYear(item);
  const identifiers = formatIdentifiers(item);
  const itemType = formatType(item.type);

  // Build meta line: Year · Type · Identifiers
  const metaParts: string[] = [];
  if (year) metaParts.push(String(year));
  metaParts.push(itemType);
  if (identifiers) metaParts.push(identifiers);

  const updatedDate = extractUpdatedDate(item);
  const createdDate = extractCreatedDate(item);
  const publishedDate = extractPublishedDate(item);

  return {
    id: item.id,
    title: item.title ?? "(No title)",
    subtitle: authors || "(No authors)",
    meta: metaParts.join(" · "),
    value: item,
    ...(updatedDate && { updatedDate }),
    ...(createdDate && { createdDate }),
    ...(publishedDate && { publishedDate }),
  };
}

/**
 * Options for running the cite flow
 */
export interface RunCiteFlowOptions {
  /** All references available for selection */
  allReferences: CslItem[];
  /** Search function for filtering */
  searchFn: SearchFunction;
  /** Flow configuration */
  config: CiteFlowConfig;
  /** Style options for style selection */
  styleOptions: SelectOption<string>[];
  /** Whether to show style selection */
  showStyleSelect: boolean;
}

/**
 * Run the cite flow (reference selection → style selection if needed)
 *
 * This is the main entry point for interactive cite command.
 */
export async function runCiteFlow(options: RunCiteFlowOptions): Promise<CiteFlowResult> {
  const { allReferences, searchFn, config, styleOptions, showStyleSelect } = options;

  // Convert references to choices
  const choices = allReferences.map(toChoice);

  // Calculate effective visible count
  const effectiveLimit = calculateEffectiveLimit(config.limit);

  // Create filter function using the provided search function
  const filterFn = (query: string, choices: Choice<CslItem>[]): Choice<CslItem>[] => {
    if (!query.trim()) return choices;

    const results = searchFn(query);
    return results.map((r) => toChoice(r.reference));
  };

  // Default sort option
  const defaultSort: SortOption = "updated-desc";

  // Create a promise to capture the result
  return new Promise<CiteFlowResult>((resolve) => {
    const handleComplete = (result: CiteFlowResult): void => {
      resolve(result);
    };

    const handleCancel = (): void => {
      resolve({
        identifiers: [],
        cancelled: true,
      });
    };

    // Render the Ink app (single render for entire flow)
    const { waitUntilExit } = render(
      createElement(CiteFlowApp, {
        choices,
        filterFn,
        visibleCount: effectiveLimit,
        defaultSort,
        styleOptions,
        showStyleSelect,
        onComplete: handleComplete,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit
    waitUntilExit().catch(() => {
      resolve({
        identifiers: [],
        cancelled: true,
      });
    });
  });
}
