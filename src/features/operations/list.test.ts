import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type ListOptions, listReferences } from "./list.js";

// Mock Library
vi.mock("../../core/library.js");

describe("listReferences", () => {
  let mockLibrary: Library;
  const mockItems: CslItem[] = [
    {
      id: "ref1",
      type: "article-journal",
      title: "Test Article 1",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: { uuid: "uuid-1" },
    },
    {
      id: "ref2",
      type: "article-journal",
      title: "Test Article 2",
      author: [{ family: "Doe", given: "Jane" }],
      issued: { "date-parts": [[2024]] },
      custom: { uuid: "uuid-2" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      getAll: vi.fn().mockResolvedValue(mockItems),
    } as unknown as Library;
  });

  describe("returns raw CslItem[]", () => {
    it("should return CslItem objects for each reference", async () => {
      const options: ListOptions = {};
      const result = await listReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("ref1");
      expect(result.items[0].type).toBe("article-journal");
      expect(result.items[0].title).toBe("Test Article 1");
      expect(result.items[1].id).toBe("ref2");
      expect(result.items[1].type).toBe("article-journal");
      expect(result.items[1].title).toBe("Test Article 2");
    });
  });

  describe("empty library", () => {
    it("should return empty array when library is empty", async () => {
      (mockLibrary.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const options: ListOptions = {};
      const result = await listReferences(mockLibrary, options);

      expect(result.items).toEqual([]);
    });
  });

  describe("pagination metadata", () => {
    it("should return correct pagination metadata", async () => {
      const options: ListOptions = { limit: 1, offset: 0 };
      const result = await listReferences(mockLibrary, options);

      expect(result.total).toBe(2);
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.items).toHaveLength(1);
      expect(result.nextOffset).toBe(1);
    });
  });

  describe("sorting", () => {
    it("should apply sort options", async () => {
      const options: ListOptions = { sort: "id", order: "asc" };
      const result = await listReferences(mockLibrary, options);

      expect(result.items[0].id).toBe("ref1");
      expect(result.items[1].id).toBe("ref2");
    });
  });
});
