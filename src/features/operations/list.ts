import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { formatBibtex, formatPretty } from "../format/index.js";

/**
 * Output format options for list operation
 */
export type ListFormat = "pretty" | "json" | "bibtex" | "ids-only" | "uuid";

/**
 * Options for listReferences operation
 */
export interface ListOptions {
  /** Output format (default: "pretty") */
  format?: ListFormat;
}

/**
 * Result of listReferences operation
 */
export interface ListResult {
  /** Formatted strings for each reference */
  items: string[];
}

/**
 * List all references from the library with specified format.
 *
 * @param library - The library to list references from
 * @param options - Formatting options
 * @returns Formatted strings for each reference
 */
export function listReferences(library: ILibrary, options: ListOptions): ListResult {
  const format = options.format ?? "pretty";
  const items = library.getAll();

  switch (format) {
    case "json":
      return { items: items.map((item) => JSON.stringify(item)) };

    case "bibtex":
      // Format each item individually using existing formatter
      return { items: items.map((item) => formatBibtex([item])) };

    case "ids-only":
      return { items: items.map((item) => item.id) };

    case "uuid":
      return {
        items: items
          .filter((item): item is CslItem & { custom: { uuid: string } } =>
            Boolean(item.custom?.uuid)
          )
          .map((item) => item.custom.uuid),
      };

    default:
      // Format each item individually using existing formatter (pretty)
      return { items: items.map((item) => formatPretty([item])) };
  }
}
