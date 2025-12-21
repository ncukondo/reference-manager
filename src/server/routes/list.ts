import { Hono } from "hono";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { type ListOptions, listReferences } from "../../features/operations/list.js";

/**
 * Request body schema for list endpoint
 */
const listRequestBodySchema = z.object({
  format: z.enum(["pretty", "json", "bibtex", "ids-only", "uuid"]).optional(),
});

/**
 * Request body type for list endpoint
 */
export type ListRequestBody = z.infer<typeof listRequestBodySchema>;

/**
 * Creates list route for HTTP server
 */
export function createListRoute(library: Library) {
  const route = new Hono();

  // POST / - List all references
  route.post("/", async (c) => {
    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Validate body with zod
    const parseResult = listRequestBodySchema.safeParse(body);
    if (!parseResult.success) {
      return c.json({ error: "Request body must be an object" }, 400);
    }

    const requestBody = parseResult.data;

    // Build options for listReferences
    const options: ListOptions = {};
    if (requestBody.format !== undefined) {
      options.format = requestBody.format;
    }

    // Call listReferences operation
    const result = listReferences(library, options);

    return c.json(result);
  });

  return route;
}
