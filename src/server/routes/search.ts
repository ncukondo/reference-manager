import { Hono } from "hono";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { type SearchOperationOptions, searchReferences } from "../../features/operations/search.js";
import { searchSortFieldSchema, sortOrderSchema } from "../../features/pagination/index.js";
import { pickDefined } from "../../utils/object.js";

/**
 * Request body schema for search endpoint
 */
const searchRequestBodySchema = z.object({
  query: z.string(),
  format: z.enum(["pretty", "json", "bibtex", "ids-only", "uuid"]).optional(),
  sort: searchSortFieldSchema.optional(),
  order: sortOrderSchema.optional(),
  limit: z.number().int().min(0).optional(),
  offset: z.number().int().min(0).optional(),
});

/**
 * Request body type for search endpoint
 */
export type SearchRequestBody = z.infer<typeof searchRequestBodySchema>;

/**
 * Creates search route for HTTP server
 */
export function createSearchRoute(library: Library) {
  const route = new Hono();

  // POST / - Search references
  route.post("/", async (c) => {
    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Validate body with zod
    const parseResult = searchRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const requestBody = parseResult.data;

    // Build options for searchReferences
    const options: SearchOperationOptions = {
      query: requestBody.query,
      ...pickDefined(requestBody, ["format", "sort", "order", "limit", "offset"] as const),
    };

    // Call searchReferences operation
    const result = await searchReferences(library, options);

    return c.json(result);
  });

  return route;
}
