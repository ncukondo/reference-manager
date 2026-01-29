/**
 * Validation prompt for the edit command.
 * Shows validation errors and prompts user for action.
 */

import { render, useApp } from "ink";
import { createElement } from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import { restoreStdinAfterInk } from "../interactive/alternate-screen.js";
import { Select, type SelectOption } from "../interactive/components/Select.js";
import type { EditValidationError, EditValidationResult } from "./edit-validator.js";

export type ValidationPromptChoice = "re-edit" | "restore" | "abort";

interface ValidationPromptAppProps {
  message: string;
  options: SelectOption<ValidationPromptChoice>[];
  onSelect: (value: ValidationPromptChoice) => void;
  onCancel: () => void;
}

function ValidationPromptApp({
  message,
  options,
  onSelect,
  onCancel,
}: ValidationPromptAppProps): React.ReactElement {
  const { exit } = useApp();

  const handleSelect = (value: ValidationPromptChoice): void => {
    onSelect(value);
    exit();
  };

  const handleCancel = (): void => {
    onCancel();
    exit();
  };

  return createElement(Select<ValidationPromptChoice>, {
    options,
    message,
    onSelect: handleSelect,
    onCancel: handleCancel,
  });
}

const PROMPT_OPTIONS: SelectOption<ValidationPromptChoice>[] = [
  { label: "Re-edit (errors shown in file)", value: "re-edit" },
  { label: "Restore original (discard changes)", value: "restore" },
  { label: "Abort (exit without saving)", value: "abort" },
];

/**
 * Format validation errors for terminal display.
 */
function formatErrorSummary(errors: Map<number, EditValidationError[]>, items: CslItem[]): string {
  const lines: string[] = [];
  const errorCount = errors.size;
  const totalCount = items.length;

  lines.push(`Validation errors (${errorCount} of ${totalCount} entries):`);

  for (const [index, itemErrors] of errors) {
    const item = items[index];
    const id = item?.id ?? `Entry ${index + 1}`;
    const fields = itemErrors.map((e) => e.field).join(", ");
    lines.push(`  Entry ${index + 1} (${id}): ${fields}`);
  }

  return lines.join("\n");
}

/**
 * Display terminal error summary.
 */
function displayErrorSummary(errors: Map<number, EditValidationError[]>, items: CslItem[]): void {
  const summary = formatErrorSummary(errors, items);
  process.stderr.write(`\n${summary}\n\n`);
}

/**
 * Run the validation prompt.
 * Shows validation errors and asks user what to do.
 *
 * @param validationResult - The validation result with errors
 * @param items - The original items being edited
 * @returns User's choice: "re-edit", "restore", or "abort"
 */
export async function runValidationPrompt(
  validationResult: EditValidationResult,
  items: CslItem[]
): Promise<ValidationPromptChoice> {
  // Display error summary in terminal
  displayErrorSummary(validationResult.errors, items);

  return new Promise<ValidationPromptChoice>((resolve) => {
    let result: ValidationPromptChoice = "abort";

    const handleSelect = (value: ValidationPromptChoice): void => {
      result = value;
    };

    const handleCancel = (): void => {
      result = "abort";
    };

    const { waitUntilExit, clear } = render(
      createElement(ValidationPromptApp, {
        message: "What would you like to do?",
        options: PROMPT_OPTIONS,
        onSelect: handleSelect,
        onCancel: handleCancel,
      })
    );

    waitUntilExit()
      .then(() => {
        clear();
        restoreStdinAfterInk();
        resolve(result);
      })
      .catch(() => {
        clear();
        restoreStdinAfterInk();
        resolve("abort");
      });
  });
}
