/**
 * Interactive search prompt using Enquirer's AutoComplete
 *
 * Provides real-time incremental search with multiple selection support.
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type { SearchResult } from "../search/types.js";
import type { AutoCompleteChoice } from "./enquirer.js";
import { formatSearchResult } from "./format.js";

/**
 * Configuration for the search prompt
 */
export interface SearchPromptConfig {
  /** Maximum number of results to display */
  limit: number;
  /** Debounce delay in milliseconds */
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
 * Maps internal choice value to CslItem
 */
interface ChoiceData {
  index: number;
  item: CslItem;
}

/**
 * Creates choices from search results
 */
export function createChoices(
  results: SearchResult[],
  terminalWidth: number
): AutoCompleteChoice[] {
  return results.map((result, index) => {
    const displayIndex = index + 1;
    const formattedText = formatSearchResult(result.reference, displayIndex, terminalWidth);

    // Enquirer returns the 'name' property on selection, not 'value'
    // So we store the JSON data in 'name' and use 'message' for display
    return {
      name: JSON.stringify({
        index,
        item: result.reference,
      } satisfies ChoiceData),
      message: formattedText,
      value: result.reference.id,
    };
  });
}

/**
 * Parses selected values back to CslItems
 */
export function parseSelectedValues(values: string | string[]): CslItem[] {
  const valueArray = Array.isArray(values) ? values : [values];
  const items: CslItem[] = [];

  for (const value of valueArray) {
    if (!value) continue;
    try {
      const data = JSON.parse(value) as ChoiceData;
      items.push(data.item);
    } catch {
      // If parsing fails, the value might be just the id (name)
      // In this case, we can't recover the full item
      // This shouldn't happen in normal operation
    }
  }

  return items;
}

/**
 * Gets terminal width, falling back to 80 if not available
 */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}

/**
 * Creates and runs an interactive search prompt
 */
export async function runSearchPrompt(
  allReferences: CslItem[],
  searchFn: SearchFunction,
  config: SearchPromptConfig,
  initialQuery = ""
): Promise<SearchPromptResult> {
  // Dynamic import to allow mocking in tests
  // enquirer is a CommonJS module, so we must use default import
  const enquirer = await import("enquirer");
  const AutoComplete = (enquirer.default as unknown as Record<string, unknown>)
    .AutoComplete as new (
    options: Record<string, unknown>
  ) => {
    run(): Promise<string | string[]>;
  };

  const terminalWidth = getTerminalWidth();

  // Create initial choices from all references (limited)
  const initialResults: SearchResult[] = initialQuery
    ? searchFn(initialQuery).slice(0, config.limit)
    : allReferences.slice(0, config.limit).map((ref) => ({
        reference: ref,
        overallStrength: "exact" as const,
        tokenMatches: [],
        score: 0,
      }));

  const initialChoices = createChoices(initialResults, terminalWidth);

  // Track last search query to avoid redundant searches
  let lastQuery = initialQuery;

  const promptOptions = {
    name: "references",
    message: "Search references",
    initial: initialQuery,
    choices: initialChoices,
    multiple: true,
    limit: config.limit,
    suggest: (input: string, choices: AutoCompleteChoice[]) => {
      // If input hasn't changed, return current choices
      if (input === lastQuery) {
        return choices;
      }
      lastQuery = input;

      // If input is empty, show all references (limited)
      if (!input.trim()) {
        const defaultResults: SearchResult[] = allReferences.slice(0, config.limit).map((ref) => ({
          reference: ref,
          overallStrength: "exact" as const,
          tokenMatches: [],
          score: 0,
        }));
        return createChoices(defaultResults, terminalWidth);
      }

      // Search and create new choices
      const results = searchFn(input).slice(0, config.limit);
      return createChoices(results, terminalWidth);
    },
  };

  try {
    const prompt = new AutoComplete(promptOptions);
    const result = await prompt.run();

    // Handle result
    const selected = parseSelectedValues(result);

    return {
      selected,
      cancelled: false,
    };
  } catch (error) {
    // Enquirer throws an empty string when cancelled
    if (error === "" || (error instanceof Error && error.message === "")) {
      return {
        selected: [],
        cancelled: true,
      };
    }
    throw error;
  }
}
