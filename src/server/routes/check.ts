import { Hono } from "hono";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { type CheckOperationOptions, checkReferences } from "../../features/operations/check.js";

const CheckRequestSchema = z
  .object({
    identifiers: z.array(z.string()).optional(),
    idType: z.enum(["id", "uuid"]).optional(),
    all: z.boolean().optional(),
    searchQuery: z.string().optional(),
    skipDays: z.number().optional(),
    save: z.boolean().optional(),
    metadata: z.boolean().optional(),
  })
  .refine((data) => data.identifiers?.length || data.all || data.searchQuery, {
    message: "Must provide identifiers, all, or searchQuery",
  });

function buildCheckOptions(data: z.infer<typeof CheckRequestSchema>): CheckOperationOptions {
  const options: CheckOperationOptions = {};
  if (data.identifiers?.length) options.identifiers = data.identifiers;
  if (data.idType) options.idType = data.idType;
  if (data.all) options.all = true;
  if (data.searchQuery) options.searchQuery = data.searchQuery;
  if (data.skipDays !== undefined) options.skipDays = data.skipDays;
  if (data.save !== undefined) options.save = data.save;
  if (data.metadata !== undefined) options.metadata = data.metadata;
  return options;
}

export function createCheckRoute(library: Library): Hono {
  const route = new Hono();

  route.post("/", async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const parseResult = CheckRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues[0]?.message ?? "Invalid request body";
      return c.json({ error: errorMessage }, 400);
    }

    const result = await checkReferences(library, buildCheckOptions(parseResult.data));
    return c.json(result);
  });

  return route;
}
