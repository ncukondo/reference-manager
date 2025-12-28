import { Hono } from "hono";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import {
  type CiteOperationOptions,
  type CiteResult,
  citeReferences,
} from "../../features/operations/cite.js";

/**
 * Zod schema for cite request body
 */
const CiteRequestSchema = z.object({
  identifiers: z.array(z.string()).min(1, "identifiers must be a non-empty array"),
  idType: z.enum(["id", "uuid", "doi", "pmid", "isbn"]).optional(),
  inText: z.boolean().optional(),
  style: z.string().optional(),
  cslFile: z.string().optional(),
  locale: z.string().optional(),
  format: z.enum(["text", "html"]).optional(),
});

type CiteRequestBody = z.infer<typeof CiteRequestSchema>;

/**
 * Build cite operation options from validated request body.
 */
function buildCiteOptions(body: CiteRequestBody): CiteOperationOptions {
  return {
    identifiers: body.identifiers,
    ...(body.idType !== undefined && { idType: body.idType }),
    ...(body.inText !== undefined && { inText: body.inText }),
    ...(body.style !== undefined && { style: body.style }),
    ...(body.cslFile !== undefined && { cslFile: body.cslFile }),
    ...(body.locale !== undefined && { locale: body.locale }),
    ...(body.format !== undefined && { format: body.format }),
  };
}

/**
 * Create cite route for generating citations.
 * @param library - Library instance to use for operations
 * @returns Hono app with cite route
 */
export function createCiteRoute(library: Library) {
  const route = new Hono();

  // POST / - Generate citations for identifiers
  route.post("/", async (c) => {
    // Parse request body
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Validate with zod schema
    const parseResult = CiteRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message ?? "Invalid request body";
      return c.json({ error: errorMessage }, 400);
    }

    // Call citeReferences operation
    const result: CiteResult = await citeReferences(library, buildCiteOptions(parseResult.data));

    return c.json(result);
  });

  return route;
}
