/**
 * Action menu for interactive search mode.
 * Allows users to perform actions on selected references.
 */

import { render } from "ink";
import { createElement } from "react";
import type React from "react";
import { stringify as yamlStringify } from "yaml";
import type { CitationKeyFormat } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliographyCSL, formatBibtex } from "../format/index.js";
import { restoreStdinAfterInk } from "./alternate-screen.js";
import { Select, type SelectOption } from "./components/index.js";

/**
 * Action types available in the action menu.
 */
export type ActionType =
  | "key-default"
  | "cite-default"
  | "cite-choose"
  | "open-url"
  | "open-fulltext"
  | "manage-attachments"
  | "edit"
  | "output-format"
  | "remove"
  | "cancel";

/**
 * Output format types for the output format submenu.
 */
export type OutputFormatType =
  | "output-ids"
  | "output-csl-json"
  | "output-bibtex"
  | "output-yaml"
  | "cancel";

/**
 * Side-effect action types that perform operations rather than producing stdout output.
 */
const SIDE_EFFECT_ACTIONS: ReadonlySet<ActionType> = new Set([
  "open-url",
  "open-fulltext",
  "manage-attachments",
  "edit",
  "remove",
]);

/**
 * Check if an action is a side-effect action.
 */
export function isSideEffectAction(action: ActionType): boolean {
  return SIDE_EFFECT_ACTIONS.has(action);
}

/**
 * Result from action menu selection.
 */
export interface ActionMenuResult {
  /** Selected action type */
  action: ActionType;
  /** Generated output (empty for cancel and side-effect actions) */
  output: string;
  /** Whether the prompt was cancelled */
  cancelled: boolean;
  /** Selected items (for side-effect actions) */
  selectedItems?: CslItem[];
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
 * Config options for action choices.
 */
export interface ActionChoicesConfig {
  defaultKeyFormat?: CitationKeyFormat | undefined;
}

/**
 * Config options for output generation.
 */
export interface GenerateOutputConfig {
  defaultKeyFormat?: CitationKeyFormat | undefined;
  defaultStyle?: string | undefined;
}

/**
 * Generate action choices for the action menu.
 * Returns different choices based on the number of selected entries.
 */
export function getActionChoices(
  count: number,
  config: ActionChoicesConfig = {}
): SelectOption<ActionType>[] {
  const { defaultKeyFormat = "pandoc" } = config;
  const isSingle = count === 1;
  const formatLabel = defaultKeyFormat === "latex" ? "LaTeX" : "Pandoc";

  const keyLabel = isSingle ? `Citation key (${formatLabel})` : `Citation keys (${formatLabel})`;

  const choices: SelectOption<ActionType>[] = [
    { label: keyLabel, value: "key-default" },
    { label: "Generate citation", value: "cite-default" },
    { label: "Generate citation (choose style)", value: "cite-choose" },
  ];

  if (isSingle) {
    choices.push(
      { label: "Open URL", value: "open-url" },
      { label: "Open fulltext", value: "open-fulltext" },
      { label: "Manage attachments", value: "manage-attachments" }
    );
  }

  choices.push(
    { label: isSingle ? "Edit reference" : "Edit references", value: "edit" },
    { label: "Output (choose format)", value: "output-format" },
    { label: "Remove", value: "remove" },
    { label: "Cancel", value: "cancel" }
  );

  return choices;
}

/**
 * Available action choices for the action menu (default, single entry).
 * @deprecated Use getActionChoices(count, config) for dynamic choices.
 */
export const ACTION_CHOICES: SelectOption<ActionType>[] = getActionChoices(1);

/**
 * Output format choices for the output format submenu.
 */
export const OUTPUT_FORMAT_CHOICES: SelectOption<OutputFormatType>[] = [
  { label: "IDs (citation keys)", value: "output-ids" },
  { label: "CSL-JSON", value: "output-csl-json" },
  { label: "BibTeX", value: "output-bibtex" },
  { label: "YAML", value: "output-yaml" },
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
  action: ActionType | OutputFormatType,
  items: CslItem[],
  config: GenerateOutputConfig = {}
): string {
  const { defaultKeyFormat = "pandoc", defaultStyle = "apa" } = config;

  switch (action) {
    case "output-ids":
      return items.map((item) => item.id).join("\n");

    case "output-csl-json":
      return JSON.stringify(items, null, 2);

    case "output-bibtex":
      return formatBibtex(items);

    case "output-yaml":
      return yamlStringify(items).trimEnd();

    // cite-default uses config.defaultStyle; cite-choose has its style
    // overridden by the caller (processAction/SearchFlowApp) before reaching here.
    case "cite-default":
    case "cite-choose":
      return formatBibliographyCSL(items, { style: defaultStyle });

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
async function processAction(
  action: ActionType,
  items: CslItem[],
  config: GenerateOutputConfig = {}
): Promise<ActionMenuResult> {
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
      output: generateOutput(action, items, {
        ...config,
        defaultStyle: styleResult.style,
      }),
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

  // Handle side-effect actions
  if (isSideEffectAction(action)) {
    return {
      action,
      output: "",
      cancelled: false,
      selectedItems: items,
    };
  }

  // Handle other actions
  return {
    action,
    output: generateOutput(action, items, config),
    cancelled: false,
  };
}

/**
 * Run the action menu for selected references.
 *
 * @param items - Selected references
 * @param config - Output generation config
 * @returns Action result with output
 */
export async function runActionMenu(
  items: CslItem[],
  config: GenerateOutputConfig = {}
): Promise<ActionMenuResult> {
  const count = items.length;
  const refWord = count === 1 ? "reference" : "references";
  const message = `Action for ${count} selected ${refWord}:`;
  const actionChoices = getActionChoices(count, {
    defaultKeyFormat: config.defaultKeyFormat,
  });

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
        options: actionChoices,
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
          const result = await processAction(selectedAction, items, config);
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
