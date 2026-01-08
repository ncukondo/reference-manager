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
    it("should find references matching query", async () => {
      const options: SearchOperationOptions = { query: "Smith", format: "pretty" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toContain("[smith-2023]");
    });

    it("should find multiple references matching query", async () => {
      const options: SearchOperationOptions = { query: "Learning", format: "pretty" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
    });

    it("should return empty array when no matches", async () => {
      const options: SearchOperationOptions = { query: "nonexistent", format: "pretty" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toEqual([]);
    });
  });

  describe("format: json", () => {
    it("should return CslItem objects for matching references", async () => {
      const options: SearchOperationOptions = { query: "Smith", format: "json" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      // JSON format returns raw CslItem[], not stringified JSON
      const item = result.items[0] as { id: string };
      expect(item.id).toBe("smith-2023");
    });
  });

  describe("format: bibtex", () => {
    it("should return BibTeX entries for matching references", async () => {
      const options: SearchOperationOptions = { query: "Jones", format: "bibtex" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toContain("@book{jones-2022,");
    });
  });

  describe("format: ids-only", () => {
    it("should return only IDs of matching references", async () => {
      const options: SearchOperationOptions = { query: "Learning", format: "ids-only" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toContain("smith-2023");
      expect(result.items).toContain("doe-2024");
    });
  });

  describe("format: uuid", () => {
    it("should return only UUIDs of matching references", async () => {
      const options: SearchOperationOptions = { query: "Learning", format: "uuid" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toContain("uuid-1");
      expect(result.items).toContain("uuid-2");
    });
  });

  describe("default format", () => {
    it("should use pretty format by default", async () => {
      const options: SearchOperationOptions = { query: "Smith" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toContain("[smith-2023]");
    });
  });

  describe("empty query", () => {
    it("should return all references when query is empty", async () => {
      const options: SearchOperationOptions = { query: "", format: "ids-only" };
      const result = await searchReferences(mockLibrary, options);

      expect(result.items).toHaveLength(3);
    });
  });
});
