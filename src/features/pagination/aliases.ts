/**
 * Sort field alias resolver
 */

import type { SearchSortField } from "./types.js";

const SORT_ALIASES: Record<string, SearchSortField> = {
  pub: "published",
  mod: "updated",
  add: "created",
  rel: "relevance",
};

const VALID_SORT_FIELDS: Set<string> = new Set([
  "created",
  "updated",
  "published",
  "author",
  "title",
  "relevance",
]);

/**
 * Resolves a sort field alias to its full name.
 * Passes through valid sort fields unchanged.
 *
 * @param alias - The alias or sort field name
 * @returns The resolved sort field
 * @throws Error if the alias is unknown
 */
export function resolveSortAlias(alias: string): SearchSortField {
  if (VALID_SORT_FIELDS.has(alias)) {
    return alias as SearchSortField;
  }

  const resolved = SORT_ALIASES[alias];
  if (resolved) {
    return resolved;
  }

  throw new Error(`Unknown sort field: ${alias}`);
}
