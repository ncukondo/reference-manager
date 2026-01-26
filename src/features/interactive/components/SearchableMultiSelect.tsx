/**
 * SearchableMultiSelect - A searchable multi-select component for React Ink
 *
 * This component combines text input for filtering with multi-select functionality,
 * which is not available in ink-ui out of the box.
 */

import { Box, Text, useFocus, useInput, useStdout } from "ink";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import cliTruncate from "cli-truncate";

export interface Choice<T = unknown> {
  /** Unique identifier for the choice */
  id: string;
  /** Primary text (title) - displayed in cyan when focused */
  title: string;
  /** Secondary text (e.g., authors) */
  subtitle?: string;
  /** Tertiary text (e.g., year, type, identifiers) */
  meta?: string;
  /** Associated value */
  value: T;
  /** Date when the item was last updated (custom.timestamp) */
  updatedDate?: Date;
  /** Date when the item was created (custom.created_at) */
  createdDate?: Date;
  /** Date when the item was published (for sorting) */
  publishedDate?: Date;
}

/** Sort option identifier */
export type SortOption =
  | "updated-desc"
  | "updated-asc"
  | "created-desc"
  | "created-asc"
  | "published-desc"
  | "published-asc"
  | "relevance";

/** Sort option configuration */
interface SortOptionConfig {
  id: SortOption;
  label: string;
  requiresQuery: boolean;
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
  /** Default sort option */
  defaultSort?: SortOption;
}

/** All available sort options */
const SORT_OPTIONS: SortOptionConfig[] = [
  { id: "updated-desc", label: "Updated (newest first)", requiresQuery: false },
  { id: "updated-asc", label: "Updated (oldest first)", requiresQuery: false },
  { id: "created-desc", label: "Created (newest first)", requiresQuery: false },
  { id: "created-asc", label: "Created (oldest first)", requiresQuery: false },
  { id: "published-desc", label: "Published (newest first)", requiresQuery: false },
  { id: "published-asc", label: "Published (oldest first)", requiresQuery: false },
  { id: "relevance", label: "Relevance", requiresQuery: true },
];

/** Get short label for status bar */
function getSortShortLabel(sortOption: SortOption): string {
  switch (sortOption) {
    case "updated-desc":
      return "Updated ↓";
    case "updated-asc":
      return "Updated ↑";
    case "created-desc":
      return "Created ↓";
    case "created-asc":
      return "Created ↑";
    case "published-desc":
      return "Published ↓";
    case "published-asc":
      return "Published ↑";
    case "relevance":
      return "Relevance";
  }
}

/** Create a date comparator for sorting */
function createDateComparator<T>(
  getDate: (choice: Choice<T>) => Date | undefined,
  descending: boolean
): (a: Choice<T>, b: Choice<T>) => number {
  return (a, b) => {
    const dateA = getDate(a)?.getTime() ?? 0;
    const dateB = getDate(b)?.getTime() ?? 0;
    return descending ? dateB - dateA : dateA - dateB;
  };
}

/**
 * Sort choices by the given option
 */
function sortChoices<T>(choices: Choice<T>[], sortOption: SortOption): Choice<T>[] {
  if (sortOption === "relevance") return [...choices];

  const sorted = [...choices];
  const comparators: Record<
    Exclude<SortOption, "relevance">,
    (a: Choice<T>, b: Choice<T>) => number
  > = {
    "updated-desc": createDateComparator((c) => c.updatedDate, true),
    "updated-asc": createDateComparator((c) => c.updatedDate, false),
    "created-desc": createDateComparator((c) => c.createdDate, true),
    "created-asc": createDateComparator((c) => c.createdDate, false),
    "published-desc": createDateComparator((c) => c.publishedDate, true),
    "published-asc": createDateComparator((c) => c.publishedDate, false),
  };

  return sorted.sort(comparators[sortOption]);
}

/**
 * Default filter function - case-insensitive substring match
 */
