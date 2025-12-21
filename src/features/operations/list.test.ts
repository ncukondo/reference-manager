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
      getAll: vi.fn().mockReturnValue(
        mockItems.map((item) => ({
          getItem: () => item,
        }))
      ),
    } as unknown as Library;
  });

  describe("format: pretty", () => {
    it("should return formatted strings for each reference", () => {
      const options: ListOptions = { format: "pretty" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toContain("[ref1]");
      expect(result.items[0]).toContain("Test Article 1");
      expect(result.items[1]).toContain("[ref2]");
      expect(result.items[1]).toContain("Test Article 2");
    });
  });

  describe("format: json", () => {
    it("should return JSON string for each reference", () => {
      const options: ListOptions = { format: "json" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      // Each item should be valid JSON
      const parsed0 = JSON.parse(result.items[0] as string);
      const parsed1 = JSON.parse(result.items[1] as string);
      expect(parsed0.id).toBe("ref1");
      expect(parsed1.id).toBe("ref2");
    });
  });

  describe("format: bibtex", () => {
    it("should return BibTeX entry for each reference", () => {
      const options: ListOptions = { format: "bibtex" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toContain("@article{ref1,");
      expect(result.items[1]).toContain("@article{ref2,");
    });
  });

  describe("format: ids-only", () => {
    it("should return only IDs", () => {
      const options: ListOptions = { format: "ids-only" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toEqual(["ref1", "ref2"]);
    });
  });

  describe("format: uuid", () => {
    it("should return only UUIDs", () => {
      const options: ListOptions = { format: "uuid" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toEqual(["uuid-1", "uuid-2"]);
    });

    it("should skip items without UUID", () => {
      const itemsWithMissingUuid: CslItem[] = [
        { id: "ref1", type: "article", custom: { uuid: "uuid-1" } },
        { id: "ref2", type: "article" }, // no custom
        { id: "ref3", type: "article", custom: {} }, // no uuid
      ];
      (mockLibrary.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        itemsWithMissingUuid.map((item) => ({ getItem: () => item }))
      );

      const options: ListOptions = { format: "uuid" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toEqual(["uuid-1"]);
    });
  });

  describe("empty library", () => {
    it("should return empty array when library is empty", () => {
      (mockLibrary.getAll as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const options: ListOptions = { format: "pretty" };
      const result = listReferences(mockLibrary, options);

      expect(result.items).toEqual([]);
    });
  });

  describe("default format", () => {
    it("should use pretty format by default", () => {
      const options: ListOptions = {};
      const result = listReferences(mockLibrary, options);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toContain("[ref1]");
    });
  });
});
