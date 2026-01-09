import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type SearchOperationOptions, searchReferences } from "./search.js";

// Mock Library
vi.mock("../../core/library.js");

describe("searchReferences", () => {
  let mockLibrary: Library;
  const mockItems: CslItem[] = [
    {
      id: "smith-2023",
      type: "article-journal",
      title: "Machine Learning in Medical Diagnosis",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: { uuid: "uuid-1" },
    },
    {
      id: "doe-2024",
      type: "article-journal",
      title: "Deep Learning Applications",
      author: [{ family: "Doe", given: "Jane" }],
      issued: { "date-parts": [[2024]] },
      custom: { uuid: "uuid-2" },
    },
    {
      id: "jones-2022",
      type: "book",
      title: "Introduction to Computer Science",
      author: [{ family: "Jones", given: "Bob" }],
      issued: { "date-parts": [[2022]] },
      custom: { uuid: "uuid-3" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      getAll: vi.fn().mockResolvedValue(mockItems),
    } as unknown as Library;
  });

  describe("basic search", () => {
    it("should find references matching query and return CslItem[]", async () => {
      const options: SearchOperationOptions = { query: "Smith" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("smith-2023");
    });

    it("should find multiple references matching query", async () => {
      const options: SearchOperationOptions = { query: "Learning" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      expect(result.items.map((item) => item.id)).toContain("smith-2023");
      expect(result.items.map((item) => item.id)).toContain("doe-2024");
    });

    it("should return empty array when no matches", async () => {
      const options: SearchOperationOptions = { query: "nonexistent" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toEqual([]);
    });
  });

  describe("returns raw CslItem[]", () => {
    it("should always return CslItem objects, not formatted strings", async () => {
      const options: SearchOperationOptions = { query: "Smith" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.id).toBe("smith-2023");
      expect(item.type).toBe("article-journal");
      expect(item.title).toBe("Machine Learning in Medical Diagnosis");
    });
  });

  describe("empty query", () => {
    it("should return all references when query is empty", async () => {
      const options: SearchOperationOptions = { query: "" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(3);
      expect(result.items.map((item) => item.id)).toContain("smith-2023");
      expect(result.items.map((item) => item.id)).toContain("doe-2024");
      expect(result.items.map((item) => item.id)).toContain("jones-2022");
    });
  });

  describe("pagination metadata", () => {
    it("should return correct pagination metadata", async () => {
      const options: SearchOperationOptions = { query: "", limit: 2, offset: 0 };
      const result = await searchReferences(mockLibrary, options);

      expect(result.total).toBe(3);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
      expect(result.items).toHaveLength(2);
      expect(result.nextOffset).toBe(2);
    });
  });
});
