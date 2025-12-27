import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { Library } from "../../core/library.js";
import { createReferencesRoute } from "./references.js";

describe("References Route", () => {
  let testLibraryPath: string;
  let library: Library;
  let route: ReturnType<typeof createReferencesRoute>;

  beforeEach(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-${Date.now()}.json`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create route with library
    route = createReferencesRoute(library);
  });

  afterEach(async () => {
    // Clean up test library
    try {
      await fs.unlink(testLibraryPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("GET /", () => {
    it("should return empty array for empty library", async () => {
      const req = new Request("http://localhost/");
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it("should return all references", async () => {
      // Add test references
      const ref1Item = {
        type: "article-journal" as const,
        title: "Test Article 1",
        author: [{ family: "Doe", given: "John" }],
      };
      const ref2Item = {
        type: "book" as const,
        title: "Test Book",
        author: [{ family: "Smith", given: "Jane" }],
      };

      await library.add(ref1Item);
      await library.add(ref2Item);

      const req = new Request("http://localhost/");
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as CslItem[];
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe("Test Article 1");
      expect(data[1].title).toBe("Test Book");
    });
  });

  describe("GET /uuid/:uuid", () => {
    it("should return reference by UUID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "Test Article",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the UUID from the added reference
      const addedItem = (await library.getAll())[0];
      const uuid = addedItem.custom?.uuid;

      const req = new Request(`http://localhost/uuid/${uuid}`);
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as CslItem;
      expect(data.title).toBe("Test Article");
      expect(data.custom?.uuid).toBe(uuid);
    });

    it("should return 404 for non-existent UUID", async () => {
      const req = new Request("http://localhost/uuid/00000000-0000-0000-0000-000000000000");
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET /id/:id", () => {
    it("should return reference by citation ID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "Test Article",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the ID from the added reference
      const addedItem = (await library.getAll())[0];
      const id = addedItem.id;

      const req = new Request(`http://localhost/id/${id}`);
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as CslItem;
      expect(data.title).toBe("Test Article");
      expect(data.id).toBe(id);
    });

    it("should return 404 for non-existent ID", async () => {
      const req = new Request("http://localhost/id/non-existent-id");
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("POST /", () => {
    it("should create new reference", async () => {
      const newRef = {
        type: "article-journal" as const,
        title: "New Article",
        author: [{ family: "Johnson", given: "Bob" }],
      };

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRef),
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(201);
      const data = (await res.json()) as CslItem;
      expect(data.title).toBe("New Article");
      expect(data.custom?.uuid).toBeDefined();

      // Verify it was added to library
      const all = await library.getAll();
      expect(all).toHaveLength(1);
    });

    it("should return 400 for invalid data", async () => {
      // Send malformed JSON
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("PUT /uuid/:uuid", () => {
    it("should update existing reference by UUID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "Original Title",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the UUID from the added reference
      const addedItem = (await library.getAll())[0];
      const uuid = addedItem.custom?.uuid;

      const updates = {
        type: "article-journal",
        title: "Updated Title",
        author: [{ family: "Doe", given: "John" }],
        custom: { uuid },
      };

      const req = new Request(`http://localhost/uuid/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { updated: boolean; item?: CslItem };
      expect(data.updated).toBe(true);
      expect(data.item?.title).toBe("Updated Title");

      // Verify it was updated in library
      const found = await library.find(uuid ?? "", { idType: "uuid" });
      expect(found?.title).toBe("Updated Title");
    });

    it("should return 404 for non-existent UUID", async () => {
      const updates = {
        type: "article-journal",
        title: "Updated Title",
      };

      const req = new Request("http://localhost/uuid/00000000-0000-0000-0000-000000000000", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /id/:id", () => {
    it("should update existing reference by citation ID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "Original Title",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the ID from the added reference
      const addedItem = (await library.getAll())[0];
      const id = addedItem.id;

      const updates = {
        title: "Updated Title",
      };

      const req = new Request(`http://localhost/id/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { updated: boolean; item?: CslItem };
      expect(data.updated).toBe(true);
      expect(data.item?.title).toBe("Updated Title");

      // Verify it was updated in library
      const found = await library.find(id);
      expect(found?.title).toBe("Updated Title");
    });

    it("should return 404 for non-existent ID", async () => {
      const updates = {
        title: "Updated Title",
      };

      const req = new Request("http://localhost/id/non-existent-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /uuid/:uuid", () => {
    it("should delete reference by UUID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "To Delete",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the UUID from the added reference
      const addedItem = (await library.getAll())[0];
      const uuid = addedItem.custom?.uuid;

      const req = new Request(`http://localhost/uuid/${uuid}`, {
        method: "DELETE",
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { removed: boolean; removedItem?: CslItem };
      expect(data.removed).toBe(true);
      expect(data.removedItem).toBeDefined();
      expect(data.removedItem?.title).toBe("To Delete");

      // Verify it was removed from library
      const found = await library.find(uuid, { idType: "uuid" });
      expect(found).toBeUndefined();
    });

    it("should return 404 for non-existent UUID", async () => {
      const req = new Request("http://localhost/uuid/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /id/:id", () => {
    it("should delete reference by citation ID", async () => {
      const refItem = {
        type: "article-journal" as const,
        title: "To Delete",
        author: [{ family: "Doe", given: "John" }],
      };

      await library.add(refItem);

      // Get the ID from the added reference
      const addedItem = (await library.getAll())[0];
      const id = addedItem.id;

      const req = new Request(`http://localhost/id/${id}`, {
        method: "DELETE",
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(200);
      const data = (await res.json()) as { removed: boolean; removedItem?: CslItem };
      expect(data.removed).toBe(true);
      expect(data.removedItem).toBeDefined();
      expect(data.removedItem?.title).toBe("To Delete");

      // Verify it was removed from library
      const found = await library.find(id);
      expect(found).toBeUndefined();
    });

    it("should return 404 for non-existent ID", async () => {
      const req = new Request("http://localhost/id/non-existent-id", {
        method: "DELETE",
      });
      const res = await route.fetch(req);

      expect(res.status).toBe(404);
    });
  });
});
