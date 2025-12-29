/**
 * Reference sorter
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type { SortField, SortOrder } from "./types.js";

/**
 * Extract created_at timestamp from item, returns epoch (0) if missing
 */
function getCreatedAt(item: CslItem): number {
  const createdAt = item.custom?.created_at;
  if (!createdAt) return 0;
  return new Date(createdAt).getTime();
}

/**
 * Extract updated timestamp from item, falls back to created_at
 */
function getUpdatedAt(item: CslItem): number {
  const timestamp = item.custom?.timestamp;
  if (timestamp) return new Date(timestamp).getTime();
  return getCreatedAt(item);
}

/**
 * Extract published date as comparable number
 * Returns 0 (epoch) if missing
 */
function getPublishedDate(item: CslItem): number {
  const dateParts = item.issued?.["date-parts"]?.[0];
  if (!dateParts || dateParts.length === 0) return 0;

  const year = dateParts[0] ?? 0;
  const month = dateParts[1] ?? 1;
  const day = dateParts[2] ?? 1;

  return new Date(year, month - 1, day).getTime();
}

/**
 * Extract first author's sortable name
 * Returns "Anonymous" if no author
 */
function getAuthorName(item: CslItem): string {
  const firstAuthor = item.author?.[0];
  if (!firstAuthor) return "Anonymous";

  return firstAuthor.family ?? firstAuthor.literal ?? "Anonymous";
}

/**
 * Extract title, returns empty string if missing
 */
function getTitle(item: CslItem): string {
  return item.title ?? "";
}

/**
 * Get sort value for a given field
 */
function getSortValue(item: CslItem, field: SortField): number | string {
  switch (field) {
    case "created":
      return getCreatedAt(item);
    case "updated":
      return getUpdatedAt(item);
    case "published":
      return getPublishedDate(item);
    case "author":
      return getAuthorName(item).toLowerCase();
    case "title":
      return getTitle(item).toLowerCase();
  }
}

/**
 * Compare function for sorting
 */
function compareValues(a: number | string, b: number | string, order: SortOrder): number {
  const multiplier = order === "desc" ? -1 : 1;

  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * multiplier;
  }

  const strA = String(a);
  const strB = String(b);
  return strA.localeCompare(strB) * multiplier;
}

/**
 * Sort references by the specified field and order.
 * Uses secondary sort: created (desc), then id (asc) for stability.
 *
 * @param items - References to sort
 * @param sort - Sort field
 * @param order - Sort order
 * @returns Sorted references (new array, does not mutate input)
 */
export function sortReferences(items: CslItem[], sort: SortField, order: SortOrder): CslItem[] {
  return [...items].sort((a, b) => {
    // Primary sort
    const aValue = getSortValue(a, sort);
    const bValue = getSortValue(b, sort);
    const primaryCompare = compareValues(aValue, bValue, order);

    if (primaryCompare !== 0) return primaryCompare;

    // Secondary sort: created (desc)
    const aCreated = getCreatedAt(a);
    const bCreated = getCreatedAt(b);
    const createdCompare = bCreated - aCreated; // desc

    if (createdCompare !== 0) return createdCompare;

    // Tertiary sort: id (asc) for stability
    return a.id.localeCompare(b.id);
  });
}
