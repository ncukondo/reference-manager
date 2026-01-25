/**
 * Select - A simple single-select component for React Ink
 */

import { Box, Text, useFocus, useInput } from "ink";
import type React from "react";
import { useState } from "react";

export interface SelectOption<T = string> {
  /** Display label */
  label: string;
  /** Associated value */
  value: T;
  /** Optional hint text */
  hint?: string;
}

export interface SelectProps<T = string> {
  /** Available options */
  options: SelectOption<T>[];
  /** Prompt message */
  message: string;
  /** Callback when selection is confirmed */
  onSelect: (value: T) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Initial selection index */
  initialIndex?: number;
}

export function Select<T = string>({
  options,
  message,
  onSelect,
  onCancel,
  initialIndex = 0,
}: SelectProps<T>): React.ReactElement {
  const [focusIndex, setFocusIndex] = useState(initialIndex);
  const { isFocused } = useFocus({ autoFocus: true });

  useInput(
    (input, key) => {
      // Cancel on Escape
      if (key.escape) {
        onCancel();
        return;
      }

      // Submit on Enter
      if (key.return) {
        const selected = options[focusIndex];
        if (selected) {
          onSelect(selected.value);
        }
        return;
      }

      // Navigate up
      if (key.upArrow || input === "k") {
        setFocusIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      // Navigate down
      if (key.downArrow || input === "j") {
        setFocusIndex((prev) => Math.min(options.length - 1, prev + 1));
        return;
      }
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column">
      {/* Message */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {message}
        </Text>
      </Box>

      {/* Options */}
      <Box flexDirection="column">
        {options.map((option, index) => {
          const isFocusedItem = index === focusIndex;

          return (
            <Box key={`${option.label}-${index}`} flexDirection="row">
              {/* Focus indicator */}
              {isFocusedItem ? <Text color="cyan">❯ </Text> : <Text> </Text>}

              {/* Label */}
              {isFocusedItem ? (
                <Text color="cyan" bold>
                  {option.label}
                </Text>
              ) : (
                <Text>{option.label}</Text>
              )}

              {/* Hint */}
              {option.hint && <Text dimColor> ({option.hint})</Text>}
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>(↑↓: navigate, Enter: select, Esc: cancel)</Text>
      </Box>
    </Box>
  );
}
