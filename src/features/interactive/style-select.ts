/**
 * Style selection prompt for citation style selection.
 *
 * Lists built-in styles and custom styles from csl_directory,
 * with the default style shown first.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { BUILTIN_STYLES } from "../../config/csl-styles.js";

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
 * Choice definition for Enquirer Select prompt
 */
interface StyleChoice {
  name: string;
  message: string;
  value: string;
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
 * @returns Array of choices for Enquirer Select prompt
 */
export function buildStyleChoices(customStyles: string[], defaultStyle = "apa"): StyleChoice[] {
  const choices: StyleChoice[] = [];
  const addedStyles = new Set<string>();

  // Helper to add a style choice
  const addChoice = (styleName: string, isDefault: boolean) => {
    if (addedStyles.has(styleName)) return;
    addedStyles.add(styleName);

    choices.push({
      name: styleName,
      message: isDefault ? `${styleName} (default)` : styleName,
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
 * Run the style selection prompt.
 *
 * @param options - Style selection options
 * @returns Selection result with style name
 */
export async function runStyleSelect(options: StyleSelectOptions): Promise<StyleSelectResult> {
  // Dynamic import to allow mocking in tests
  const enquirer = await import("enquirer");
  const Select = (enquirer.default as unknown as Record<string, unknown>).Select as new (
    opts: Record<string, unknown>
  ) => { run(): Promise<string> };

  // List custom styles from csl_directory
  const customStyles = listCustomStyles(options.cslDirectory);

  // Build choices with default first
  const choices = buildStyleChoices(customStyles, options.defaultStyle);

  const promptOptions = {
    name: "style",
    message: "Select citation style:",
    choices,
  };

  try {
    const prompt = new Select(promptOptions);
    const result = await prompt.run();

    return {
      style: result,
      cancelled: false,
    };
  } catch (error) {
    // Enquirer throws an empty string when cancelled
    if (error === "" || (error instanceof Error && error.message === "")) {
      return {
        cancelled: true,
      };
    }
    throw error;
  }
}
