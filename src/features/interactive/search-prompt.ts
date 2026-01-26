/**
 * Interactive search prompt using React Ink
 *
 * Provides real-time incremental search with multiple selection support.
 */

import { render, useApp } from "ink";
import type React from "react";
import { createElement } from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import type { SearchResult } from "../search/types.js";
import { type Choice, SearchableMultiSelect, type SortOption } from "./components/index.js";
import { formatAuthors } from "./format.js";

/**
 * Configuration for the search prompt
 */
export interface SearchPromptConfig {
  /** Maximum number of results to display */
  limit: number;
  /** Debounce delay in milliseconds (not used in Ink version, kept for API compatibility) */
  debounceMs: number;
}

/**
 * Search function type for filtering references
 */
export type SearchFunction = (query: string) => SearchResult[];

/**
 * Result from the search prompt
 */
export interface SearchPromptResult {
  /** Selected references */
  selected: CslItem[];
  /** Whether the prompt was cancelled */
  cancelled: boolean;
}

/**
 * Gets terminal width, falling back to 80 if not available
 */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}

/**
 * Gets terminal height, falling back to 24 if not available
 */
export function getTerminalHeight(): number {
  return process.stdout.rows ?? 24;
}

/**
 * Calculates the effective limit for the autocomplete list
 * based on terminal height to prevent input field from being hidden.
 * Reserves space for: prompt header (1), input line (1), footer hint (1), and padding (2)
 * Each item displays up to 3 lines (author/year, title, identifiers)
 */
export function calculateEffectiveLimit(configLimit: number): number {
  const terminalHeight = getTerminalHeight();
  // Reserve lines for: header(2) + search box(3) + status(1) + scroll indicators(2) + footer(2) = 10
  const reservedLines = 10;
  const linesPerItem = 3; // each search result shows up to 3 lines
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
 * Props for the SearchPromptApp component
 */
interface SearchPromptAppProps {
  choices: Choice<CslItem>[];
  filterFn: (query: string, choices: Choice<CslItem>[]) => Choice<CslItem>[];
  visibleCount: number;
  defaultSort: SortOption;
  onSubmit: (selected: Choice<CslItem>[]) => void;
  onCancel: () => void;
}

/**
 * SearchPromptApp component - wraps SearchableMultiSelect for search prompt
 */
function SearchPromptApp({
  choices,
  filterFn,
  visibleCount,
  defaultSort,
  onSubmit,
  onCancel,
}: SearchPromptAppProps): React.ReactElement {
  const { exit } = useApp();

  const handleSubmit = (selected: Choice<CslItem>[]): void => {
    onSubmit(selected);
    exit();
  };

  const handleCancel = (): void => {
    onCancel();
    exit();
  };

  return createElement(SearchableMultiSelect<CslItem>, {
    choices,
    filterFn,
    visibleCount,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    header: "Search references",
    placeholder: "Type to search...",
    defaultSort,
  });
}

/**
 * Creates and runs an interactive search prompt
 */
export async function runSearchPrompt(
  allReferences: CslItem[],
  searchFn: SearchFunction,
  config: SearchPromptConfig,
  _initialQuery = "" // kept for API compatibility, not used in Ink version
): Promise<SearchPromptResult> {
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

  // Create a promise to capture the result
  return new Promise<SearchPromptResult>((resolve) => {
    let result: SearchPromptResult = { selected: [], cancelled: true };

    const handleSubmit = (selected: Choice<CslItem>[]): void => {
      result = {
        selected: selected.map((c) => c.value),
        cancelled: false,
      };
    };

    const handleCancel = (): void => {
      result = {
        selected: [],
        cancelled: true,
      };
    };

    // Render the Ink app
    const { waitUntilExit, clear } = render(
      createElement(SearchPromptApp, {
        choices,
        filterFn,
        visibleCount: effectiveLimit,
        defaultSort: "updated-desc",
        onSubmit: handleSubmit,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit, clear the screen, then resolve
    waitUntilExit()
      .then(() => {
        clear();
        resolve(result);
      })
      .catch(() => {
        clear();
        resolve({
          selected: [],
          cancelled: true,
        });
      });
  });
}

// Export legacy functions for backward compatibility with existing tests
// These are no longer used by the React Ink implementation
export interface AutoCompleteChoice {
  name: string;
  message: string;
}

/**
 * Creates choices from search results (legacy, for test compatibility)
 */
export function createChoices(
  results: SearchResult[],
  _terminalWidth: number
): AutoCompleteChoice[] {
  return results.map((result, index) => ({
    name: JSON.stringify({ index, item: result.reference }),
    message: `[${index + 1}] ${result.reference.title ?? "(No title)"}`,
  }));
}

/**
 * Parses selected values back to CslItems (legacy, for test compatibility)
 */
export function parseSelectedValues(values: string | string[]): CslItem[] {
  const valueArray = Array.isArray(values) ? values : [values];
  const items: CslItem[] = [];

  for (const value of valueArray) {
    if (!value) continue;
    try {
      const data = JSON.parse(value) as { index: number; item: CslItem };
      items.push(data.item);
    } catch {
      // Ignore parse errors
    }
  }

  return items;
}
