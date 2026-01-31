/**
 * SearchFlowApp - Single App for search -t flow
 *
 * Manages state transitions: search → action → (style if needed)
 * Following React Ink Single App Pattern (ADR-015)
 */

import { Box, useApp } from "ink";
import type React from "react";
import { createElement, useEffect, useState } from "react";
import type { CitationKeyFormat } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import {
  type ActionMenuResult,
  type ActionType,
  STYLE_CHOICES,
  generateOutput,
  getActionChoices,
} from "../action-menu.js";
import {
  type Choice,
  SearchableMultiSelect,
  Select,
  type SortOption,
} from "../components/index.js";

/**
 * Flow states for the search flow
 */
type FlowState = "search" | "action" | "style" | "exiting";

/**
 * Props for SearchFlowApp
 */
export interface SearchFlowAppProps {
  /** Choices for the search prompt */
  choices: Choice<CslItem>[];
  /** Filter function for search */
  filterFn: (query: string, choices: Choice<CslItem>[]) => Choice<CslItem>[];
  /** Number of visible items */
  visibleCount: number;
  /** Default sort option */
  defaultSort: SortOption;
  /** Default citation key format */
  defaultKeyFormat: CitationKeyFormat;
  /** Callback when flow completes */
  onComplete: (result: ActionMenuResult) => void;
  /** Callback when flow is cancelled */
  onCancel: () => void;
}

/**
 * SearchFlowApp component
 *
 * Single App that manages search → action → style flow
 */
export function SearchFlowApp({
  choices,
  filterFn,
  visibleCount,
  defaultSort,
  defaultKeyFormat,
  onComplete,
  onCancel,
}: SearchFlowAppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<FlowState>("search");
  const [selectedItems, setSelectedItems] = useState<CslItem[]>([]);
  const [pendingResult, setPendingResult] = useState<ActionMenuResult | null>(null);

  // Exit when entering "exiting" state (after rendering empty component)
  useEffect(() => {
    if (state === "exiting" && pendingResult) {
      exit();
      if (pendingResult.cancelled) {
        onCancel();
      } else {
        onComplete(pendingResult);
      }
    }
  }, [state, pendingResult, exit, onCancel, onComplete]);

  // Transition to exiting state with result
  const exitWith = (result: ActionMenuResult) => {
    setPendingResult(result);
    setState("exiting");
  };

  // Handle search submission
  const handleSearchSubmit = (selected: Choice<CslItem>[]) => {
    if (selected.length === 0) {
      exitWith({ action: "cancel", output: "", cancelled: true });
      return;
    }
    setSelectedItems(selected.map((c) => c.value));
    setState("action");
  };

  // Handle search cancel
  const handleSearchCancel = () => {
    exitWith({ action: "cancel", output: "", cancelled: true });
  };

  // Handle action selection
  const handleActionSelect = (action: ActionType) => {
    if (action === "cancel") {
      exitWith({ action: "cancel", output: "", cancelled: true });
      return;
    }

    // If cite-choose, go to style selection
    if (action === "cite-choose") {
      setState("style");
      return;
    }

    // Generate output and complete
    const output = generateOutput(action, selectedItems, undefined, defaultKeyFormat);
    exitWith({ action, output, cancelled: false });
  };

  // Handle action cancel (go back to search)
  const handleActionCancel = () => {
    setState("search");
  };

  // Handle style selection
  const handleStyleSelect = (style: string) => {
    const output = generateOutput("cite-choose", selectedItems, style, defaultKeyFormat);
    exitWith({ action: "cite-choose", output, cancelled: false });
  };

  // Handle style cancel (go back to action)
  const handleStyleCancel = () => {
    setState("action");
  };

  // Render based on current state
  if (state === "exiting") {
    // Empty component - Ink will clear the previous content
    return createElement(Box);
  }

  if (state === "search") {
    return createElement(SearchableMultiSelect<CslItem>, {
      choices,
      filterFn,
      visibleCount,
      onSubmit: handleSearchSubmit,
      onCancel: handleSearchCancel,
      header: "Search references",
      placeholder: "Type to search...",
      defaultSort,
    });
  }

  if (state === "action") {
    const count = selectedItems.length;
    const refWord = count === 1 ? "reference" : "references";
    return createElement(Select<ActionType>, {
      options: getActionChoices(defaultKeyFormat),
      message: `Action for ${count} selected ${refWord}:`,
      onSelect: handleActionSelect,
      onCancel: handleActionCancel,
    });
  }

  // state === "style"
  return createElement(Select<string>, {
    options: STYLE_CHOICES,
    message: "Select citation style:",
    onSelect: handleStyleSelect,
    onCancel: handleStyleCancel,
  });
}
