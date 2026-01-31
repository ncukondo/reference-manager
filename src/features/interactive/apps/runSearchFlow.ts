/**
 * Runner for SearchFlowApp
 *
 * Provides the public API for running the search flow.
 */

import { render } from "ink";
import { createElement } from "react";
import type { CitationKeyFormat } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { SearchResult } from "../../search/types.js";
import type { ActionMenuResult } from "../action-menu.js";
import { restoreStdinAfterInk } from "../alternate-screen.js";
import { type Choice, type SortOption, calculateEffectiveLimit } from "../components/index.js";
import { formatAuthors } from "../format.js";
import { SearchFlowApp } from "./SearchFlowApp.js";

/**
 * Configuration for the search flow
 */
export interface SearchFlowConfig {
  /** Maximum number of results to display */
  limit: number;
  /** Debounce delay in milliseconds (not used, kept for API compatibility) */
  debounceMs: number;
  /** Default citation key format */
  defaultKeyFormat?: CitationKeyFormat;
}

/**
 * Search function type for filtering references
 */
export type SearchFunction = (query: string) => SearchResult[];

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
 * Run the search flow (search → action → style if needed)
 *
 * This is the main entry point for the `search -t` command.
 */
export async function runSearchFlow(
  allReferences: CslItem[],
  searchFn: SearchFunction,
  config: SearchFlowConfig
): Promise<ActionMenuResult> {
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
  return new Promise<ActionMenuResult>((resolve) => {
    let flowResult: ActionMenuResult = {
      action: "cancel",
      output: "",
      cancelled: true,
    };

    const handleComplete = (result: ActionMenuResult): void => {
      flowResult = result;
    };

    const handleCancel = (): void => {
      flowResult = {
        action: "cancel",
        output: "",
        cancelled: true,
      };
    };

    // Render the Ink app (single render for entire flow)
    const { waitUntilExit } = render(
      createElement(SearchFlowApp, {
        choices,
        filterFn,
        visibleCount: effectiveLimit,
        defaultSort,
        defaultKeyFormat: config.defaultKeyFormat ?? "pandoc",
        onComplete: handleComplete,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit, then resolve
    waitUntilExit()
      .then(() => {
        restoreStdinAfterInk();
        resolve(flowResult);
      })
      .catch(() => {
        restoreStdinAfterInk();
        resolve({
          action: "cancel",
          output: "",
          cancelled: true,
        });
      });
  });
}
