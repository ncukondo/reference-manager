import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { type ItemFormat, formatItems } from "./items.js";

describe("formatItems", () => {
  const sampleItem1: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [
      { family: "Smith", given: "John" },
      { family: "Doe", given: "Alice" },
    ],
    issued: { "date-parts": [[2023]] },
    "container-title": "Journal of AI",
    volume: "10",
    issue: "3",
    page: "123-145",
    DOI: "10.1234/example",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const sampleItem2: CslItem = {
    id: "jones-2022",
    type: "book",
    title: "Introduction to Computer Science",
    author: [{ family: "Jones", given: "Bob" }],
    issued: { "date-parts": [[2022]] },
    publisher: "Tech Press",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const itemWithoutUuid: CslItem = {
    id: "no-uuid-item",
    type: "article-journal",
    title: "Item without UUID",
    author: [{ family: "Test", given: "Author" }],
    issued: { "date-parts": [[2024]] },
    custom: {
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("json format", () => {
    it("should return raw CslItem[] unchanged", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "json");
      expect(result).toBe(items);
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "json");
      expect(result).toEqual([]);
    });
  });

  describe("bibtex format", () => {
    it("should format items to bibtex strings", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "bibtex");
      expect(result).toHaveLength(2);
      expect(result[0]).toContain("@article{smith-2023");
      expect(result[1]).toContain("@book{jones-2022");
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "bibtex");
      expect(result).toEqual([]);
    });
  });

  describe("pretty format", () => {
    it("should format items to pretty strings", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "pretty");
      expect(result).toHaveLength(2);
      expect(result[0]).toContain("smith-2023");
      expect(result[0]).toContain("Machine Learning");
      expect(result[1]).toContain("jones-2022");
      expect(result[1]).toContain("Introduction to Computer Science");
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "pretty");
      expect(result).toEqual([]);
    });
  });

  describe("ids-only format", () => {
    it("should extract only ids", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "ids-only");
      expect(result).toEqual(["smith-2023", "jones-2022"]);
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "ids-only");
      expect(result).toEqual([]);
    });
  });

  describe("uuid format", () => {
    it("should extract only uuids from items that have them", () => {
      const items = [sampleItem1, sampleItem2, itemWithoutUuid];
      const result = formatItems(items, "uuid");
      expect(result).toEqual([
        "550e8400-e29b-41d4-a716-446655440001",
        "550e8400-e29b-41d4-a716-446655440002",
      ]);
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "uuid");
      expect(result).toEqual([]);
    });

    it("should return empty array when no items have uuid", () => {
      const result = formatItems([itemWithoutUuid], "uuid");
      expect(result).toEqual([]);
    });
  });

  describe("pandoc-key format", () => {
    it("should format items as pandoc citation keys", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "pandoc-key");
      expect(result).toEqual(["@smith-2023", "@jones-2022"]);
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "pandoc-key");
      expect(result).toEqual([]);
    });
  });

  describe("latex-key format", () => {
    it("should format items as latex cite commands", () => {
      const items = [sampleItem1, sampleItem2];
      const result = formatItems(items, "latex-key");
      expect(result).toEqual(["\\cite{smith-2023}", "\\cite{jones-2022}"]);
    });

    it("should return empty array for empty input", () => {
      const result = formatItems([], "latex-key");
      expect(result).toEqual([]);
    });
  });

  describe("default (unknown format)", () => {
    it("should fall back to pretty format for unknown format", () => {
      const items = [sampleItem1];
      const result = formatItems(items, "unknown" as ItemFormat);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain("smith-2023");
    });
  });
});
