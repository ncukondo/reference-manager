import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import {
  type PaginationOptions,
  type SearchSortField,
  type SortField,
  type SortOrder,
  paginate,
  sortReferences,
} from "../pagination/index.js";
import { search } from "../search/matcher.js";
import { sortResults as sortByRelevance } from "../search/sorter.js";
import { tokenize } from "../search/tokenizer.js";

/**
 * Sort options for search (includes relevance)
 */
export interface SearchSortOptions {
  sort?: SearchSortField;
  order?: SortOrder;
}

/**
 * Options for searchReferences operation
 */
export interface SearchOperationOptions extends PaginationOptions, SearchSortOptions {
  /** Search query string */
  query: string;
}

/**
 * Result of searchReferences operation
 */
export interface SearchResult {
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
 * Search references in the library and return raw CslItem[] results.
 *
 * @param library - The library to search in
 * @param options - Search query and pagination options
 * @returns Raw CslItem[] with pagination metadata
 */
export async function searchReferences(
  library: ILibrary,
  options: SearchOperationOptions
): Promise<SearchResult> {
  const query = options.query;
  const sort: SearchSortField = options.sort ?? "updated";
  const order: SortOrder = options.order ?? "desc";
  const limit = options.limit ?? 0;
  const offset = options.offset ?? 0;

  // Get all references
  const allItems = await library.getAll();

  // Search and get matched items
  let matchedItems: CslItem[];
  if (!query.trim()) {
    matchedItems = allItems;
  } else {
    // Tokenize and search
    const tokens = tokenize(query).tokens;
    const results = search(allItems, tokens);

    // If sorting by relevance, use the search sorter
    if (sort === "relevance") {
      const sorted = sortByRelevance(results);
      matchedItems =
        order === "desc"
          ? sorted.map((r) => r.reference)
          : sorted.map((r) => r.reference).reverse();
    } else {
      matchedItems = results.map((r) => r.reference);
    }
  }

  const total = matchedItems.length;

  // Sort (unless already sorted by relevance)
  let sorted: CslItem[];
  if (sort === "relevance") {
    sorted = matchedItems;
  } else {
    sorted = sortReferences(matchedItems, sort as SortField, order);
  }

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
