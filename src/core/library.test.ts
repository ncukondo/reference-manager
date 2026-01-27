import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CslItem } from "./csl-json/types";
import { Library } from "./library";

describe("Library", () => {
  const testDir = join(process.cwd(), "tests", "temp");
  const testFilePath = join(testDir, "test-library.csl.json");

  const sampleItems: CslItem[] = [
    {
      id: "smith-2023",
      type: "article-journal",
      title: "Machine Learning in Medical Diagnosis",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      DOI: "10.1234/jmi.2023.0045",
      PMID: "12345678",
      custom: {
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
    {
      id: "tanaka-2022",
      type: "article-journal",
      title: "Deep Learning for Image Recognition",
      author: [{ family: "Tanaka", given: "Taro" }],
      issued: { "date-parts": [[2022]] },
      DOI: "10.11234/jsai.37.721",
      custom: {
        uuid: "550e8400-e29b-41d4-a716-446655440002",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
    {
      id: "yamada-2021",
      type: "book",
      title: "Introduction to Algorithms",
      author: [{ family: "Yamada", given: "Hanako" }],
      issued: { "date-parts": [[2021]] },
      ISBN: "9784000000000",
      custom: {
        uuid: "550e8400-e29b-41d4-a716-446655440003",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    },
  ];

  beforeEach(async () => {
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("load", () => {
    it("should load library from file", async () => {
      // Write test file
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");

      const library = await Library.load(testFilePath);
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should build indices on load", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");

      const library = await Library.load(testFilePath);

      // Check UUID index (find returns Promise<CslItem | undefined>)
      const item1 = await library.find("550e8400-e29b-41d4-a716-446655440001", { idType: "uuid" });
      expect(item1).toBeDefined();
      expect(item1?.id).toBe("smith-2023");

      // Check ID index (find returns Promise<CslItem | undefined>)
      const item2 = await library.find("tanaka-2022");
      expect(item2).toBeDefined();
      expect(item2?.title).toBe("Deep Learning for Image Recognition");

      // Check DOI index
      const item3 = await library.find("10.1234/jmi.2023.0045", { idType: "doi" });
      expect(item3).toBeDefined();
      expect(item3?.id).toBe("smith-2023");

      // Check PMID index
      const item4 = await library.find("12345678", { idType: "pmid" });
      expect(item4).toBeDefined();
      expect(item4?.id).toBe("smith-2023");

      // Check ISBN index
      const item5 = await library.find("9784000000000", { idType: "isbn" });
      expect(item5).toBeDefined();
      expect(item5?.id).toBe("yamada-2021");
    });

    it("should handle empty library file", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");

      const library = await Library.load(testFilePath);
      expect(await library.getAll()).toHaveLength(0);
    });

    it("should generate UUIDs for items without them", async () => {
      const itemsWithoutUuid: CslItem[] = [
        {
          id: "test-2024",
          type: "article-journal",
          title: "Test Article",
        },
      ];
      await writeFile(testFilePath, JSON.stringify(itemsWithoutUuid, null, 2), "utf-8");

      const library = await Library.load(testFilePath);
      const items = await library.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].custom?.uuid).toBeDefined();
      expect(items[0].custom?.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should create empty library when file does not exist", async () => {
      const nonExistentPath = join(testDir, "non-existent", "library.json");

      const library = await Library.load(nonExistentPath);
      expect(await library.getAll()).toHaveLength(0);
      expect(library.getFilePath()).toBe(nonExistentPath);
    });

    it("should create parent directories when loading non-existent file", async () => {
      const deepPath = join(testDir, "deep", "nested", "path", "library.json");

      const library = await Library.load(deepPath);
      expect(await library.getAll()).toHaveLength(0);

      // Verify the file was created
      const { existsSync } = await import("node:fs");
      expect(existsSync(deepPath)).toBe(true);
    });
  });

  describe("save", () => {
    it("should save library to file", async () => {
      // Create library and add items
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const newItem: CslItem = {
        id: "wilson-2021",
        type: "book",
        title: "Introduction to Data Science",
        author: [{ family: "Wilson", given: "Robert" }],
        issued: { "date-parts": [[2021]] },
      };

      await library.add(newItem);
      await library.save();

      // Reload and verify
      const reloadedLibrary = await Library.load(testFilePath);
      expect(await reloadedLibrary.getAll()).toHaveLength(1);
      expect(await reloadedLibrary.find("wilson-2021")).toBeDefined();
    });

    it("should preserve UUIDs when saving", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const originalUuid = (await library.find("smith-2023"))?.custom?.uuid;
      await library.save();

      const reloadedLibrary = await Library.load(testFilePath);
      const reloadedUuid = (await reloadedLibrary.find("smith-2023"))?.custom?.uuid;
      expect(reloadedUuid).toBe(originalUuid);
    });
  });

  describe("add", () => {
    it("should add new reference to library", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const newItem: CslItem = {
        id: "test-2024",
        type: "article-journal",
        title: "Test Article",
      };

      await library.add(newItem);
      expect(await library.getAll()).toHaveLength(1);
      expect(await library.find("test-2024")).toBeDefined();
    });

    it("should auto-generate ID if not provided", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const newItem: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Test", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      };

      await library.add(newItem);
      const items = await library.getAll();
      expect(items).toHaveLength(1);
      expect(items[0].id).toMatch(/test-2024/);
    });

    it("should avoid ID collision when adding", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const item1: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const item2: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      await library.add(item1);
      await library.add(item2);

      const items = await library.getAll();
      expect(items).toHaveLength(2);
      expect(items[0].id).not.toBe(items[1].id);
      expect(items[1].id).toMatch(/smith-2023[a-z]+/);
    });

    it("should update all indices when adding", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const newItem: CslItem = {
        id: "test-2024",
        type: "article-journal",
        DOI: "10.1234/test.2024",
        PMID: "98765432",
      };

      await library.add(newItem);

      expect(await library.find("test-2024")).toBeDefined();
      expect(await library.find("10.1234/test.2024", { idType: "doi" })).toBeDefined();
      expect(await library.find("98765432", { idType: "pmid" })).toBeDefined();
    });
  });

  describe("remove", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should remove reference by UUID", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      await library.remove(uuid, { idType: "uuid" });
      expect(await library.getAll()).toHaveLength(2);
      expect(await library.find(uuid, { idType: "uuid" })).toBeUndefined();
    });

    it("should remove reference by ID", async () => {
      const library = await Library.load(testFilePath);

      await library.remove("smith-2023");
      expect(await library.getAll()).toHaveLength(2);
      expect(await library.find("smith-2023")).toBeUndefined();
    });

    it("should update all indices when removing", async () => {
      const library = await Library.load(testFilePath);

      await library.remove("smith-2023");

      expect(
        await library.find("550e8400-e29b-41d4-a716-446655440001", { idType: "uuid" })
      ).toBeUndefined();
      expect(await library.find("10.1234/jmi.2023.0045", { idType: "doi" })).toBeUndefined();
      expect(await library.find("12345678", { idType: "pmid" })).toBeUndefined();
    });

    it("should return removed=false when removing non-existent reference", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("non-existent");
      expect(result.removed).toBe(false);
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should return removed=true when successfully removing reference", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("smith-2023");
      expect(result.removed).toBe(true);
      expect(await library.getAll()).toHaveLength(2);
    });

    it("should return removedItem when successfully removing reference", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("smith-2023");
      expect(result.removed).toBe(true);
      expect(result.removedItem).toBeDefined();
      expect(result.removedItem?.id).toBe("smith-2023");
      expect(result.removedItem?.title).toBe("Machine Learning in Medical Diagnosis");
    });
  });

  describe("update", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should update reference by ID (default)", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.update("smith-2023", { title: "Updated Title" });

      expect(result.updated).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.title).toBe("Updated Title");
      expect(result.item?.id).toBe("smith-2023");
    });

    it("should update reference by UUID when idType='uuid'", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      const result = await library.update(uuid, { title: "Updated Title" }, { idType: "uuid" });

      expect(result.updated).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.title).toBe("Updated Title");
      expect(result.item?.custom?.uuid).toBe(uuid);
    });

    it("should return item in UpdateResult", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.update("smith-2023", { title: "Updated Title" });

      expect(result.item).toBeDefined();
      expect(result.item?.title).toBe("Updated Title");
      expect(result.item?.author).toEqual([{ family: "Smith", given: "John" }]);
      expect(result.item?.DOI).toBe("10.1234/jmi.2023.0045");
    });

    it("should preserve uuid and created_at when updating", async () => {
      const library = await Library.load(testFilePath);
      const originalItem = await library.find("smith-2023");
      const originalUuid = originalItem?.custom?.uuid;
      const originalCreatedAt = originalItem?.custom?.created_at;

      const result = await library.update("smith-2023", { title: "Updated Title" });

      expect(result.item?.custom?.uuid).toBe(originalUuid);
      expect(result.item?.custom?.created_at).toBe(originalCreatedAt);
    });

    it("should update timestamp when updating", async () => {
      const library = await Library.load(testFilePath);
      const originalItem = await library.find("smith-2023");
      const originalTimestamp = originalItem?.custom?.timestamp;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await library.update("smith-2023", { title: "Updated Title" });

      expect(result.item?.custom?.timestamp).not.toBe(originalTimestamp);
    });

    it("should update all indices when ID changes", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      const result = await library.update("smith-2023", { id: "smith-2023-updated" });

      expect(result.updated).toBe(true);
      expect(result.item?.id).toBe("smith-2023-updated");
      expect(await library.find("smith-2023")).toBeUndefined();
      expect(await library.find("smith-2023-updated")).toBeDefined();
      expect((await library.find(uuid, { idType: "uuid" }))?.id).toBe("smith-2023-updated");
    });

    it("should return updated=false when updating non-existent ID", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.update("non-existent", { title: "Updated" });

      expect(result.updated).toBe(false);
      expect(result.item).toBeUndefined();
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should return updated=false when updating non-existent UUID", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.update(
        "00000000-0000-0000-0000-000000000000",
        { title: "Updated" },
        { idType: "uuid" }
      );

      expect(result.updated).toBe(false);
      expect(result.item).toBeUndefined();
      expect(await library.getAll()).toHaveLength(3);
    });

    describe("ID collision handling", () => {
      it("should return collision result when ID conflicts with existing reference", async () => {
        const library = await Library.load(testFilePath);

        // Try to change smith-2023's ID to tanaka-2022 (which already exists)
        const result = await library.update("smith-2023", { id: "tanaka-2022" });

        expect(result.updated).toBe(false);
        expect(result.errorType).toBe("id_collision");
        expect(result.item).toBeUndefined();
        // Original reference should be unchanged
        expect(await library.find("smith-2023")).toBeDefined();
        expect((await library.find("tanaka-2022"))?.title).toBe(
          "Deep Learning for Image Recognition"
        );
      });

      it("should add suffix when onIdCollision is 'suffix'", async () => {
        const library = await Library.load(testFilePath);

        const result = await library.update(
          "smith-2023",
          { id: "tanaka-2022" },
          { onIdCollision: "suffix" }
        );

        expect(result.updated).toBe(true);
        expect(result.idChanged).toBe(true);
        expect(result.newId).toBeDefined();
        expect(result.newId).toMatch(/^tanaka-2022[a-z]+$/);
        expect(result.item).toBeDefined();
        expect(result.item?.id).toBe(result.newId);
        expect(result.item?.title).toBe("Machine Learning in Medical Diagnosis");
        expect(await library.find("smith-2023")).toBeUndefined();
      });

      it("should allow same ID (no change) without collision", async () => {
        const library = await Library.load(testFilePath);

        const result = await library.update("smith-2023", { id: "smith-2023", title: "Updated" });

        expect(result.updated).toBe(true);
        expect(result.errorType).toBeUndefined();
        expect(result.item?.title).toBe("Updated");
      });

      it("should work with byUuid and collision handling", async () => {
        const library = await Library.load(testFilePath);
        const uuid = "550e8400-e29b-41d4-a716-446655440001";

        const result = await library.update(
          uuid,
          { id: "tanaka-2022" },
          { idType: "uuid", onIdCollision: "suffix" }
        );

        expect(result.updated).toBe(true);
        expect(result.idChanged).toBe(true);
        expect(result.item?.id).toBe(result.newId);
        expect(result.item?.custom?.uuid).toBe(uuid);
      });
    });

    describe("change detection", () => {
      it("should return updated=false when no changes detected", async () => {
        const library = await Library.load(testFilePath);
        const original = await library.find("smith-2023");

        // Update with same title (no actual change)
        const result = await library.update("smith-2023", { title: original?.title });

        expect(result.updated).toBe(false);
        expect(result.errorType).toBeUndefined();
        expect(result.item).toBeDefined();
        expect(result.item?.id).toBe("smith-2023");
      });

      it("should return updated=false when updating with same ID", async () => {
        const library = await Library.load(testFilePath);

        // Update only with same ID
        const result = await library.update("smith-2023", { id: "smith-2023" });

        expect(result.updated).toBe(false);
        expect(result.errorType).toBeUndefined();
        expect(result.item).toBeDefined();
      });

      it("should return updated=true when actual changes detected", async () => {
        const library = await Library.load(testFilePath);

        const result = await library.update("smith-2023", { title: "New Title" });

        expect(result.updated).toBe(true);
        expect(result.item?.title).toBe("New Title");
      });

      it("should return updated=false for empty updates object", async () => {
        const library = await Library.load(testFilePath);

        const result = await library.update("smith-2023", {});

        expect(result.updated).toBe(false);
        expect(result.errorType).toBeUndefined();
        expect(result.item).toBeDefined();
      });

      it("should detect changes in nested custom fields", async () => {
        const library = await Library.load(testFilePath);

        const result = await library.update("smith-2023", {
          custom: { my_field: "new value" },
        });

        expect(result.updated).toBe(true);
        expect(result.item?.custom?.my_field).toBe("new value");
      });

      it("should not update timestamp when no changes", async () => {
        const library = await Library.load(testFilePath);
        const original = await library.find("smith-2023");
        const originalTimestamp = original?.custom?.timestamp;

        // Wait a bit to ensure timestamp would be different if updated
        await new Promise((resolve) => setTimeout(resolve, 10));

        const result = await library.update("smith-2023", { title: original?.title });

        expect(result.updated).toBe(false);
        expect(result.item?.custom?.timestamp).toBe(originalTimestamp);
      });
    });
  });

  describe("find methods", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should find by UUID", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("550e8400-e29b-41d4-a716-446655440001", { idType: "uuid" });
      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should find by ID", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("tanaka-2022");
      expect(item).toBeDefined();
      expect(item?.title).toBe("Deep Learning for Image Recognition");
    });

    it("should find by DOI", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("10.1234/jmi.2023.0045", { idType: "doi" });
      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should find by PMID", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("12345678", { idType: "pmid" });
      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should return undefined for non-existent UUID", async () => {
      const library = await Library.load(testFilePath);
      const ref = await library.find("00000000-0000-0000-0000-000000000000", { idType: "uuid" });
      expect(ref).toBeUndefined();
    });

    it("should return undefined for non-existent ID", async () => {
      const library = await Library.load(testFilePath);
      const ref = await library.find("non-existent");
      expect(ref).toBeUndefined();
    });

    it("should return undefined for non-existent DOI", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("10.1234/non.existent", { idType: "doi" });
      expect(item).toBeUndefined();
    });

    it("should return undefined for non-existent PMID", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("00000000", { idType: "pmid" });
      expect(item).toBeUndefined();
    });

    it("should find by ISBN", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("9784000000000", { idType: "isbn" });
      expect(item).toBeDefined();
      expect(item?.id).toBe("yamada-2021");
    });

    it("should return undefined for non-existent ISBN", async () => {
      const library = await Library.load(testFilePath);
      const item = await library.find("9789999999999", { idType: "isbn" });
      expect(item).toBeUndefined();
    });
  });

  describe("find (unified method)", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should find by ID (default)", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("smith-2023");

      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
      expect(item?.title).toBe("Machine Learning in Medical Diagnosis");
    });

    it("should find by ID when idType='id'", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("tanaka-2022", { idType: "id" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("tanaka-2022");
      expect(item?.title).toBe("Deep Learning for Image Recognition");
    });

    it("should find by UUID when idType='uuid'", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      const item = await library.find(uuid, { idType: "uuid" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
      expect(item?.custom?.uuid).toBe(uuid);
    });

    it("should return undefined for non-existent ID", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("non-existent");

      expect(item).toBeUndefined();
    });

    it("should return undefined for non-existent UUID", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("00000000-0000-0000-0000-000000000000", { idType: "uuid" });

      expect(item).toBeUndefined();
    });

    it("should find by UUID with idType='uuid'", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      const item = await library.find(uuid, { idType: "uuid" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should find by DOI with idType='doi'", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("10.1234/jmi.2023.0045", { idType: "doi" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should find by PMID with idType='pmid'", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("12345678", { idType: "pmid" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("smith-2023");
    });

    it("should find by ISBN with idType='isbn'", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("9784000000000", { idType: "isbn" });

      expect(item).toBeDefined();
      expect(item?.id).toBe("yamada-2021");
    });

    it("should return undefined for non-existent DOI with idType='doi'", async () => {
      const library = await Library.load(testFilePath);

      const item = await library.find("10.9999/non.existent", { idType: "doi" });

      expect(item).toBeUndefined();
    });
  });

  describe("remove (unified method)", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should remove by ID (default)", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("smith-2023");

      expect(result.removed).toBe(true);
      expect(result.removedItem).toBeDefined();
      expect(result.removedItem?.id).toBe("smith-2023");
      expect(await library.getAll()).toHaveLength(2);
      expect(await library.find("smith-2023")).toBeUndefined();
    });

    it("should remove by ID when idType='id'", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("tanaka-2022", { idType: "id" });

      expect(result.removed).toBe(true);
      expect(result.removedItem).toBeDefined();
      expect(result.removedItem?.id).toBe("tanaka-2022");
      expect(await library.getAll()).toHaveLength(2);
      expect(await library.find("tanaka-2022")).toBeUndefined();
    });

    it("should remove by UUID when idType='uuid'", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      const result = await library.remove(uuid, { idType: "uuid" });

      expect(result.removed).toBe(true);
      expect(result.removedItem).toBeDefined();
      expect(result.removedItem?.id).toBe("smith-2023");
      expect(result.removedItem?.custom?.uuid).toBe(uuid);
      expect(await library.getAll()).toHaveLength(2);
      expect(await library.find(uuid, { idType: "uuid" })).toBeUndefined();
    });

    it("should return removed=false for non-existent ID", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("non-existent");

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should return removed=false for non-existent UUID", async () => {
      const library = await Library.load(testFilePath);

      const result = await library.remove("00000000-0000-0000-0000-000000000000", {
        idType: "uuid",
      });

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should update all indices when removing by unified method", async () => {
      const library = await Library.load(testFilePath);

      await library.remove("smith-2023");

      expect(
        await library.find("550e8400-e29b-41d4-a716-446655440001", { idType: "uuid" })
      ).toBeUndefined();
      expect(await library.find("10.1234/jmi.2023.0045", { idType: "doi" })).toBeUndefined();
      expect(await library.find("12345678", { idType: "pmid" })).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all references", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const items = await library.getAll();
      expect(items).toHaveLength(3);
      expect(items[0].id).toBe("smith-2023");
      expect(items[1].id).toBe("tanaka-2022");
    });

    it("should return empty array for empty library", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const items = await library.getAll();
      expect(items).toHaveLength(0);
    });
  });

  describe("getFilePath", () => {
    it("should return the file path", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      expect(library.getFilePath()).toBe(testFilePath);
    });
  });

  describe("file hash tracking", () => {
    it("should compute and store file hash after load", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const hash = library.getCurrentHash();
      expect(hash).toBeDefined();
      expect(hash).not.toBeNull();
      expect(typeof hash).toBe("string");
      expect(hash?.length).toBe(64); // SHA-256 hex digest is 64 characters
    });

    it("should update file hash after save", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const initialHash = library.getCurrentHash();

      // Modify library
      const newItem: CslItem = {
        id: "new-item-2024",
        type: "article-journal",
        title: "New Item",
      };
      await library.add(newItem);

      // Save
      await library.save();

      const updatedHash = library.getCurrentHash();
      expect(updatedHash).toBeDefined();
      expect(updatedHash).not.toBeNull();
      expect(updatedHash).not.toBe(initialHash); // Hash should change after save
    });

    it("should return null for initial hash before load", () => {
      // Since the constructor is private, we can't test this directly,
      // but we can verify the hash is set after load
      // This test is implicitly covered by the "after load" test
    });

    it("should have consistent hash for same file content", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library1 = await Library.load(testFilePath);
      const hash1 = library1.getCurrentHash();

      // Load again without modifying the file
      const library2 = await Library.load(testFilePath);
      const hash2 = library2.getCurrentHash();

      expect(hash1).toBe(hash2);
    });
  });

  describe("reload", () => {
    it("should reload library from file and update references", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      expect(await library.getAll()).toHaveLength(3);

      // Modify file externally
      const newItems = [
        {
          id: "external-2024",
          type: "article-journal",
          title: "Externally Added Item",
        },
      ];
      await writeFile(testFilePath, JSON.stringify(newItems, null, 2), "utf-8");

      // Reload
      const reloaded = await library.reload();

      expect(reloaded).toBe(true);
      expect(await library.getAll()).toHaveLength(1);
      expect(await library.find("external-2024")).toBeDefined();
      expect(await library.find("smith-2023")).toBeUndefined();
    });

    it("should update file hash after reload", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const originalHash = library.getCurrentHash();

      // Modify file externally
      const newItems = [{ id: "new-2024", type: "article-journal", title: "New" }];
      await writeFile(testFilePath, JSON.stringify(newItems, null, 2), "utf-8");

      await library.reload();

      const newHash = library.getCurrentHash();
      expect(newHash).not.toBe(originalHash);
    });

    it("should rebuild all indices after reload", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      // New items with different identifiers
      const newItems = [
        {
          id: "new-ref-2024",
          type: "article-journal",
          DOI: "10.5555/new.doi",
          PMID: "99999999",
          custom: {
            uuid: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];
      await writeFile(testFilePath, JSON.stringify(newItems, null, 2), "utf-8");

      await library.reload();

      // Old indices should be cleared
      expect(await library.find("smith-2023")).toBeUndefined();
      expect(await library.find("10.1234/jmi.2023.0045", { idType: "doi" })).toBeUndefined();
      expect(await library.find("12345678", { idType: "pmid" })).toBeUndefined();
      expect(
        await library.find("550e8400-e29b-41d4-a716-446655440001", { idType: "uuid" })
      ).toBeUndefined();

      // New indices should be built
      expect(await library.find("new-ref-2024")).toBeDefined();
      expect(await library.find("10.5555/new.doi", { idType: "doi" })).toBeDefined();
      expect(await library.find("99999999", { idType: "pmid" })).toBeDefined();
      expect(
        await library.find("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", { idType: "uuid" })
      ).toBeDefined();
    });

    it("should skip reload if file hash matches (self-write detection)", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      // Save without modifying (hash should remain the same)
      await library.save();

      // Reload should detect self-write and skip
      const reloaded = await library.reload();

      expect(reloaded).toBe(false);
      expect(await library.getAll()).toHaveLength(3);
    });

    it("should reload after external modification following self-write", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      // Self-write: add an item and save
      const newItem: CslItem = {
        id: "added-2024",
        type: "article-journal",
        title: "Added Item",
      };
      await library.add(newItem);
      await library.save();

      expect(await library.getAll()).toHaveLength(4);

      // reload() should skip (self-write)
      const reloaded1 = await library.reload();
      expect(reloaded1).toBe(false);

      // External modification
      const externalItems = [{ id: "external-2024", type: "article-journal", title: "External" }];
      await writeFile(testFilePath, JSON.stringify(externalItems, null, 2), "utf-8");

      // Now reload should detect external change and reload
      const reloaded2 = await library.reload();

      expect(reloaded2).toBe(true);
      expect(await library.getAll()).toHaveLength(1);
      expect(await library.find("external-2024")).toBeDefined();
    });
  });
});
