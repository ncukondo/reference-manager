/**
 * SearchableMultiSelect - A searchable multi-select component for React Ink
 *
 * This component combines text input for filtering with multi-select functionality,
 * which is not available in ink-ui out of the box.
 */

import { Box, Text, useFocus, useInput } from "ink";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

export interface Choice<T = unknown> {
  /** Unique identifier for the choice */
  id: string;
  /** Display label */
  label: string;
  /** Optional secondary text */
  hint?: string;
  /** Associated value */
  value: T;
}

export interface SearchableMultiSelectProps<T> {
  /** Available choices */
  choices: Choice<T>[];
  /** Filter function for search */
  filterFn?: (query: string, choices: Choice<T>[]) => Choice<T>[];
  /** Maximum visible items */
  limit?: number;
  /** Callback when selection is confirmed */
  onSubmit: (selected: Choice<T>[]) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Header text */
  header?: string;
  /** Footer text */
  footer?: string;
}

/**
 * Default filter function - case-insensitive substring match
 */
function defaultFilter<T>(query: string, choices: Choice<T>[]): Choice<T>[] {
  if (!query.trim()) return choices;
  const lowerQuery = query.toLowerCase();
  return choices.filter(
    (choice) =>
      choice.label.toLowerCase().includes(lowerQuery) ||
      choice.hint?.toLowerCase().includes(lowerQuery)
  );
}

export function SearchableMultiSelect<T>({
  choices,
  filterFn = defaultFilter,
  limit = 10,
  onSubmit,
  onCancel,
  placeholder = "Type to search...",
  header,
  footer = "(↑↓: navigate, Tab: select, Enter: confirm, Esc: cancel)",
}: SearchableMultiSelectProps<T>): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const { isFocused } = useFocus({ autoFocus: true });

  // Filter choices based on query
  const filteredChoices = useMemo(() => {
    const filtered = filterFn(query, choices);
    return filtered.slice(0, limit);
  }, [query, choices, filterFn, limit]);

  // Reset focus when filtered results change
  useMemo(() => {
    if (focusIndex >= filteredChoices.length) {
      setFocusIndex(Math.max(0, filteredChoices.length - 1));
    }
  }, [filteredChoices.length, focusIndex]);

  // Toggle selection for current item
  const toggleSelection = useCallback(() => {
    const currentChoice = filteredChoices[focusIndex];
    if (!currentChoice) return;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentChoice.id)) {
        newSet.delete(currentChoice.id);
      } else {
        newSet.add(currentChoice.id);
      }
      return newSet;
    });
  }, [filteredChoices, focusIndex]);

  // Handle navigation keys
  const handleNavigation = useCallback(
    (key: { upArrow: boolean; downArrow: boolean }) => {
      if (key.upArrow) {
        setFocusIndex((prev) => Math.max(0, prev - 1));
        return true;
      }
      if (key.downArrow) {
        setFocusIndex((prev) => Math.min(filteredChoices.length - 1, prev + 1));
        return true;
      }
      return false;
    },
    [filteredChoices.length]
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (key.escape) {
        onCancel();
      } else if (key.return) {
        onSubmit(choices.filter((c) => selectedIds.has(c.id)));
      } else if (handleNavigation(key)) {
        // Navigation handled
      } else if (key.tab) {
        toggleSelection();
      } else if (key.backspace || key.delete) {
        setQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setQuery((prev) => prev + input);
      }
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column">
      {/* Header */}
      {header && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {header}
          </Text>
        </Box>
      )}

      {/* Search input */}
      <Box>
        <Text color="green">❯ </Text>
        <Text>{query || <Text dimColor>{placeholder}</Text>}</Text>
        <Text color="gray">▎</Text>
      </Box>

      {/* Selected count */}
      {selectedIds.size > 0 && (
        <Box marginTop={1}>
          <Text color="yellow">
            {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""} selected
          </Text>
        </Box>
      )}

      {/* Choice list */}
      <Box flexDirection="column" marginTop={1}>
        {filteredChoices.length === 0 ? (
          <Text dimColor>No results found</Text>
        ) : (
          filteredChoices.map((choice, index) => {
            const isSelected = selectedIds.has(choice.id);
            const isFocusedItem = index === focusIndex;

            return (
              <Box key={choice.id} flexDirection="row">
                {/* Focus indicator */}
                {isFocusedItem ? <Text color="cyan">❯ </Text> : <Text> </Text>}

                {/* Selection checkbox */}
                <Text color={isSelected ? "green" : "gray"}>{isSelected ? "◉ " : "○ "}</Text>

                {/* Label */}
                {isFocusedItem ? (
                  <Text color="cyan" bold>
                    {choice.label}
                  </Text>
                ) : (
                  <Text>{choice.label}</Text>
                )}

                {/* Hint */}
                {choice.hint && <Text dimColor> - {choice.hint}</Text>}
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      {footer && (
        <Box marginTop={1}>
          <Text dimColor>{footer}</Text>
        </Box>
      )}
    </Box>
  );
}
