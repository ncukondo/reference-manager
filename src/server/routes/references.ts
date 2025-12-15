import { Hono } from "hono";
import type { Library } from "../../core/library.js";

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

  // GET /:uuid - Get reference by UUID
  route.get("/:uuid", (c) => {
    const uuid = c.req.param("uuid");
    const ref = library.findByUuid(uuid);

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

  // PUT /:uuid - Update reference
  route.put("/:uuid", async (c) => {
    const uuid = c.req.param("uuid");

    // Check if reference exists
    const existing = library.findByUuid(uuid);
    if (!existing) {
      return c.json({ error: "Reference not found" }, 404);
    }

    try {
      const body = await c.req.json();

      // Ensure UUID is preserved in the body
      if (!body.custom) {
        body.custom = {};
      }
      body.custom.uuid = uuid;

      // Remove old reference and add updated one
      library.removeByUuid(uuid);
      library.add(body);

      // Find the updated reference
      const updatedRef = library.findByUuid(uuid);
      if (!updatedRef) {
        return c.json({ error: "Failed to update reference" }, 500);
      }

      return c.json(updatedRef.getItem());
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

  // DELETE /:uuid - Delete reference
  route.delete("/:uuid", (c) => {
    const uuid = c.req.param("uuid");

    // Check if reference exists
    const existing = library.findByUuid(uuid);
    if (!existing) {
      return c.json({ error: "Reference not found" }, 404);
    }

    // Remove reference
    library.removeByUuid(uuid);

    return c.body(null, 204);
  });

  return route;
}
