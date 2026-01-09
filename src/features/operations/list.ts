import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import {
  type PaginationOptions,
  type SortField,
  type SortOptions,
  type SortOrder,
  paginate,
  sortReferences,
} from "../pagination/index.js";

/**
 * Options for listReferences operation
 */
export interface ListOptions extends PaginationOptions, SortOptions {}

/**
 * Result of listReferences operation
 */
export interface ListResult {
  /** Raw CslItem array */
  items: CslItem[];
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
 * List all references from the library.
 *
 * @param library - The library to list references from
 * @param options - Pagination and sorting options
 * @returns Raw CslItem[] with pagination metadata
 */
export async function listReferences(library: ILibrary, options: ListOptions): Promise<ListResult> {
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

  return {
    items: paginatedItems,
    total,
    limit,
    offset,
    nextOffset,
  };
}
