/**
 * Pagination applier
 */

export interface PaginateOptions {
  limit?: number;
  offset?: number;
}

export interface PaginateResult<T> {
  items: T[];
  nextOffset: number | null;
}

/**
 * Apply pagination to an array of items.
 *
 * @param items - Items to paginate
 * @param options - Pagination options (limit=0 or undefined means unlimited)
 * @returns Paginated items with nextOffset (null if no more items)
 */
export function paginate<T>(items: T[], options: PaginateOptions): PaginateResult<T> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 0;
  const isUnlimited = limit === 0;

  // Apply offset
  const afterOffset = items.slice(offset);

  // Apply limit (0 means unlimited)
  const paginatedItems = isUnlimited ? afterOffset : afterOffset.slice(0, limit);

  // Calculate nextOffset
  let nextOffset: number | null = null;
  if (!isUnlimited && paginatedItems.length > 0) {
    const nextPosition = offset + paginatedItems.length;
    if (nextPosition < items.length) {
      nextOffset = nextPosition;
    }
  }

  return {
    items: paginatedItems,
    nextOffset,
  };
}
