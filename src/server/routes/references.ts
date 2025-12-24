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

  // GET / - Get all references (getAll now returns Promise<CslItem[]>)
  route.get("/", async (c) => {
    const items = await library.getAll();
    return c.json(items);
  });

  // GET /uuid/:uuid - Get reference by UUID
  route.get("/uuid/:uuid", async (c) => {
    const uuid = c.req.param("uuid");
    const item = await library.find(uuid, { byUuid: true });

    if (!item) {
      return c.json({ error: "Reference not found" }, 404);
    }

    return c.json(item);
  });

  // GET /id/:id - Get reference by citation ID
  route.get("/id/:id", async (c) => {
    const id = c.req.param("id");
    const item = await library.find(id);

    if (!item) {
      return c.json({ error: "Reference not found" }, 404);
    }

    return c.json(item);
  });

  // POST / - Create new reference
  route.post("/", async (c) => {
    try {
      const body = await c.req.json();

      // Create and add reference (library.add handles validation)
      await library.add(body);

      // Find the newly added item (it was just added, so it's the last one)
      const allItems = await library.getAll();
      const addedItem = allItems[allItems.length - 1];

      if (!addedItem) {
        return c.json({ error: "Failed to add reference" }, 500);
      }

      return c.json(addedItem, 201);
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
  // Request body: { updates: Partial<CslItem>, onIdCollision?: "fail" | "suffix" }
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

    const { updates, onIdCollision } = body as {
      updates?: Partial<import("../../core/csl-json/types.js").CslItem>;
      onIdCollision?: "fail" | "suffix";
    };

    if (!updates || typeof updates !== "object") {
      return c.json({ error: "Request body must contain 'updates' object" }, 400);
    }

    // Use updateReference operation
    const result = await updateReference(library, {
      identifier: uuid,
      byUuid: true,
      updates,
      onIdCollision: onIdCollision ?? "suffix",
    });

    // Return operation result with appropriate status code
    if (!result.updated) {
      const status = result.idCollision ? 409 : 404;
      return c.json(result, status);
    }

    return c.json(result);
  });

  // PUT /id/:id - Update reference by citation ID
  // Request body: { updates: Partial<CslItem>, onIdCollision?: "fail" | "suffix" }
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

    const { updates, onIdCollision } = body as {
      updates?: Partial<import("../../core/csl-json/types.js").CslItem>;
      onIdCollision?: "fail" | "suffix";
    };

    if (!updates || typeof updates !== "object") {
      return c.json({ error: "Request body must contain 'updates' object" }, 400);
    }

    // Use updateReference operation with byUuid: false
    const result = await updateReference(library, {
      identifier: id,
      byUuid: false,
      updates,
      onIdCollision: onIdCollision ?? "suffix",
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
