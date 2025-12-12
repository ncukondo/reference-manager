import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Library } from "./library";
import type { CslItem } from "./csl-json/types";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
      custom: "reference_manager_uuid=550e8400-e29b-41d4-a716-446655440001",
    },
    {
      id: "tanaka-2022",
      type: "article-journal",
      title: "Deep Learning for Image Recognition",
      author: [{ family: "Tanaka", given: "Taro" }],
      issued: { "date-parts": [[2022]] },
      DOI: "10.11234/jsai.37.721",
      custom: "reference_manager_uuid=550e8400-e29b-41d4-a716-446655440002",
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
      expect(library.getAll()).toHaveLength(2);
    });

    it("should build indices on load", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");

      const library = await Library.load(testFilePath);

      // Check UUID index
      const ref1 = library.findByUuid("550e8400-e29b-41d4-a716-446655440001");
      expect(ref1).toBeDefined();
      expect(ref1?.getId()).toBe("smith-2023");

      // Check ID index
      const ref2 = library.findById("tanaka-2022");
      expect(ref2).toBeDefined();
      expect(ref2?.getTitle()).toBe("Deep Learning for Image Recognition");

      // Check DOI index
      const ref3 = library.findByDoi("10.1234/jmi.2023.0045");
      expect(ref3).toBeDefined();
      expect(ref3?.getId()).toBe("smith-2023");

      // Check PMID index
      const ref4 = library.findByPmid("12345678");
      expect(ref4).toBeDefined();
      expect(ref4?.getId()).toBe("smith-2023");
    });

    it("should handle empty library file", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");

      const library = await Library.load(testFilePath);
      expect(library.getAll()).toHaveLength(0);
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
      const refs = library.getAll();
      expect(refs).toHaveLength(1);
      expect(refs[0].getUuid()).toBeDefined();
      expect(refs[0].getUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
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

      library.add(newItem);
      await library.save();

      // Reload and verify
      const reloadedLibrary = await Library.load(testFilePath);
      expect(reloadedLibrary.getAll()).toHaveLength(1);
      expect(reloadedLibrary.findById("wilson-2021")).toBeDefined();
    });

    it("should preserve UUIDs when saving", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const originalUuid = library.findById("smith-2023")?.getUuid();
      await library.save();

      const reloadedLibrary = await Library.load(testFilePath);
      const reloadedUuid = reloadedLibrary.findById("smith-2023")?.getUuid();
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

      library.add(newItem);
      expect(library.getAll()).toHaveLength(1);
      expect(library.findById("test-2024")).toBeDefined();
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

      library.add(newItem);
      const refs = library.getAll();
      expect(refs).toHaveLength(1);
      expect(refs[0].getId()).toMatch(/test-2024/);
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

      library.add(item1);
      library.add(item2);

      const refs = library.getAll();
      expect(refs).toHaveLength(2);
      expect(refs[0].getId()).not.toBe(refs[1].getId());
      expect(refs[1].getId()).toMatch(/smith-2023[a-z]+/);
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

      library.add(newItem);

      expect(library.findById("test-2024")).toBeDefined();
      expect(library.findByDoi("10.1234/test.2024")).toBeDefined();
      expect(library.findByPmid("98765432")).toBeDefined();
    });
  });

  describe("remove", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should remove reference by UUID", async () => {
      const library = await Library.load(testFilePath);
      const uuid = "550e8400-e29b-41d4-a716-446655440001";

      library.removeByUuid(uuid);
      expect(library.getAll()).toHaveLength(1);
      expect(library.findByUuid(uuid)).toBeUndefined();
    });

    it("should remove reference by ID", async () => {
      const library = await Library.load(testFilePath);

      library.removeById("smith-2023");
      expect(library.getAll()).toHaveLength(1);
      expect(library.findById("smith-2023")).toBeUndefined();
    });

    it("should update all indices when removing", async () => {
      const library = await Library.load(testFilePath);

      library.removeById("smith-2023");

      expect(library.findByUuid("550e8400-e29b-41d4-a716-446655440001")).toBeUndefined();
      expect(library.findByDoi("10.1234/jmi.2023.0045")).toBeUndefined();
      expect(library.findByPmid("12345678")).toBeUndefined();
    });

    it("should return false when removing non-existent reference", async () => {
      const library = await Library.load(testFilePath);

      const result = library.removeById("non-existent");
      expect(result).toBe(false);
      expect(library.getAll()).toHaveLength(2);
    });

    it("should return true when successfully removing reference", async () => {
      const library = await Library.load(testFilePath);

      const result = library.removeById("smith-2023");
      expect(result).toBe(true);
      expect(library.getAll()).toHaveLength(1);
    });
  });

  describe("find methods", () => {
    beforeEach(async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
    });

    it("should find by UUID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByUuid("550e8400-e29b-41d4-a716-446655440001");
      expect(ref).toBeDefined();
      expect(ref?.getId()).toBe("smith-2023");
    });

    it("should find by ID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findById("tanaka-2022");
      expect(ref).toBeDefined();
      expect(ref?.getTitle()).toBe("Deep Learning for Image Recognition");
    });

    it("should find by DOI", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByDoi("10.1234/jmi.2023.0045");
      expect(ref).toBeDefined();
      expect(ref?.getId()).toBe("smith-2023");
    });

    it("should find by PMID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByPmid("12345678");
      expect(ref).toBeDefined();
      expect(ref?.getId()).toBe("smith-2023");
    });

    it("should return undefined for non-existent UUID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByUuid("00000000-0000-0000-0000-000000000000");
      expect(ref).toBeUndefined();
    });

    it("should return undefined for non-existent ID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findById("non-existent");
      expect(ref).toBeUndefined();
    });

    it("should return undefined for non-existent DOI", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByDoi("10.1234/non.existent");
      expect(ref).toBeUndefined();
    });

    it("should return undefined for non-existent PMID", async () => {
      const library = await Library.load(testFilePath);
      const ref = library.findByPmid("00000000");
      expect(ref).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all references", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const refs = library.getAll();
      expect(refs).toHaveLength(2);
      expect(refs[0].getId()).toBe("smith-2023");
      expect(refs[1].getId()).toBe("tanaka-2022");
    });

    it("should return empty array for empty library", async () => {
      await writeFile(testFilePath, JSON.stringify([], null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      const refs = library.getAll();
      expect(refs).toHaveLength(0);
    });
  });

  describe("getFilePath", () => {
    it("should return the file path", async () => {
      await writeFile(testFilePath, JSON.stringify(sampleItems, null, 2), "utf-8");
      const library = await Library.load(testFilePath);

      expect(library.getFilePath()).toBe(testFilePath);
    });
  });
});