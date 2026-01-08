import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { formatBibtex, formatPretty } from "../format/index.js";
import {
  type PaginationOptions,
  type SortField,
  type SortOptions,
  type SortOrder,
  paginate,
  sortReferences,
} from "../pagination/index.js";

/**
 * Output format options for list operation
 */
export type ListFormat = "pretty" | "json" | "bibtex" | "ids-only" | "uuid";

/**
 * Options for listReferences operation
 */
export interface ListOptions extends PaginationOptions, SortOptions {
  /** Output format (default: "pretty") */
  format?: ListFormat;
}

/**
 * Result of listReferences operation
 */
export interface ListResult {
  /** Formatted items (strings for most formats, CslItem[] for JSON format) */
  items: string[] | CslItem[];
  /** Total count before pagination */
  total: number;
  /** Applied limit (0 if unlimited) */
  limit: number;
  /** Applied offset */
  offset: number;
  /** Next page offset, null if no more results */
  nextOffset: number | null;
}

/**
 * Format items according to the specified format
 */
function formatItems(items: CslItem[], format: ListFormat): string[] | CslItem[] {
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

    default:
      return items.map((item) => formatPretty([item]));
  }
}

/**
 * List all references from the library with specified format.
 *
 * @param library - The library to list references from
 * @param options - Formatting and pagination options
 * @returns Formatted strings for each reference with pagination metadata
 */
export async function listReferences(library: ILibrary, options: ListOptions): Promise<ListResult> {
  const format = options.format ?? "pretty";
  const sort: SortField = options.sort ?? "updated";
  const order: SortOrder = options.order ?? "desc";
  const limit = options.limit ?? 0;
  const offset = options.offset ?? 0;

  // Get all items
  const allItems = await library.getAll();
  const total = allItems.length;

  // Sort
  const sorted = sortReferences(allItems, sort, order);

  // Paginate
  const { items: paginatedItems, nextOffset } = paginate(sorted, { limit, offset });

  // Format
  const formattedItems = formatItems(paginatedItems, format);

  return {
    items: formattedItems,
    total,
    limit,
    offset,
    nextOffset,
  };
}
