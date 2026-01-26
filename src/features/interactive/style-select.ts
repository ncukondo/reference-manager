/**
 * Style selection prompt for citation style selection.
 *
 * Lists built-in styles and custom styles from csl_directory,
 * with the default style shown first.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { render, useApp } from "ink";
import { createElement } from "react";
import type React from "react";
import { BUILTIN_STYLES } from "../../config/csl-styles.js";
import { restoreStdinAfterInk } from "./alternate-screen.js";
import { Select, type SelectOption } from "./components/index.js";

/**
 * Options for style selection
 */
export interface StyleSelectOptions {
  /** Directory or directories containing custom CSL files */
  cslDirectory?: string | string[];
  /** Default style to show first */
  defaultStyle?: string;
}

/**
 * Result from style selection
 */
export interface StyleSelectResult {
  /** Selected style name */
  style?: string;
  /** Whether the selection was cancelled */
  cancelled: boolean;
}

/**
 * Expand tilde (~) in path to home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    return path.join(home, filePath.slice(2));
  }
  return filePath;
}

/**
 * List custom CSL style names from the specified directory/directories.
 *
 * @param cslDirectory - Directory or directories to search for CSL files
 * @returns Array of style names (without .csl extension)
 */
export function listCustomStyles(cslDirectory: string | string[] | undefined): string[] {
  if (!cslDirectory) {
    return [];
  }

  const directories = Array.isArray(cslDirectory) ? cslDirectory : [cslDirectory];
  const styles = new Set<string>();

  for (const dir of directories) {
    const expandedDir = expandTilde(dir);

    if (!fs.existsSync(expandedDir)) {
      continue;
    }

    try {
      const files = fs.readdirSync(expandedDir);
      for (const file of files) {
        if (file.endsWith(".csl")) {
          styles.add(file.slice(0, -4)); // Remove .csl extension
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return Array.from(styles).sort();
}

/**
 * Build style choices for the selection prompt.
 *
 * @param customStyles - Custom style names from csl_directory
 * @param defaultStyle - Default style to show first
 * @returns Array of SelectOption for Ink Select prompt
 */
export function buildStyleChoices(
  customStyles: string[],
  defaultStyle = "apa"
): SelectOption<string>[] {
  const choices: SelectOption<string>[] = [];
  const addedStyles = new Set<string>();

  // Helper to add a style choice
  const addChoice = (styleName: string, isDefault: boolean): void => {
    if (addedStyles.has(styleName)) return;
    addedStyles.add(styleName);

    choices.push({
      label: isDefault ? `${styleName} (default)` : styleName,
      value: styleName,
    });
  };

  // Add default style first
  addChoice(defaultStyle, true);

  // Add built-in styles
  for (const style of BUILTIN_STYLES) {
    addChoice(style, false);
  }

  // Add custom styles (excluding any that match built-in names)
  for (const style of customStyles) {
    addChoice(style, false);
  }

  return choices;
}

/**
 * Props for the StyleSelectApp component
 */
interface StyleSelectAppProps {
  options: SelectOption<string>[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}

/**
 * StyleSelectApp component - wraps Select for style selection
 */
function StyleSelectApp({ options, onSelect, onCancel }: StyleSelectAppProps): React.ReactElement {
  const { exit } = useApp();

  const handleSelect = (value: string): void => {
    onSelect(value);
    exit();
  };

  const handleCancel = (): void => {
    onCancel();
    exit();
  };

  return createElement(Select<string>, {
    options,
    message: "Select citation style:",
    onSelect: handleSelect,
    onCancel: handleCancel,
  });
}

/**
 * Run the style selection prompt.
 *
 * @param options - Style selection options
 * @returns Selection result with style name
 */
export async function runStyleSelect(options: StyleSelectOptions): Promise<StyleSelectResult> {
  // List custom styles from csl_directory
  const customStyles = listCustomStyles(options.cslDirectory);

  // Build choices with default first
  const choices = buildStyleChoices(customStyles, options.defaultStyle);

  // Create a promise to capture the result
  return new Promise<StyleSelectResult>((resolve) => {
    let result: StyleSelectResult = { cancelled: true };

    const handleSelect = (value: string): void => {
      result = {
        style: value,
        cancelled: false,
      };
    };

    const handleCancel = (): void => {
      result = {
        cancelled: true,
      };
    };

    // Render the Ink app
    const { waitUntilExit, clear } = render(
      createElement(StyleSelectApp, {
        options: choices,
        onSelect: handleSelect,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit, clear the screen, then resolve
    waitUntilExit()
      .then(() => {
        clear();
        restoreStdinAfterInk();
        resolve(result);
      })
      .catch(() => {
        clear();
        restoreStdinAfterInk();
        resolve({
          cancelled: true,
        });
      });
  });
}
