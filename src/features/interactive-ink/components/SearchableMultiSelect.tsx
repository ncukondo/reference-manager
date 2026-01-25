/**
 * SearchableMultiSelect - A searchable multi-select component for React Ink
 *
 * This component combines text input for filtering with multi-select functionality,
 * which is not available in ink-ui out of the box.
 */

import { Box, Text, useFocus, useInput, useStdout } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  visibleCount?: number;
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

/**
 * Truncate text to fit within maxWidth
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return `${text.slice(0, maxWidth - 1)}…`;
}

/**
 * Key handler result type
 */
type KeyAction =
  | { type: "cancel" }
  | { type: "submit" }
  | { type: "navigate"; delta: number }
  | { type: "toggle" }
  | { type: "backspace" }
  | { type: "input"; char: string }
  | { type: "none" };

/**
 * Parse key input into action
 */
function parseKeyAction(
  input: string,
  key: {
    escape: boolean;
    return: boolean;
    upArrow: boolean;
    downArrow: boolean;
    pageUp: boolean;
    pageDown: boolean;
    tab: boolean;
    backspace: boolean;
    delete: boolean;
    ctrl: boolean;
    meta: boolean;
  },
  visibleCount: number,
  maxIndex: number
): KeyAction {
  if (key.escape) return { type: "cancel" };
  if (key.return) return { type: "submit" };
  if (key.upArrow) return { type: "navigate", delta: -1 };
  if (key.downArrow) return { type: "navigate", delta: 1 };
  if (key.pageUp) return { type: "navigate", delta: -visibleCount };
  if (key.pageDown) return { type: "navigate", delta: visibleCount };
  if (key.ctrl && input === "a") return { type: "navigate", delta: -maxIndex - 1 };
  if (key.ctrl && input === "e") return { type: "navigate", delta: maxIndex + 1 };
  if (key.tab) return { type: "toggle" };
  if (key.backspace || key.delete) return { type: "backspace" };
  if (input && !key.ctrl && !key.meta) return { type: "input", char: input };
  return { type: "none" };
}

export function SearchableMultiSelect<T>({
  choices,
  filterFn = defaultFilter,
  visibleCount = 10,
  onSubmit,
  onCancel,
  placeholder = "Type to search...",
  header,
  footer,
}: SearchableMultiSelectProps<T>): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { isFocused } = useFocus({ autoFocus: true });
  const { stdout } = useStdout();

  // Get terminal width for truncation
  const terminalWidth = stdout?.columns ?? 80;
  const labelWidth = Math.floor((terminalWidth - 10) * 0.4);
  const hintWidth = Math.floor((terminalWidth - 10) * 0.5);

  // Filter choices based on query
  const filteredChoices = useMemo(() => filterFn(query, choices), [query, choices, filterFn]);
  const maxIndex = filteredChoices.length - 1;

  // Reset focus and scroll when query changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on query change
  useEffect(() => {
    setFocusIndex(0);
    setScrollOffset(0);
  }, [query]);

  // Adjust scroll offset when focus changes
  useEffect(() => {
    if (focusIndex < scrollOffset) {
      setScrollOffset(focusIndex);
    } else if (focusIndex >= scrollOffset + visibleCount) {
      setScrollOffset(focusIndex - visibleCount + 1);
    }
  }, [focusIndex, scrollOffset, visibleCount]);

  // Get visible choices
  const visibleChoices = useMemo(
    () => filteredChoices.slice(scrollOffset, scrollOffset + visibleCount),
    [filteredChoices, scrollOffset, visibleCount]
  );

  // Toggle selection
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

  // Handle keyboard input
  useInput(
    (input, key) => {
      const action = parseKeyAction(input, key, visibleCount, maxIndex);
      switch (action.type) {
        case "cancel":
          onCancel();
          break;
        case "submit":
          onSubmit(choices.filter((c) => selectedIds.has(c.id)));
          break;
        case "navigate":
          setFocusIndex((prev) => Math.max(0, Math.min(maxIndex, prev + action.delta)));
          break;
        case "toggle":
          toggleSelection();
          break;
        case "backspace":
          setQuery((prev) => prev.slice(0, -1));
          break;
        case "input":
          setQuery((prev) => prev + action.char);
          break;
      }
    },
    { isActive: isFocused }
  );

  const totalItems = filteredChoices.length;
  const showScrollIndicator = totalItems > visibleCount;

  const footerText =
    footer ??
    (showScrollIndicator
      ? `↑↓:move PgUp/Dn:scroll Tab:select Enter:confirm (${focusIndex + 1}/${totalItems})`
      : "↑↓:move Tab:select Enter:confirm Esc:cancel");

  return (
    <Box flexDirection="column">
      {header && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {header}
          </Text>
        </Box>
      )}

      <Box>
        <Text color="green">❯ </Text>
        <Text>{query || <Text dimColor>{placeholder}</Text>}</Text>
        <Text color="gray">▎</Text>
      </Box>

      <Box marginTop={1}>
        {selectedIds.size > 0 ? (
          <Text color="yellow">
            {selectedIds.size} selected / {totalItems} results
          </Text>
        ) : (
          <Text dimColor>{totalItems} results</Text>
        )}
      </Box>

      {showScrollIndicator && scrollOffset > 0 && (
        <Box>
          <Text dimColor> ↑ {scrollOffset} more above</Text>
        </Box>
      )}

      <Box flexDirection="column">
        {visibleChoices.length === 0 ? (
          <Text dimColor>No results found</Text>
        ) : (
          visibleChoices.map((choice, visibleIndex) => {
            const actualIndex = scrollOffset + visibleIndex;
            const isSelected = selectedIds.has(choice.id);
            const isFocusedItem = actualIndex === focusIndex;

            return (
              <Box key={choice.id} height={1}>
                <Box width={2}>{isFocusedItem ? <Text color="cyan">❯</Text> : <Text> </Text>}</Box>
                <Box width={2}>
                  <Text color={isSelected ? "green" : "gray"}>{isSelected ? "◉" : "○"}</Text>
                </Box>
                <Box width={labelWidth}>
                  {isFocusedItem ? (
                    <Text color="cyan" bold wrap="truncate">
                      {truncate(choice.label, labelWidth)}
                    </Text>
                  ) : (
                    <Text wrap="truncate">{truncate(choice.label, labelWidth)}</Text>
                  )}
                </Box>
                {choice.hint && (
                  <Box width={hintWidth} marginLeft={1}>
                    <Text dimColor wrap="truncate">
                      {truncate(choice.hint, hintWidth)}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {showScrollIndicator && scrollOffset + visibleCount < totalItems && (
        <Box>
          <Text dimColor> ↓ {totalItems - scrollOffset - visibleCount} more below</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>{footerText}</Text>
      </Box>
    </Box>
  );
}
