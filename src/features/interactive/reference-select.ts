/**
 * Shared reference selection utility for interactive ID selection.
 *
 * This module provides a reusable function to select references interactively
 * using the existing search prompt infrastructure.
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { search } from "../search/matcher.js";
import { tokenize } from "../search/tokenizer.js";
import { type SearchPromptConfig, runSearchPrompt } from "./search-prompt.js";
import { checkTTY } from "./tty.js";

/**
 * Options for reference selection
 */
export interface ReferenceSelectOptions {
  /** Whether to allow multiple selection (default: true) */
  multiSelect: boolean;
  /** Custom prompt message */
  prompt?: string;
  /** Initial search query */
  initialQuery?: string;
}

/**
 * Result from reference selection
 */
export interface ReferenceSelectResult {
  /** Selected references */
  selected: CslItem[];
  /** Whether the selection was cancelled */
  cancelled: boolean;
}

/**
 * Run interactive reference selection.
 *
 * Launches an interactive search prompt to select references from the library.
 * Supports both single and multiple selection modes.
 *
 * @param allReferences - All references available for selection
 * @param options - Selection options
 * @param config - Interactive prompt configuration
 * @returns Selection result with selected references
 * @throws TTYError if not running in a TTY environment
 */
export async function runReferenceSelect(
  allReferences: CslItem[],
  options: ReferenceSelectOptions,
  config: SearchPromptConfig
): Promise<ReferenceSelectResult> {
  // Check TTY requirement
  checkTTY();

  // Create search function for runSearchPrompt
  const searchFn = (query: string) => {
    const { tokens } = tokenize(query);
    return search(allReferences, tokens);
  };

  // Run search prompt
  const searchResult = await runSearchPrompt(
    allReferences,
    searchFn,
    config,
    options.initialQuery ?? ""
  );

  if (searchResult.cancelled) {
    return { selected: [], cancelled: true };
  }

  // For single-select mode, return only the first selected item
  const selected = options.multiSelect ? searchResult.selected : searchResult.selected.slice(0, 1);

  return {
    selected,
    cancelled: false,
  };
}
