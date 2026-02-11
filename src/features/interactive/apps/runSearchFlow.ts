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
import { toChoice } from "../choice-builder.js";
import { type Choice, type SortOption, calculateEffectiveLimit } from "../components/index.js";
import { SearchFlowApp } from "./SearchFlowApp.js";

/**
 * Configuration for the search flow
 */
export interface SearchFlowConfig {
  /** Maximum number of results to display */
  limit: number;
  /** Debounce delay in milliseconds for search filtering */
  debounceMs: number;
  /** Default citation key format */
  defaultKeyFormat?: CitationKeyFormat;
  /** Default citation style */
  defaultStyle?: string;
}

/**
 * Search function type for filtering references
 */
export type SearchFunction = (query: string) => SearchResult[];

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
  // Convert references to choices and build lookup map
  const choices = allReferences.map(toChoice);
  const choiceMap = new Map(choices.map((c) => [c.id, c]));

  // Calculate effective visible count
  const effectiveLimit = calculateEffectiveLimit(config.limit);

  // Create filter function using the provided search function
  const filterFn = (query: string, choices: Choice<CslItem>[]): Choice<CslItem>[] => {
    if (!query.trim()) return choices;

    const results = searchFn(query);
    return results.flatMap((r) => {
      const choice = choiceMap.get(r.reference.id);
      return choice ? [choice] : [];
    });
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
        defaultStyle: config.defaultStyle ?? "apa",
        debounceMs: config.debounceMs,
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
