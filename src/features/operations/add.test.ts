import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { addReferences } from "./add.js";

// Mock the importer module
vi.mock("../import/importer.js", () => ({
  importFromInputs: vi.fn(),
}));

import { importFromInputs } from "../import/importer.js";

const mockedImportFromInputs = vi.mocked(importFromInputs);

describe("addReferences", () => {
  let mockLibrary: Library;
  let existingItems: CslItem[];

  const createItem = (
    id: string,
    options?: { doi?: string; title?: string; uuid?: string }
  ): CslItem => {
    // Extract author and year from id (e.g., "Smith-2020" -> author: Smith, year: 2020)
    const match = id.match(/^([A-Za-z]+)-(\d{4})/);
    const authorName = match?.[1] ?? undefined;
    const year = match?.[2] ? Number.parseInt(match[2], 10) : undefined;

    return {
      id,
      type: "article",
      title: options?.title ?? "Test Article",
      DOI: options?.doi,
      ...(authorName && { author: [{ family: authorName }] }),
      ...(year && { issued: { "date-parts": [[year]] } }),
      custom: {
        uuid: options?.uuid ?? `${id}-uuid`,
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    existingItems = [];

    // Create a mock library
    mockLibrary = {
      getAll: vi.fn(() => existingItems),
      add: vi.fn((item: CslItem) => {
        existingItems.push(item);
        return Promise.resolve(item); // Return the added item
      }),
      save: vi.fn(),
    } as unknown as Library;
  });

  describe("basic operations", () => {
    it("should add a single reference successfully", async () => {
      const newItem = createItem("Smith-2020", { doi: "10.1234/new" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/new" }],
      });

      const result = await addReferences(["10.1234/new"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      expect(result.added[0]).toEqual({
        source: "10.1234/new",
        id: "Smith-2020", // Original ID is preserved
        uuid: "Smith-2020-uuid", // UUID from the added item
        title: "Test Article",
      });
      expect(result.failed).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should add multiple references successfully", async () => {
      const item1 = createItem("Smith-2020", { doi: "10.1234/a" });
      const item2 = createItem("Jones-2021", { doi: "10.1234/b" });

      mockedImportFromInputs.mockResolvedValue({
        results: [
          { success: true, item: item1, source: "10.1234/a" },
          { success: true, item: item2, source: "10.1234/b" },
        ],
      });

      const result = await addReferences(["10.1234/a", "10.1234/b"], mockLibrary, {});

      expect(result.added).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it("should return empty result when no inputs provided", async () => {
      mockedImportFromInputs.mockResolvedValue({ results: [] });

      const result = await addReferences([], mockLibrary, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("import failures", () => {
    it("should report failed imports with reason", async () => {
      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: false, error: "Not found", source: "99999999", reason: "not_found" }],
      });

      const result = await addReferences(["99999999"], mockLibrary, {});

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        source: "99999999",
        error: "Not found",
        reason: "not_found",
      });
      expect(result.skipped).toHaveLength(0);
    });

    it("should handle mixed success and failure", async () => {
      const successItem = createItem("Smith-2020", { doi: "10.1234/good" });

      mockedImportFromInputs.mockResolvedValue({
        results: [
          { success: true, item: successItem, source: "10.1234/good" },
          { success: false, error: "Not found", source: "99999999", reason: "not_found" },
        ],
      });

      const result = await addReferences(["10.1234/good", "99999999"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe("not_found");
    });
  });

  describe("duplicate detection", () => {
    it("should skip duplicates when force is false", async () => {
      // Existing item with DOI
      existingItems = [createItem("Existing-2020", { doi: "10.1234/existing" })];

      // New item with same DOI
      const newItem = createItem("New-2021", { doi: "10.1234/existing" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/existing" }],
      });

      const result = await addReferences(["10.1234/existing"], mockLibrary, {
        force: false,
      });

      expect(result.added).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0]).toEqual({
        source: "10.1234/existing",
        existingId: "Existing-2020",
        duplicateType: "doi",
      });
    });

    it("should add duplicates when force is true", async () => {
      existingItems = [createItem("Existing-2020", { doi: "10.1234/existing" })];

      const newItem = createItem("New-2021", { doi: "10.1234/existing" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/existing" }],
      });

      const result = await addReferences(["10.1234/existing"], mockLibrary, {
        force: true,
      });

      expect(result.added).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe("ID collision resolution", () => {
    it("should resolve original ID collision by appending suffix and report change", async () => {
      // Existing item with lowercase ID
      existingItems = [createItem("smith-2020", { doi: "10.1234/a", title: "Article A" })];

      // New item with original ID that collides (case-sensitive match)
      const newItem = createItem("smith-2020", { doi: "10.1234/b", title: "Article B" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/b" }],
      });

      const result = await addReferences(["10.1234/b"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe("smith-2020a");
      // Original ID collision should be reported
      expect(result.added[0].idChanged).toBe(true);
      expect(result.added[0].originalId).toBe("smith-2020");
    });

    it("should handle multiple ID collisions with original ID", async () => {
      existingItems = [
        createItem("smith-2020", { doi: "10.1234/a", title: "Article A" }),
        createItem("smith-2020a", { doi: "10.1234/b", title: "Article B" }),
        createItem("smith-2020b", { doi: "10.1234/c", title: "Article C" }),
      ];

      // New item with original ID that collides
      const newItem = createItem("smith-2020", { doi: "10.1234/d", title: "Article D" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/d" }],
      });

      const result = await addReferences(["10.1234/d"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe("smith-2020c");
      // Original ID collision should be reported
      expect(result.added[0].idChanged).toBe(true);
      expect(result.added[0].originalId).toBe("smith-2020");
    });

    it("should preserve original ID when no collision", async () => {
      const newItem = createItem("my-custom-key", { doi: "10.1234/unique" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/unique" }],
      });

      const result = await addReferences(["10.1234/unique"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      // Original ID should be preserved as-is
      expect(result.added[0].id).toBe("my-custom-key");
      expect(result.added[0].idChanged).toBeUndefined();
      expect(result.added[0].originalId).toBeUndefined();
    });

    it("should NOT report idChanged when generated ID collides (no original ID)", async () => {
      existingItems = [createItem("smith-2020", { doi: "10.1234/a", title: "Article A" })];

      // New item without original ID (empty string)
      const newItem: CslItem = {
        id: "", // No original ID
        type: "article",
        title: "Article B",
        DOI: "10.1234/b",
        author: [{ family: "Smith" }],
        issued: { "date-parts": [[2020]] },
      };

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/b" }],
      });

      const result = await addReferences(["10.1234/b"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      // Generated ID collision - suffix added but NOT reported
      expect(result.added[0].id).toBe("smith-2020a");
      expect(result.added[0].idChanged).toBeUndefined();
      expect(result.added[0].originalId).toBeUndefined();
    });

    it("should generate ID when original ID is undefined", async () => {
      // New item without id property
      const newItem: CslItem = {
        type: "article",
        title: "Test Article",
        DOI: "10.1234/test",
        author: [{ family: "Jones" }],
        issued: { "date-parts": [[2021]] },
      } as CslItem;

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/test" }],
      });

      const result = await addReferences(["10.1234/test"], mockLibrary, {});

      expect(result.added).toHaveLength(1);
      // ID should be generated from author-year
      expect(result.added[0].id).toBe("jones-2021");
      expect(result.added[0].idChanged).toBeUndefined();
      expect(result.added[0].originalId).toBeUndefined();
    });
  });

  describe("library save behavior", () => {
    it("should save library after adding references", async () => {
      const newItem = createItem("Smith-2020");

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "file.json" }],
      });

      await addReferences(["file.json"], mockLibrary, {});

      expect(mockLibrary.save).toHaveBeenCalledTimes(1);
    });

    it("should not save library when nothing was added", async () => {
      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: false, error: "Not found", source: "99999999" }],
      });

      await addReferences(["99999999"], mockLibrary, {});

      expect(mockLibrary.save).not.toHaveBeenCalled();
    });

    it("should not save when all items are skipped as duplicates", async () => {
      existingItems = [createItem("Existing-2020", { doi: "10.1234/existing" })];

      const newItem = createItem("New-2021", { doi: "10.1234/existing" });

      mockedImportFromInputs.mockResolvedValue({
        results: [{ success: true, item: newItem, source: "10.1234/existing" }],
      });

      await addReferences(["10.1234/existing"], mockLibrary, { force: false });

      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("options passing", () => {
    it("should pass format option to importFromInputs", async () => {
      mockedImportFromInputs.mockResolvedValue({ results: [] });

      await addReferences(["input"], mockLibrary, { format: "bibtex" });

      expect(mockedImportFromInputs).toHaveBeenCalledWith(
        ["input"],
        expect.objectContaining({ format: "bibtex" })
      );
    });

    it("should pass pubmedConfig option to importFromInputs", async () => {
      mockedImportFromInputs.mockResolvedValue({ results: [] });

      const pubmedConfig = { email: "test@example.com", apiKey: "key123" };

      await addReferences(["12345678"], mockLibrary, { pubmedConfig });

      expect(mockedImportFromInputs).toHaveBeenCalledWith(
        ["12345678"],
        expect.objectContaining({ pubmedConfig })
      );
    });
  });
});
