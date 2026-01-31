/**
 * Action menu for interactive search mode.
 * Allows users to perform actions on selected references.
 */

import { render } from "ink";
import { createElement } from "react";
import type React from "react";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliographyCSL, formatBibtex } from "../format/index.js";
import { restoreStdinAfterInk } from "./alternate-screen.js";
import { Select, type SelectOption } from "./components/index.js";

/**
 * Action types available in the action menu.
 */
export type ActionType =
  | "output-ids"
  | "output-csl-json"
  | "output-bibtex"
  | "cite-apa"
  | "cite-choose"
  | "key-default"
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
 * Available action choices for the action menu.
 */
export const ACTION_CHOICES: SelectOption<ActionType>[] = [
  { label: "Output IDs (citation keys)", value: "output-ids" },
  { label: "Output as CSL-JSON", value: "output-csl-json" },
  { label: "Output as BibTeX", value: "output-bibtex" },
  { label: "Generate citation (APA)", value: "cite-apa" },
  { label: "Generate citation (choose style)", value: "cite-choose" },
  { label: "Citation key (Pandoc)", value: "key-default" },
  { label: "Cancel", value: "cancel" },
];

/**
 * Available style choices for citation style selection.
 */
export const STYLE_CHOICES: SelectOption<string>[] = [
  { label: "APA", value: "apa" },
  { label: "Vancouver", value: "vancouver" },
  { label: "Harvard", value: "harvard" },
];

/**
 * Props for the ActionMenuApp component
 */
interface ActionMenuAppProps {
  message: string;
  options: SelectOption<ActionType>[];
  onSelect: (value: ActionType) => void;
  onCancel: () => void;
}

/**
 * ActionMenuApp component - wraps Select for action menu
 */
function ActionMenuApp({
  message,
  options,
  onSelect,
  onCancel,
}: ActionMenuAppProps): React.ReactElement {
  return createElement(Select<ActionType>, {
    options,
    message,
    onSelect,
    onCancel,
  });
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
  return createElement(Select<string>, {
    options,
    message: "Select citation style:",
    onSelect,
    onCancel,
  });
}

/**
 * Generate output for the given action and items.
 */
export function generateOutput(
  action: ActionType,
  items: CslItem[],
  style = "apa",
  defaultKeyFormat = "pandoc"
): string {
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

    case "key-default":
      if (defaultKeyFormat === "latex") {
        return `\\cite{${items.map((i) => i.id).join(",")}}`;
      }
      return items.map((i) => `@${i.id}`).join("; ");

    case "cancel":
      return "";

    default:
      return "";
  }
}

/**
 * Run the style selection prompt.
 */
export async function runStyleSelectPrompt(): Promise<StyleSelectResult> {
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
    const { waitUntilExit } = render(
      createElement(StyleSelectApp, {
        options: STYLE_CHOICES,
        onSelect: handleSelect,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit, then resolve
    waitUntilExit()
      .then(() => {
        restoreStdinAfterInk();
        resolve(result);
      })
      .catch(() => {
        restoreStdinAfterInk();
        resolve({
          cancelled: true,
        });
      });
  });
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

/**
 * Run the action menu for selected references.
 *
 * @param items - Selected references
 * @returns Action result with output
 */
export async function runActionMenu(items: CslItem[]): Promise<ActionMenuResult> {
  const count = items.length;
  const refWord = count === 1 ? "reference" : "references";
  const message = `Action for ${count} selected ${refWord}:`;

  return new Promise<ActionMenuResult>((resolve) => {
    let selectedAction: ActionType | null = null;

    const handleSelect = (action: ActionType): void => {
      selectedAction = action;
    };

    const handleCancel = (): void => {
      selectedAction = null;
    };

    // Render the Ink app
    const { waitUntilExit } = render(
      createElement(ActionMenuApp, {
        message,
        options: ACTION_CHOICES,
        onSelect: handleSelect,
        onCancel: handleCancel,
      })
    );

    // Wait for the app to exit, then process the action
    waitUntilExit()
      .then(async () => {
        restoreStdinAfterInk();

        if (selectedAction === null) {
          resolve({
            action: "cancel",
            output: "",
            cancelled: true,
          });
        } else {
          const result = await processAction(selectedAction, items);
          resolve(result);
        }
      })
      .catch(() => {
        restoreStdinAfterInk();
        resolve({
          action: "cancel",
          output: "",
          cancelled: true,
        });
      });
  });
}
