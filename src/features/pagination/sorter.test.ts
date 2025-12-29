/**
 * Tests for reference sorter
 */

import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { sortReferences } from "./sorter.js";

function createItem(overrides: Partial<CslItem> & { id: string }): CslItem {
  return {
    type: "article-journal",
    ...overrides,
  };
}

describe("sortReferences", () => {
  describe("sort by created", () => {
    it("should sort by custom.created_at descending", () => {
      const items: CslItem[] = [
        createItem({
          id: "a",
          custom: { uuid: "1", created_at: "2024-01-01", timestamp: "2024-01-01" },
        }),
        createItem({
          id: "b",
          custom: { uuid: "2", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
        createItem({
          id: "c",
          custom: { uuid: "3", created_at: "2024-02-01", timestamp: "2024-02-01" },
        }),
      ];

      const result = sortReferences(items, "created", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    });

    it("should sort by custom.created_at ascending", () => {
      const items: CslItem[] = [
        createItem({
          id: "a",
          custom: { uuid: "1", created_at: "2024-01-01", timestamp: "2024-01-01" },
        }),
        createItem({
          id: "b",
          custom: { uuid: "2", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
        createItem({
          id: "c",
          custom: { uuid: "3", created_at: "2024-02-01", timestamp: "2024-02-01" },
        }),
      ];

      const result = sortReferences(items, "created", "asc");
      expect(result.map((r) => r.id)).toEqual(["a", "c", "b"]);
    });

    it("should sort items without created_at to the end in desc order", () => {
      const items: CslItem[] = [
        createItem({ id: "a" }),
        createItem({
          id: "b",
          custom: { uuid: "2", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
      ];

      const result = sortReferences(items, "created", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "a"]);
    });
  });

  describe("sort by updated", () => {
    it("should sort by custom.timestamp descending", () => {
      const items: CslItem[] = [
        createItem({
          id: "a",
          custom: { uuid: "1", created_at: "2024-01-01", timestamp: "2024-01-10" },
        }),
        createItem({
          id: "b",
          custom: { uuid: "2", created_at: "2024-01-01", timestamp: "2024-03-10" },
        }),
        createItem({
          id: "c",
          custom: { uuid: "3", created_at: "2024-01-01", timestamp: "2024-02-10" },
        }),
      ];

      const result = sortReferences(items, "updated", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    });

    it("should fall back to created_at when timestamp is missing", () => {
      const items: CslItem[] = [
        createItem({
          id: "a",
          custom: { uuid: "1", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
        createItem({
          id: "b",
          custom: { uuid: "2", created_at: "2024-01-01", timestamp: "2024-01-01" },
        }),
      ];

      const result = sortReferences(items, "updated", "desc");
      expect(result.map((r) => r.id)).toEqual(["a", "b"]);
    });
  });

  describe("sort by published", () => {
    it("should sort by issued.date-parts descending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", issued: { "date-parts": [[2020, 1]] } }),
        createItem({ id: "b", issued: { "date-parts": [[2024, 6]] } }),
        createItem({ id: "c", issued: { "date-parts": [[2022, 3]] } }),
      ];

      const result = sortReferences(items, "published", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    });

    it("should sort by issued.date-parts ascending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", issued: { "date-parts": [[2020, 1]] } }),
        createItem({ id: "b", issued: { "date-parts": [[2024, 6]] } }),
        createItem({ id: "c", issued: { "date-parts": [[2022, 3]] } }),
      ];

      const result = sortReferences(items, "published", "asc");
      expect(result.map((r) => r.id)).toEqual(["a", "c", "b"]);
    });

    it("should sort items without issued to the end", () => {
      const items: CslItem[] = [
        createItem({ id: "a" }),
        createItem({ id: "b", issued: { "date-parts": [[2024, 6]] } }),
      ];

      const result = sortReferences(items, "published", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "a"]);
    });

    it("should handle year-only dates", () => {
      const items: CslItem[] = [
        createItem({ id: "a", issued: { "date-parts": [[2020]] } }),
        createItem({ id: "b", issued: { "date-parts": [[2024]] } }),
      ];

      const result = sortReferences(items, "published", "desc");
      expect(result.map((r) => r.id)).toEqual(["b", "a"]);
    });
  });

  describe("sort by author", () => {
    it("should sort by first author family name ascending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", author: [{ family: "Zimmerman" }] }),
        createItem({ id: "b", author: [{ family: "Adams" }] }),
        createItem({ id: "c", author: [{ family: "Miller" }] }),
      ];

      const result = sortReferences(items, "author", "asc");
      expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    });

    it("should sort by first author family name descending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", author: [{ family: "Zimmerman" }] }),
        createItem({ id: "b", author: [{ family: "Adams" }] }),
        createItem({ id: "c", author: [{ family: "Miller" }] }),
      ];

      const result = sortReferences(items, "author", "desc");
      expect(result.map((r) => r.id)).toEqual(["a", "c", "b"]);
    });

    it("should use 'Anonymous' for items without author", () => {
      const items: CslItem[] = [
        createItem({ id: "a" }),
        createItem({ id: "b", author: [{ family: "Adams" }] }),
        createItem({ id: "c", author: [{ family: "Zimmerman" }] }),
      ];

      const result = sortReferences(items, "author", "asc");
      // "Adams" < "Anonymous" < "Zimmerman"
      expect(result.map((r) => r.id)).toEqual(["b", "a", "c"]);
    });

    it("should handle literal author names", () => {
      const items: CslItem[] = [
        createItem({ id: "a", author: [{ literal: "World Health Organization" }] }),
        createItem({ id: "b", author: [{ family: "Adams" }] }),
      ];

      const result = sortReferences(items, "author", "asc");
      expect(result.map((r) => r.id)).toEqual(["b", "a"]);
    });
  });

  describe("sort by title", () => {
    it("should sort by title ascending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", title: "Zebra study" }),
        createItem({ id: "b", title: "Alpha research" }),
        createItem({ id: "c", title: "Beta analysis" }),
      ];

      const result = sortReferences(items, "title", "asc");
      expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
    });

    it("should sort by title descending", () => {
      const items: CslItem[] = [
        createItem({ id: "a", title: "Zebra study" }),
        createItem({ id: "b", title: "Alpha research" }),
        createItem({ id: "c", title: "Beta analysis" }),
      ];

      const result = sortReferences(items, "title", "desc");
      expect(result.map((r) => r.id)).toEqual(["a", "c", "b"]);
    });

    it("should use empty string for items without title", () => {
      const items: CslItem[] = [createItem({ id: "a" }), createItem({ id: "b", title: "Alpha" })];

      const result = sortReferences(items, "title", "asc");
      expect(result.map((r) => r.id)).toEqual(["a", "b"]);
    });
  });

  describe("secondary sort", () => {
    it("should use created (desc) then id (asc) for stability when primary values are equal", () => {
      const items: CslItem[] = [
        createItem({
          id: "c",
          title: "Same",
          custom: { uuid: "1", created_at: "2024-01-01", timestamp: "2024-01-01" },
        }),
        createItem({
          id: "a",
          title: "Same",
          custom: { uuid: "2", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
        createItem({
          id: "b",
          title: "Same",
          custom: { uuid: "3", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
      ];

      const result = sortReferences(items, "title", "asc");
      // Same title -> sort by created desc (a, b have same created) -> sort by id asc
      expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
    });
  });

  describe("empty input", () => {
    it("should return empty array for empty input", () => {
      expect(sortReferences([], "updated", "desc")).toEqual([]);
    });
  });

  describe("immutability", () => {
    it("should not mutate the original array", () => {
      const items: CslItem[] = [
        createItem({
          id: "b",
          custom: { uuid: "1", created_at: "2024-03-01", timestamp: "2024-03-01" },
        }),
        createItem({
          id: "a",
          custom: { uuid: "2", created_at: "2024-01-01", timestamp: "2024-01-01" },
        }),
      ];
      const originalOrder = items.map((r) => r.id);

      sortReferences(items, "created", "asc");

      expect(items.map((r) => r.id)).toEqual(originalOrder);
    });
  });
});
