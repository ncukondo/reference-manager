/**
 * Pagination and sorting type definitions
 */

import { z } from "zod";

/**
 * Sort field for list/search commands
 */
export const sortFieldSchema = z.enum(["created", "updated", "published", "author", "title"]);
export type SortField = z.infer<typeof sortFieldSchema>;

/**
 * Sort field for search command (includes relevance)
 */
export const searchSortFieldSchema = z.enum([
  "created",
  "updated",
  "published",
  "author",
  "title",
  "relevance",
]);
export type SearchSortField = z.infer<typeof searchSortFieldSchema>;

/**
 * Sort order
 */
export const sortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderSchema>;

/**
 * Pagination options
 */
export const paginationOptionsSchema = z.object({
  limit: z.number().int().nonnegative().optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type PaginationOptions = z.infer<typeof paginationOptionsSchema>;

/**
 * Sort options
 */
export const sortOptionsSchema = z.object({
  sort: sortFieldSchema.optional(),
  order: sortOrderSchema.optional(),
});
export type SortOptions<T extends string = SortField> = {
  sort?: T;
  order?: SortOrder;
};

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
}
