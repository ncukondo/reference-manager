/**
 * Action menu for interactive search mode.
 * Allows users to perform actions on selected references.
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliographyCSL, formatBibtex } from "../format/index.js";

/**
 * Action types available in the action menu.
 */
export type ActionType =
  | "output-ids"
  | "output-csl-json"
  | "output-bibtex"
  | "cite-apa"
  | "cite-choose"
  | "cancel";

/**
 * Result from action menu selection.
 */
export interface ActionMenuResult {
  /** Selected action type */
  action: ActionType;
  /** Generated output (empty for cancel) */
  output: string;
  /** Whether the prompt was cancelled */
  cancelled: boolean;
}

/**
 * Result from style selection prompt.
 */
export interface StyleSelectResult {
  /** Selected style (undefined if cancelled) */
  style?: string;
  /** Whether the prompt was cancelled */
  cancelled: boolean;
}

/**
 * Choice definition for Enquirer Select prompt.
 */
interface SelectChoice {
  name: string;
  message: string;
  value: ActionType | string;
}

/**
 * Available action choices for the action menu.
 */
export const ACTION_CHOICES: SelectChoice[] = [
  { name: "output-ids", message: "Output IDs (citation keys)", value: "output-ids" },
  { name: "output-csl-json", message: "Output as CSL-JSON", value: "output-csl-json" },
  { name: "output-bibtex", message: "Output as BibTeX", value: "output-bibtex" },
  { name: "cite-apa", message: "Generate citation (APA)", value: "cite-apa" },
  { name: "cite-choose", message: "Generate citation (choose style)", value: "cite-choose" },
  { name: "cancel", message: "Cancel", value: "cancel" },
];

/**
 * Available style choices for citation style selection.
 * Uses BUILTIN_STYLES from config/csl-styles.ts
 */
export const STYLE_CHOICES: SelectChoice[] = [
  { name: "apa", message: "APA", value: "apa" },
  { name: "vancouver", message: "Vancouver", value: "vancouver" },
  { name: "harvard", message: "Harvard", value: "harvard" },
];

/**
 * Run the style selection prompt.
 */

/**
 * Generate output for the given action and items.
 */
function generateOutput(action: ActionType, items: CslItem[], style = "apa"): string {
  switch (action) {
    case "output-ids":
      return items.map((item) => item.id).join("\n");

    case "output-csl-json":
      return JSON.stringify(items, null, 2);

    case "output-bibtex":
      return formatBibtex(items);

    case "cite-apa":
      return formatBibliographyCSL(items, { style: "apa" });

    case "cite-choose":
      return formatBibliographyCSL(items, { style });

    case "cancel":
      return "";

    default:
      return "";
  }
}

/**
 * Process the selected action and generate result.
 */
async function processAction(action: ActionType, items: CslItem[]): Promise<ActionMenuResult> {
  // Handle cite-choose: prompt for style first
  if (action === "cite-choose") {
    const styleResult = await runStyleSelectPrompt();
    if (styleResult.cancelled) {
      return {
        action: "cancel",
        output: "",
        cancelled: true,
      };
    }
    return {
      action,
      output: generateOutput(action, items, styleResult.style),
      cancelled: false,
    };
  }

  // Handle cancel
  if (action === "cancel") {
    return {
      action,
      output: "",
      cancelled: true,
    };
  }

  // Handle other actions
  return {
    action,
    output: generateOutput(action, items),
    cancelled: false,
  };
}

export async function runStyleSelectPrompt(): Promise<StyleSelectResult> {
  // Dynamic import to allow mocking in tests
  // enquirer is a CommonJS module, so we must use default import
  const enquirer = await import("enquirer");
  const Select = (enquirer.default as unknown as Record<string, unknown>).Select as new (
    options: Record<string, unknown>
  ) => { run(): Promise<string> };

  const promptOptions = {
    name: "style",
    message: "Select citation style:",
    choices: STYLE_CHOICES,
  };

  try {
    const prompt = new Select(promptOptions);
    const result = (await prompt.run()) as string;

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

/**
 * Run the action menu for selected references.
 *
 * @param items - Selected references
 * @returns Action result with output
 */
export async function runActionMenu(items: CslItem[]): Promise<ActionMenuResult> {
  // Dynamic import to allow mocking in tests
  // enquirer is a CommonJS module, so we must use default import
  const enquirer = await import("enquirer");
  const Select = (enquirer.default as unknown as Record<string, unknown>).Select as new (
    options: Record<string, unknown>
  ) => { run(): Promise<string> };

  const count = items.length;
  const refWord = count === 1 ? "reference" : "references";
  const message = `Action for ${count} selected ${refWord}:`;

  const promptOptions = {
    name: "action",
    message,
    choices: ACTION_CHOICES,
  };

  try {
    const prompt = new Select(promptOptions);
    const action = (await prompt.run()) as ActionType;

    return processAction(action, items);
  } catch (error) {
    // Enquirer throws an empty string when cancelled
    if (error === "" || (error instanceof Error && error.message === "")) {
      return {
        action: "cancel",
        output: "",
        cancelled: true,
      };
    }
    throw error;
  }
}
