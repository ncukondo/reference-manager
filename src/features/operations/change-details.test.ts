import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatFieldChange, getChangedFields } from "./change-details.js";

describe("change-details", () => {
  const createItem = (overrides: Partial<CslItem> = {}): CslItem => ({
    id: "smith-2024",
    type: "article",
    title: "Test Title",
    custom: {
      uuid: "test-uuid",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
    ...overrides,
  });

  describe("getChangedFields", () => {
    it("should return empty array for identical items", () => {
      const item = createItem();
      expect(getChangedFields(item, item)).toEqual([]);
    });

    it("should detect title change", () => {
      const oldItem = createItem({ title: "Old Title" });
      const newItem = createItem({ title: "New Title" });
      expect(getChangedFields(oldItem, newItem)).toEqual(["title"]);
    });

    it("should detect multiple field changes", () => {
      const oldItem = createItem({ title: "Old Title", volume: "1" });
      const newItem = createItem({ title: "New Title", volume: "2" });
      const changed = getChangedFields(oldItem, newItem);
      expect(changed).toContain("title");
      expect(changed).toContain("volume");
    });

    it("should detect added field", () => {
      const oldItem = createItem();
      const newItem = createItem({ volume: "1" });
      expect(getChangedFields(oldItem, newItem)).toEqual(["volume"]);
    });

    it("should detect removed field", () => {
      const oldItem = createItem({ volume: "1" });
      const newItem = createItem();
      expect(getChangedFields(oldItem, newItem)).toEqual(["volume"]);
    });

    it("should detect author changes", () => {
      const oldItem = createItem({
        author: [{ family: "Smith", given: "John" }],
      });
      const newItem = createItem({
        author: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Jane" },
        ],
      });
      expect(getChangedFields(oldItem, newItem)).toEqual(["author"]);
    });

    it("should detect ID change", () => {
      const oldItem = createItem({ id: "smith-2024" });
      const newItem = createItem({ id: "jones-2024" });
      expect(getChangedFields(oldItem, newItem)).toEqual(["id"]);
    });

    it("should ignore protected custom fields (uuid, created_at, timestamp)", () => {
      const oldItem = createItem();
      const newItem = createItem({
        custom: {
          uuid: "different-uuid",
          created_at: "2025-01-01T00:00:00.000Z",
          timestamp: "2025-01-01T00:00:00.000Z",
        },
      });
      expect(getChangedFields(oldItem, newItem)).toEqual([]);
    });

    it("should detect custom field changes (non-protected)", () => {
      const oldItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          tags: ["a"],
        },
      });
      const newItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          tags: ["a", "b"],
        },
      });
      expect(getChangedFields(oldItem, newItem)).toEqual(["custom.tags"]);
    });

    it("should detect type change", () => {
      const oldItem = createItem({ type: "article" });
      const newItem = createItem({ type: "book" });
      expect(getChangedFields(oldItem, newItem)).toEqual(["type"]);
    });

    it("should detect fulltext custom field change", () => {
      const oldItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      });
      const newItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          fulltext: { pdf: "path/to/file.pdf" },
        },
      });
      expect(getChangedFields(oldItem, newItem)).toEqual(["custom.fulltext"]);
    });

    it("should ignore attachments custom field", () => {
      const oldItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      });
      const newItem = createItem({
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
          attachments: [{ role: "main", path: "test.pdf" }],
        },
      });
      expect(getChangedFields(oldItem, newItem)).toEqual([]);
    });
  });

  describe("formatFieldChange", () => {
    it("should format string field change", () => {
      const result = formatFieldChange("title", "Old Title", "New Title");
      expect(result).toBe('title: "Old Title" → "New Title"');
    });

    it("should format field addition", () => {
      const result = formatFieldChange("volume", undefined, "42");
      expect(result).toBe('volume: → "42"');
    });

    it("should format field removal", () => {
      const result = formatFieldChange("volume", "42", undefined);
      expect(result).toBe('volume: "42" → (removed)');
    });

    it("should format author array with count change", () => {
      const oldAuthors = [{ family: "Smith", given: "John" }];
      const newAuthors = [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Jane" },
      ];
      const result = formatFieldChange("author", oldAuthors, newAuthors);
      expect(result).toBe("author: +1 entry");
    });

    it("should format author array with count decrease", () => {
      const oldAuthors = [
        { family: "Smith", given: "John" },
        { family: "Doe", given: "Jane" },
      ];
      const newAuthors = [{ family: "Smith", given: "John" }];
      const result = formatFieldChange("author", oldAuthors, newAuthors);
      expect(result).toBe("author: -1 entry");
    });

    it("should format array with same length but different content", () => {
      const oldAuthors = [{ family: "Smith", given: "John" }];
      const newAuthors = [{ family: "Doe", given: "Jane" }];
      const result = formatFieldChange("author", oldAuthors, newAuthors);
      expect(result).toBe("author: modified");
    });

    it("should format keyword array changes", () => {
      const result = formatFieldChange("keyword", ["a"], ["a", "b", "c"]);
      expect(result).toBe("keyword: +2 entries");
    });

    it("should format ID change", () => {
      const result = formatFieldChange("id", "smith-2024", "jones-2024");
      expect(result).toBe('id: "smith-2024" → "jones-2024"');
    });

    it("should truncate long string values", () => {
      const longTitle = "A".repeat(60);
      const result = formatFieldChange("title", "Short", longTitle);
      expect(result).toContain("…");
    });

    it("should format array addition from nothing", () => {
      const result = formatFieldChange("author", undefined, [{ family: "Smith", given: "John" }]);
      expect(result).toBe("author: +1 entry");
    });

    it("should format array removal to nothing", () => {
      const result = formatFieldChange("author", [{ family: "Smith", given: "John" }], undefined);
      expect(result).toBe("author: -1 entry");
    });

    it("should format entries plural correctly", () => {
      const result = formatFieldChange("keyword", ["a"], ["a", "b"]);
      expect(result).toBe("keyword: +1 entry");
    });
  });
});
