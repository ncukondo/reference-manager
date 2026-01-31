/**
 * Item formatting for list/search results
 * Converts CslItem[] to various string formats for CLI output
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibtex } from "./bibtex.js";
import { formatPretty } from "./pretty.js";

/**
 * Available output formats for items
 */
export type ItemFormat =
  | "json"
  | "bibtex"
  | "pretty"
  | "ids-only"
  | "uuid"
  | "pandoc-key"
  | "latex-key";

/**
 * Format CslItem[] to the specified output format
 *
 * @param items - Array of CslItem to format
 * @param format - Target format
 * @returns For "json": returns original CslItem[], for others: returns string[]
 */
export function formatItems(items: CslItem[], format: ItemFormat): string[] | CslItem[] {
  switch (format) {
    case "json":
      // Return raw CslItem[] for JSON format - CLI will handle JSON.stringify
      return items;

    case "bibtex":
      return items.map((item) => formatBibtex([item]));

    case "ids-only":
      return items.map((item) => item.id);

    case "uuid":
      return items
        .filter((item): item is CslItem & { custom: { uuid: string } } =>
          Boolean(item.custom?.uuid)
        )
        .map((item) => item.custom.uuid);

    case "pandoc-key":
      return items.map((item) => `@${item.id}`);

    case "latex-key":
      return items.map((item) => `\\cite{${item.id}}`);

    default:
      return items.map((item) => formatPretty([item]));
  }
}
