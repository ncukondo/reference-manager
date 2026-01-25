/**
 * Interactive Reference Search App using React Ink
 *
 * This is a prototype demonstrating how the interactive search
 * could work with React Ink instead of enquirer.
 */

import { Box, Text, useApp } from "ink";
import type React from "react";
import { useState } from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatAuthors } from "../interactive/format.js";
import { SearchableMultiSelect, Select } from "./components/index.js";
import type { Choice, SelectOption } from "./components/index.js";

// App states
type AppState = "search" | "action" | "result";

// Action types
type ActionType = "output-ids" | "output-csl-json" | "output-bibtex" | "cite-apa" | "cancel";

// Action options
const ACTION_OPTIONS: SelectOption<ActionType>[] = [
  { label: "Output IDs (citation keys)", value: "output-ids" },
  { label: "Output as CSL-JSON", value: "output-csl-json" },
  { label: "Output as BibTeX", value: "output-bibtex" },
  { label: "Generate citation (APA)", value: "cite-apa" },
  { label: "Cancel", value: "cancel" },
];

interface AppProps {
  /** References to search */
  references: CslItem[];
  /** Search function */
  searchFn?: (query: string) => CslItem[];
  /** Callback with final result */
  onComplete?: (result: { action: ActionType; items: CslItem[] } | null) => void;
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
 * Convert CslItem to Choice for SearchableMultiSelect
 */
function toChoice(item: CslItem): Choice<CslItem> {
  const authors = formatAuthors(item.author);
  const year = extractYear(item);
  const yearPart = year ? ` (${year})` : "";

  return {
    id: item.id,
    label: `${authors}${yearPart}`,
    hint: item.title?.slice(0, 60) + (item.title && item.title.length > 60 ? "..." : ""),
    value: item,
  };
}

export function App({ references, searchFn, onComplete }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>("search");
  const [selectedItems, setSelectedItems] = useState<CslItem[]>([]);
  const [result, setResult] = useState<{ action: ActionType; output: string } | null>(null);

  // Convert references to choices
  const choices = references.map(toChoice);

  // Filter function that uses the provided searchFn
  const filterFn = (query: string, choices: Choice<CslItem>[]): Choice<CslItem>[] => {
    if (!query.trim()) return choices;

    if (searchFn) {
      const results = searchFn(query);
      return results.map(toChoice);
    }

    // Default: simple substring match
    const lowerQuery = query.toLowerCase();
    return choices.filter(
      (c) =>
        c.label.toLowerCase().includes(lowerQuery) || c.hint?.toLowerCase().includes(lowerQuery)
    );
  };

  // Handle search completion
  const handleSearchSubmit = (selected: Choice<CslItem>[]) => {
    if (selected.length === 0) {
      onComplete?.(null);
      exit();
      return;
    }
    setSelectedItems(selected.map((c) => c.value));
    setState("action");
  };

  // Handle search cancel
  const handleSearchCancel = () => {
    onComplete?.(null);
    exit();
  };

  // Handle action selection
  const handleActionSelect = (action: ActionType) => {
    if (action === "cancel") {
      onComplete?.(null);
      exit();
      return;
    }

    // Generate output
    let output = "";
    switch (action) {
      case "output-ids":
        output = selectedItems.map((item) => item.id).join("\n");
        break;
      case "output-csl-json":
        output = JSON.stringify(selectedItems, null, 2);
        break;
      case "output-bibtex":
        output = `% BibTeX export for ${selectedItems.length} items\n${selectedItems.map((item) => `% ${item.id}`).join("\n")}`;
        break;
      case "cite-apa":
        output = selectedItems
          .map((item) => {
            const authors = formatAuthors(item.author);
            const year = extractYear(item);
            return `${authors} (${year ?? "n.d."}). ${item.title}`;
          })
          .join("\n\n");
        break;
    }

    setResult({ action, output });
    setState("result");
    onComplete?.({ action, items: selectedItems });
  };

  // Handle action cancel
  const handleActionCancel = () => {
    setState("search");
  };

  // Render based on current state
  if (state === "search") {
    return (
      <SearchableMultiSelect
        choices={choices}
        filterFn={filterFn}
        visibleCount={10}
        onSubmit={handleSearchSubmit}
        onCancel={handleSearchCancel}
        header="Search references"
        placeholder="Type to search..."
      />
    );
  }

  if (state === "action") {
    const count = selectedItems.length;
    const refWord = count === 1 ? "reference" : "references";
    return (
      <Select
        options={ACTION_OPTIONS}
        message={`Action for ${count} selected ${refWord}:`}
        onSelect={handleActionSelect}
        onCancel={handleActionCancel}
      />
    );
  }

  // Result state
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="green">
          ✓ Action completed: {result?.action}
        </Text>
      </Box>
      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Text>{result?.output}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press any key to exit</Text>
      </Box>
    </Box>
  );
}
