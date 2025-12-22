import { Hono } from "hono";
import type { Library } from "../../core/library.js";
import { removeReference } from "../../features/operations/remove.js";
import { updateReference } from "../../features/operations/update.js";

/**
 * Create references CRUD route with the given library.
 * @param library - Library instance to use for operations
 * @returns Hono app with references routes
 */
export function createReferencesRoute(library: Library) {
  const route = new Hono();

  // GET / - Get all references
  route.get("/", (c) => {
    const references = library.getAll();
    const items = references.map((ref) => ref.getItem());
    return c.json(items);
  });

  // GET /uuid/:uuid - Get reference by UUID
  route.get("/uuid/:uuid", (c) => {
    const uuid = c.req.param("uuid");
    const ref = library.findByUuid(uuid);

    if (!ref) {
      return c.json({ error: "Reference not found" }, 404);
    }

    return c.json(ref.getItem());
  });

  // GET /id/:id - Get reference by citation ID
  route.get("/id/:id", (c) => {
    const id = c.req.param("id");
    const ref = library.findById(id);

    if (!ref) {
      return c.json({ error: "Reference not found" }, 404);
    }

    return c.json(ref.getItem());
  });

  // POST / - Create new reference
  route.post("/", async (c) => {
    try {
      const body = await c.req.json();

      // Create and add reference (library.add handles validation)
      library.add(body);

      // Find the newly added reference by UUID (it was just added)
      const allRefs = library.getAll();
      const addedRef = allRefs[allRefs.length - 1];

      if (!addedRef) {
        return c.json({ error: "Failed to add reference" }, 500);
      }

      return c.json(addedRef.getItem(), 201);
    } catch (error) {
      return c.json(
        {
          error: "Invalid request body",
          details: error instanceof Error ? error.message : String(error),
        },
        400
      );
    }
  });

  // PUT /uuid/:uuid - Update reference by UUID
  route.put("/uuid/:uuid", async (c) => {
    const uuid = c.req.param("uuid");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body must be an object" }, 400);
    }

    // Use updateReference operation
    const result = await updateReference(library, {
      identifier: uuid,
      byUuid: true,
      updates: body as Partial<import("../../core/csl-json/types.js").CslItem>,
      onIdCollision: "suffix",
    });

    // Return operation result with appropriate status code
    if (!result.updated) {
      const status = result.idCollision ? 409 : 404;
      return c.json(result, status);
    }

    return c.json(result);
  });

  // PUT /id/:id - Update reference by citation ID
  route.put("/id/:id", async (c) => {
    const id = c.req.param("id");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body must be an object" }, 400);
    }

    // Use updateReference operation with byUuid: false
    const result = await updateReference(library, {
      identifier: id,
      byUuid: false,
      updates: body as Partial<import("../../core/csl-json/types.js").CslItem>,
      onIdCollision: "suffix",
    });

    // Return operation result with appropriate status code
    if (!result.updated) {
      const status = result.idCollision ? 409 : 404;
      return c.json(result, status);
    }

    return c.json(result);
  });

  // DELETE /uuid/:uuid - Delete reference by UUID
  route.delete("/uuid/:uuid", async (c) => {
    const uuid = c.req.param("uuid");

    // Use removeReference operation
    const result = await removeReference(library, {
      identifier: uuid,
      byUuid: true,
    });

    // Return operation result with appropriate status code
    if (!result.removed) {
      return c.json(result, 404);
    }

    return c.json(result);
  });

  // DELETE /id/:id - Delete reference by citation ID
  route.delete("/id/:id", async (c) => {
    const id = c.req.param("id");

    // Use removeReference operation with byUuid: false
    const result = await removeReference(library, {
      identifier: id,
      byUuid: false,
    });

    // Return operation result with appropriate status code
    if (!result.removed) {
      return c.json(result, 404);
    }

    return c.json(result);
  });

  return route;
}
