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

    // Enquirer returns the 'name' property on selection when 'value' is not defined
    // So we store the JSON data in 'name' and use 'message' for display
    return {
      name: JSON.stringify({
        index,
        item: result.reference,
      } satisfies ChoiceData),
      message: formattedText,
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
  const reservedLines = 5; // header + input + footer hint + padding
  const linesPerItem = 3; // each search result shows up to 3 lines
  const availableLines = terminalHeight - reservedLines;
  const maxVisibleChoices = Math.max(1, Math.floor(availableLines / linesPerItem));
  return configLimit > 0 ? Math.min(configLimit, maxVisibleChoices) : maxVisibleChoices;
}

/**
 * Collects enabled (selected) item IDs from choices
 */
function collectEnabledIds(choices: AutoCompleteChoice[]): Set<string> {
  const enabledIds = new Set<string>();
  for (const choice of choices) {
    if ((choice as { enabled?: boolean }).enabled) {
      try {
        const data = JSON.parse(choice.name) as ChoiceData;
        enabledIds.add(data.item.id);
      } catch {
        // Ignore parse errors
      }
    }
  }
  return enabledIds;
}

/**
 * Restores enabled state for choices matching the given IDs
 */
function restoreEnabledState(choices: AutoCompleteChoice[], enabledIds: Set<string>): void {
  for (const choice of choices) {
    try {
      const data = JSON.parse(choice.name) as ChoiceData;
      if (enabledIds.has(data.item.id)) {
        (choice as { enabled?: boolean }).enabled = true;
      }
    } catch {
      // Ignore parse errors
    }
  }
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
  const BaseAutoComplete = (enquirer.default as unknown as Record<string, unknown>)
    .AutoComplete as new (
    options: Record<string, unknown>
  ) => {
    run(): Promise<string | string[]>;
  };

  const terminalWidth = getTerminalWidth();
  // Calculate effective limit based on terminal height
  const effectiveLimit = calculateEffectiveLimit(config.limit);

  // Create initial choices from all references (limited)
  const initialResults: SearchResult[] = initialQuery
    ? searchFn(initialQuery).slice(0, effectiveLimit)
    : allReferences.slice(0, effectiveLimit).map((ref) => ({
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
    limit: effectiveLimit,
    footer: "(Tab: select, Enter: confirm)",
    suggest: (input: string, choices: AutoCompleteChoice[]) => {
      // If input hasn't changed, return current choices
      if (input === lastQuery) {
        return choices;
      }
      lastQuery = input;

      // Collect enabled (selected) item IDs from current choices
      const enabledIds = collectEnabledIds(choices);

      // Create new choices based on input
      const newChoices = input.trim()
        ? createChoices(searchFn(input).slice(0, effectiveLimit), terminalWidth)
        : createChoices(
            allReferences.slice(0, effectiveLimit).map((ref) => ({
              reference: ref,
              overallStrength: "exact" as const,
              tokenMatches: [],
              score: 0,
            })),
            terminalWidth
          );

      // Restore enabled state for matching items
      restoreEnabledState(newChoices, enabledIds);

      return newChoices;
    },
  };

  try {
    const prompt = new BaseAutoComplete(promptOptions);

    // Override key handlers:
    // - Space: append character instead of toggling selection
    // - Tab: toggle selection (like space does in default multiple mode)
    const promptInstance = prompt as unknown as {
      space: () => void;
      dispatch: (s: string, key: { name: string }) => Promise<void>;
      append: (ch: string) => void;
      toggle: (item: unknown) => void;
      focused: unknown;
      run(): Promise<string | string[]>;
    };

    promptInstance.space = function () {
      return this.append(" ");
    };

    // Override next() which is called on Tab key press
    // Make it toggle selection only (no movement, use arrow keys to move)
    const promptWithRender = promptInstance as unknown as {
      next: () => void;
      render: () => void;
    };
    promptWithRender.next = function () {
      promptInstance.toggle(promptInstance.focused);
      this.render();
    };

    const result = await promptInstance.run();

    // Workaround for Enquirer bug: focused item with enabled=true may not be in result
    const promptAny = prompt as unknown as {
      focused?: { name: string; enabled?: boolean };
      selected?: Array<{ name: string }>;
    };

    let valuesToParse: string | string[] = result;

    // If result is empty but focused item is enabled, use focused item
    if (
      Array.isArray(result) &&
      result.length === 0 &&
      promptAny.focused?.enabled &&
      promptAny.focused?.name
    ) {
      valuesToParse = [promptAny.focused.name];
    }

    // Handle result
    const selected = parseSelectedValues(valuesToParse);

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
