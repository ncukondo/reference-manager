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
import { restoreStdinAfterInk } from "./alternate-screen.js";
import { toChoice } from "./choice-builder.js";
import {
  type Choice,
  SearchableMultiSelect,
  type SortOption,
  calculateEffectiveLimit,
  getTerminalHeight,
  getTerminalWidth,
} from "./components/index.js";

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

export { calculateEffectiveLimit, getTerminalHeight, getTerminalWidth };

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
        restoreStdinAfterInk();
        resolve(result);
      })
      .catch(() => {
        clear();
        restoreStdinAfterInk();
        resolve({
          selected: [],
          cancelled: true,
        });
      });
  });
}
