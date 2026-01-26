/**
 * CiteFlowApp - Single App for cite command flow
 *
 * Implements the Single App Pattern (ADR-015) for the cite command.
 * Manages state transitions: reference selection → style selection → exiting
 */

import { Box, useApp } from "ink";
import type React from "react";
import { createElement, useEffect, useState } from "react";
import type { CslItem } from "../../../core/csl-json/types.js";
import { SearchableMultiSelect } from "../components/SearchableMultiSelect.js";
import { Select, type SelectOption } from "../components/Select.js";
import type { Choice, SortOption } from "../components/index.js";

// Flow states
type FlowState = "search" | "style" | "exiting";

/**
 * Result from the cite flow
 */
export interface CiteFlowResult {
  /** Selected reference IDs */
  identifiers: string[];
  /** Selected style (if style selection was shown) */
  style?: string;
  /** Whether the flow was cancelled */
  cancelled: boolean;
}

/**
 * Props for CiteFlowApp
 */
export interface CiteFlowAppProps {
  /** All reference choices */
  choices: Choice<CslItem>[];
  /** Filter function for search */
  filterFn: (query: string, choices: Choice<CslItem>[]) => Choice<CslItem>[];
  /** Number of visible items */
  visibleCount: number;
  /** Default sort option */
  defaultSort: SortOption;
  /** Style options for style selection */
  styleOptions: SelectOption<string>[];
  /** Whether to show style selection (false if style already specified) */
  showStyleSelect: boolean;
  /** Callback when flow completes */
  onComplete: (result: CiteFlowResult) => void;
  /** Callback when flow is cancelled */
  onCancel: () => void;
}

/**
 * CiteFlowApp component
 *
 * Single Ink app that handles the entire cite flow:
 * 1. Reference selection (SearchableMultiSelect)
 * 2. Style selection (Select) - optional
 * 3. Exit
 */
export function CiteFlowApp({
  choices,
  filterFn,
  visibleCount,
  defaultSort,
  styleOptions,
  showStyleSelect,
  onComplete,
  onCancel,
}: CiteFlowAppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<FlowState>("search");
  const [selectedItems, setSelectedItems] = useState<CslItem[]>([]);
  const [pendingResult, setPendingResult] = useState<CiteFlowResult | null>(null);

  // Exit when entering "exiting" state
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
  const exitWith = (result: CiteFlowResult) => {
    setPendingResult(result);
    setState("exiting");
  };

  // Handle search submission
  const handleSearchSubmit = (selected: Choice<CslItem>[]) => {
    if (selected.length === 0) {
      exitWith({ identifiers: [], cancelled: true });
      return;
    }
    const items = selected.map((c) => c.value);
    setSelectedItems(items);

    if (showStyleSelect) {
      setState("style");
    } else {
      // No style selection needed, complete immediately
      exitWith({
        identifiers: items.map((item) => item.id),
        cancelled: false,
      });
    }
  };

  // Handle search cancel
  const handleSearchCancel = () => {
    exitWith({ identifiers: [], cancelled: true });
  };

  // Handle style selection
  const handleStyleSelect = (style: string) => {
    exitWith({
      identifiers: selectedItems.map((item) => item.id),
      style,
      cancelled: false,
    });
  };

  // Handle style cancel (go back to search)
  const handleStyleCancel = () => {
    setState("search");
  };

  // Render based on current state
  if (state === "exiting") {
    return createElement(Box);
  }

  if (state === "search") {
    return createElement(SearchableMultiSelect<CslItem>, {
      choices,
      filterFn,
      visibleCount,
      onSubmit: handleSearchSubmit,
      onCancel: handleSearchCancel,
      header: "Select references to cite",
      placeholder: "Type to search...",
      defaultSort,
    });
  }

  // state === "style"
  const count = selectedItems.length;
  const refWord = count === 1 ? "reference" : "references";
  return createElement(Select<string>, {
    options: styleOptions,
    message: `Select citation style for ${count} ${refWord}:`,
    onSelect: handleStyleSelect,
    onCancel: handleStyleCancel,
  });
}