function defaultFilter<T>(query: string, choices: Choice<T>[]): Choice<T>[] {
  if (!query.trim()) return choices;
  const lowerQuery = query.toLowerCase();
  return choices.filter(
    (choice) =>
      choice.title.toLowerCase().includes(lowerQuery) ||
      choice.subtitle?.toLowerCase().includes(lowerQuery) ||
      choice.meta?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Truncate text to fit within maxWidth
 */
function truncate(text: string, maxWidth: number): string {
  return cliTruncate(text, maxWidth, { position: "end" });
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
  | { type: "sort" }
  | { type: "none" };

/** Key state type for parsing */
interface KeyState {
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
}

/** Get navigation delta from key state */
function getNavigationDelta(
  key: KeyState,
  input: string,
  visibleCount: number,
  maxIndex: number
): number | null {
  if (key.upArrow) return -1;
  if (key.downArrow) return 1;
  if (key.pageUp) return -visibleCount;
  if (key.pageDown) return visibleCount;
  if (key.ctrl && input === "a") return -maxIndex - 1;
  if (key.ctrl && input === "e") return maxIndex + 1;
  return null;
}

/**
 * Parse key input into action
 */
function parseKeyAction(
  input: string,
  key: KeyState,
  visibleCount: number,
  maxIndex: number
): KeyAction {
  if (key.escape) return { type: "cancel" };
  if (key.return) return { type: "submit" };

  const navDelta = getNavigationDelta(key, input, visibleCount, maxIndex);
  if (navDelta !== null) return { type: "navigate", delta: navDelta };

  if (key.ctrl && input === "s") return { type: "sort" };
  if (key.tab) return { type: "toggle" };
  if (key.backspace || key.delete) return { type: "backspace" };
  if (input && !key.ctrl && !key.meta) return { type: "input", char: input };
  return { type: "none" };
}

/**
 * Choice item component - renders a single multi-line choice
 */
function ChoiceItem<T>({
  choice,
  isSelected,
  isFocused,
  contentWidth,
}: {
  choice: Choice<T>;
  isSelected: boolean;
  isFocused: boolean;
  contentWidth: number;
}): React.ReactElement {
  const indent = "      "; // 6 spaces to align with title (after indicator + checkbox)

  return (
    <Box flexDirection="column" paddingY={0}>
      {/* Row 1: Focus indicator + Checkbox + Title */}
      <Box flexDirection="row">
        {/* Focus indicator - fixed width */}
        <Box width={2}>
          <Text color="cyan">{isFocused ? "❯" : " "}</Text>
        </Box>
        {/* Selection checkbox */}
        <Box width={2}>
          <Text color={isSelected ? "green" : "gray"}>{isSelected ? "◉" : "○"}</Text>
        </Box>
        <Box width={1}>
          <Text> </Text>
        </Box>
        {/* Title */}
        <Box>
          {isFocused ? (
            <Text color="cyan" bold>
              {truncate(choice.title, contentWidth)}
            </Text>
          ) : (
            <Text color="blue">{truncate(choice.title, contentWidth)}</Text>
          )}
        </Box>
      </Box>

      {/* Row 2: Subtitle (authors) */}
      {choice.subtitle && (
        <Box>
          <Text dimColor>
            {indent}
            {truncate(choice.subtitle, contentWidth)}
          </Text>
        </Box>
      )}

      {/* Row 3: Meta (year, type, identifiers) */}
      {choice.meta && (
        <Box>
          <Text dimColor>
            {indent}
            {truncate(choice.meta, contentWidth)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Scroll indicator component
 */
function ScrollIndicator({
  direction,
  count,
  visible,
}: {
  direction: "up" | "down";
  count: number;
  visible: boolean;
}): React.ReactElement {
  const arrow = direction === "up" ? "↑" : "↓";
  const label = direction === "up" ? "more above" : "more below";
  return (
    <Box height={1}>
      {visible && count > 0 ? (
        <Text dimColor>
          {" "}
          {arrow} {count} {label}
        </Text>
      ) : (
        <Text> </Text>
      )}
    </Box>
  );
}

/**
 * Choice list component
 */
function ChoiceList<T>({
  choices,
  selectedIds,
  focusIndex,
  scrollOffset,
  contentWidth,
}: {
  choices: Choice<T>[];
  selectedIds: Set<string>;
  focusIndex: number;
  scrollOffset: number;
  contentWidth: number;
}): React.ReactElement {
  if (choices.length === 0) {
    return (
      <Box paddingY={1}>
        <Text dimColor>No results found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {choices.map((choice, visibleIndex) => {
        const actualIndex = scrollOffset + visibleIndex;
        return (
          <Box key={choice.id} flexDirection="row">
            <ChoiceItem
              choice={choice}
              isSelected={selectedIds.has(choice.id)}
              isFocused={actualIndex === focusIndex}
              contentWidth={contentWidth}
            />
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Sort menu component
 */
function SortMenu({
  options,
  focusIndex,
  currentSort,
}: {
  options: SortOptionConfig[];
  focusIndex: number;
  currentSort: SortOption;
}): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      paddingX={1}
      borderStyle="round"
      borderColor="yellow"
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          Sort by:
        </Text>
      </Box>
      {options.map((opt, index) => {
        const isFocused = index === focusIndex;
        const isCurrent = opt.id === currentSort;
        const checkMark = isCurrent ? " ✓" : "";
        return (
          <Box key={opt.id}>
            {isFocused ? (
              <Text color="cyan">
                ❯ {opt.label}
                {checkMark}
              </Text>
            ) : (
              <Text>
                {"  "}
                {opt.label}
                {checkMark}
              </Text>
            )}
          </Box>
        );
      })}
      <Box marginTop={1}>
        <Text dimColor>↑↓:select Enter:confirm Esc:cancel</Text>
      </Box>
    </Box>
  );
}

export function SearchableMultiSelect<T>({
  choices,
  filterFn = defaultFilter,
  visibleCount: visibleCountProp,
  onSubmit,
  onCancel,
  placeholder = "Type to search...",
  header,
  footer,
  defaultSort = "updated-desc",
}: SearchableMultiSelectProps<T>): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>(defaultSort);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuIndex, setSortMenuIndex] = useState(0);
  const { isFocused } = useFocus({ autoFocus: true });
  const { stdout } = useStdout();

  // Get terminal dimensions
  const terminalWidth = stdout?.columns ?? 80;
  const terminalHeight = stdout?.rows ?? 24;
  const contentWidth = terminalWidth - 8; // Reserve space for checkbox and padding

  // Calculate visible count based on terminal height
  // Each item takes 3 lines (title + subtitle + meta)
  // Reserve lines for: header(2) + search(3) + status(1) + scroll indicators(2) + footer(2) = 10
  const itemHeight = 3;
  const reservedLines = 10;
  const calculatedVisibleCount = Math.max(
    1,
    Math.floor((terminalHeight - reservedLines) / itemHeight)
  );
  const visibleCount = visibleCountProp ?? calculatedVisibleCount;

  // Filter choices based on query
  const filteredChoices = useMemo(() => filterFn(query, choices), [query, choices, filterFn]);

  // Get available sort options (relevance only when query exists)
  const availableSortOptions = useMemo(
    () => SORT_OPTIONS.filter((opt) => !opt.requiresQuery || query.trim().length > 0),
    [query]
  );

  // Apply sorting (skip for relevance as filter function handles it)
  const sortedChoices = useMemo(
    () => (sortOption === "relevance" ? filteredChoices : sortChoices(filteredChoices, sortOption)),
    [filteredChoices, sortOption]
  );

  const maxIndex = sortedChoices.length - 1;

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
    () => sortedChoices.slice(scrollOffset, scrollOffset + visibleCount),
    [sortedChoices, scrollOffset, visibleCount]
  );

  // Toggle selection
  const toggleSelection = useCallback(() => {
    const currentChoice = sortedChoices[focusIndex];
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
  }, [sortedChoices, focusIndex]);

  // Handle keyboard input for sort menu
  useInput(
    (_input, key) => {
      if (key.escape) {
        setShowSortMenu(false);
        return;
      }
      if (key.return) {
        const selected = availableSortOptions[sortMenuIndex];
        if (selected) {
          setSortOption(selected.id);
          setFocusIndex(0);
          setScrollOffset(0);
        }
        setShowSortMenu(false);
        return;
      }
      if (key.upArrow) {
        setSortMenuIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.downArrow) {
        setSortMenuIndex((prev) => Math.min(availableSortOptions.length - 1, prev + 1));
        return;
      }
    },
    { isActive: isFocused && showSortMenu }
  );

  // Handle keyboard input for main list
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
        case "sort":
          setSortMenuIndex(availableSortOptions.findIndex((o) => o.id === sortOption));
          setShowSortMenu(true);
          break;
      }
    },
    { isActive: isFocused && !showSortMenu }
  );

  const totalItems = sortedChoices.length;
  const showScrollIndicator = totalItems > visibleCount;

  const footerText =
    footer ??
    (showScrollIndicator
      ? `↑↓:move Tab:select ^S:sort Enter:confirm (${focusIndex + 1}/${totalItems})`
      : "↑↓:move Tab:select ^S:sort Enter:confirm Esc:cancel");

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      {header && (
        <Box marginBottom={1}>
          <Text bold color="cyan">
            {header}
          </Text>
        </Box>
      )}

      {/* Search input */}
      <Box marginBottom={1} paddingX={1} borderStyle="round" borderColor="cyan">
        <Text color="green">❯ </Text>
        <Text>{query || <Text dimColor>{placeholder}</Text>}</Text>
        <Text color="gray">▎</Text>
      </Box>

      {/* Status bar */}
      <Box marginBottom={1} paddingX={1} justifyContent="space-between">
        <Box>
          {selectedIds.size > 0 ? (
            <Text color="yellow">
              {selectedIds.size} selected / {totalItems} results
            </Text>
          ) : (
            <Text dimColor>{totalItems} results</Text>
          )}
        </Box>
        <Box>
          <Text dimColor>Sort: {getSortShortLabel(sortOption)}</Text>
        </Box>
      </Box>

      {/* Sort menu (replaces list when shown) - fixed height to prevent layout shift */}
      <Box flexDirection="column" height={visibleCount * itemHeight + 2}>
        {showSortMenu ? (
          <SortMenu
            options={availableSortOptions}
            focusIndex={sortMenuIndex}
            currentSort={sortOption}
          />
        ) : (
          <>
            <ScrollIndicator direction="up" count={scrollOffset} visible={showScrollIndicator} />
            <ChoiceList
              choices={visibleChoices}
              selectedIds={selectedIds}
              focusIndex={focusIndex}
              scrollOffset={scrollOffset}
              contentWidth={contentWidth}
            />
            <ScrollIndicator
              direction="down"
              count={totalItems - scrollOffset - visibleCount}
              visible={showScrollIndicator}
            />
          </>
        )}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{footerText}</Text>
      </Box>
    </Box>
  );
}
