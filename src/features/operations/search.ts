import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { formatBibtex, formatPretty } from "../format/index.js";
import { search } from "../search/matcher.js";
import { sortResults } from "../search/sorter.js";
import { tokenize } from "../search/tokenizer.js";

/**
 * Output format options for search operation
 */
export type SearchFormat = "pretty" | "json" | "bibtex" | "ids-only" | "uuid";

/**
 * Options for searchReferences operation
 */
export interface SearchOperationOptions {
  /** Search query string */
  query: string;
  /** Output format (default: "pretty") */
  format?: SearchFormat;
}

/**
 * Result of searchReferences operation
 */
export interface SearchResult {
  /** Formatted strings for each matching reference */
  items: string[];
}

/**
 * Search references in the library and return formatted results.
 *
 * @param library - The library to search in
 * @param options - Search query and formatting options
 * @returns Formatted strings for each matching reference
 */
export function searchReferences(library: ILibrary, options: SearchOperationOptions): SearchResult {
  const format = options.format ?? "pretty";
  const query = options.query;

  // Get all references
  const allItems = library.getAll();

  // If query is empty, return all items
  let matchedItems: CslItem[];
  if (!query.trim()) {
    matchedItems = allItems;
  } else {
    // Tokenize and search
    const tokens = tokenize(query).tokens;
    const results = search(allItems, tokens);
    const sorted = sortResults(results);
    matchedItems = sorted.map((result) => result.reference);
  }

  // Format results based on format option
  switch (format) {
    case "json":
      return { items: matchedItems.map((item) => JSON.stringify(item)) };

    case "bibtex":
      return { items: matchedItems.map((item) => formatBibtex([item])) };

    case "ids-only":
      return { items: matchedItems.map((item) => item.id) };

    case "uuid":
      return {
        items: matchedItems
          .filter((item): item is CslItem & { custom: { uuid: string } } =>
            Boolean(item.custom?.uuid)
          )
          .map((item) => item.custom.uuid),
      };

    default:
      return { items: matchedItems.map((item) => formatPretty([item])) };
  }
}
