import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { UpdateOperationResult } from "../../features/operations/update.js";
import {
  type SetOperation,
  applySetOperations,
  formatUpdateOutput,
  parseSetOption,
} from "./update.js";

describe("update command", () => {
  describe("formatUpdateOutput", () => {
    const createItem = (id: string, title: string): CslItem => ({
      id,
      type: "article",
      title,
      custom: {
        uuid: "test-uuid",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    });

    it("should format successful update with item", () => {
      const result: UpdateOperationResult = {
        updated: true,
        item: createItem("Smith-2020", "Updated Title"),
      };

      const output = formatUpdateOutput(result, "Smith-2020");

      expect(output).toBe("Updated: [Smith-2020] Updated Title");
    });

    it("should format successful update without title", () => {
      const item = createItem("Smith-2020", "");
      item.title = undefined;
      const result: UpdateOperationResult = {
        updated: true,
        item,
      };

      const output = formatUpdateOutput(result, "Smith-2020");

      expect(output).toBe("Updated: [Smith-2020] (no title)");
    });

    it("should format not found result", () => {
      const result: UpdateOperationResult = {
        updated: false,
      };

      const output = formatUpdateOutput(result, "NonExistent");

      expect(output).toBe("Reference not found: NonExistent");
    });

    it("should format ID collision result", () => {
      const result: UpdateOperationResult = {
        updated: false,
        idCollision: true,
      };

      const output = formatUpdateOutput(result, "Smith-2020");

      expect(output).toBe("Update failed: ID collision for Smith-2020");
    });

    it("should format update with ID change", () => {
      const result: UpdateOperationResult = {
        updated: true,
        item: createItem("Smith-2020-1", "Test Title"),
        idChanged: true,
        newId: "Smith-2020-1",
      };

      const output = formatUpdateOutput(result, "Smith-2020");

      expect(output).toBe("Updated: [Smith-2020-1] Test Title\nID changed to: Smith-2020-1");
    });

    it("should format update without item details", () => {
      const result: UpdateOperationResult = {
        updated: true,
      };

      const output = formatUpdateOutput(result, "test-uuid");

      expect(output).toBe("Updated reference: test-uuid");
    });
  });

  describe("parseSetOption", () => {
    it("should parse simple field=value", () => {
      const result = parseSetOption("title=New Title");

      expect(result).toEqual({
        field: "title",
        operator: "=",
        value: "New Title",
      } satisfies SetOperation);
    });

    it("should parse field with empty value (clear)", () => {
      const result = parseSetOption("abstract=");

      expect(result).toEqual({
        field: "abstract",
        operator: "=",
        value: "",
      } satisfies SetOperation);
    });

    it("should parse field+=value (add to array)", () => {
      const result = parseSetOption("custom.tags+=urgent");

      expect(result).toEqual({
        field: "custom.tags",
        operator: "+=",
        value: "urgent",
      } satisfies SetOperation);
    });

    it("should parse field-=value (remove from array)", () => {
      const result = parseSetOption("custom.tags-=done");

      expect(result).toEqual({
        field: "custom.tags",
        operator: "-=",
        value: "done",
      } satisfies SetOperation);
    });

    it("should parse nested field (issued.raw)", () => {
      const result = parseSetOption("issued.raw=2024-03-15");

      expect(result).toEqual({
        field: "issued.raw",
        operator: "=",
        value: "2024-03-15",
      } satisfies SetOperation);
    });

    it("should parse value with equals sign", () => {
      const result = parseSetOption("note=a=b=c");

      expect(result).toEqual({
        field: "note",
        operator: "=",
        value: "a=b=c",
      } satisfies SetOperation);
    });

    it("should throw on invalid syntax (no operator)", () => {
      expect(() => parseSetOption("invalid")).toThrow("Invalid --set syntax");
    });

    it("should throw on empty field name", () => {
      expect(() => parseSetOption("=value")).toThrow("Invalid --set syntax");
    });
  });

  describe("applySetOperations", () => {
    it("should set simple string field (title)", () => {
      const operations: SetOperation[] = [{ field: "title", operator: "=", value: "New Title" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({ title: "New Title" });
    });

    it("should set multiple simple fields", () => {
      const operations: SetOperation[] = [
        { field: "title", operator: "=", value: "New Title" },
        { field: "abstract", operator: "=", value: "New Abstract" },
        { field: "DOI", operator: "=", value: "10.1234/test" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        title: "New Title",
        abstract: "New Abstract",
        DOI: "10.1234/test",
      });
    });

    it("should clear field with empty value", () => {
      const operations: SetOperation[] = [{ field: "abstract", operator: "=", value: "" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({ abstract: undefined });
    });

    it("should replace array field with comma-separated values", () => {
      const operations: SetOperation[] = [
        { field: "custom.tags", operator: "=", value: "tag1,tag2,tag3" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        custom: { tags: ["tag1", "tag2", "tag3"] },
      });
    });

    it("should add to array field with +=", () => {
      const operations: SetOperation[] = [
        { field: "custom.tags", operator: "+=", value: "urgent" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        custom: { tags: { $add: "urgent" } },
      });
    });

    it("should remove from array field with -=", () => {
      const operations: SetOperation[] = [{ field: "custom.tags", operator: "-=", value: "done" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        custom: { tags: { $remove: "done" } },
      });
    });

    it("should parse single author", () => {
      const operations: SetOperation[] = [{ field: "author", operator: "=", value: "Smith, John" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        author: [{ family: "Smith", given: "John" }],
      });
    });

    it("should parse multiple authors separated by semicolon", () => {
      const operations: SetOperation[] = [
        { field: "author", operator: "=", value: "Smith, John; Doe, Jane" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        author: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Jane" },
        ],
      });
    });

    it("should parse author with family name only", () => {
      const operations: SetOperation[] = [
        { field: "author", operator: "=", value: "Organization Name" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        author: [{ family: "Organization Name" }],
      });
    });

    it("should set date with issued.raw", () => {
      const operations: SetOperation[] = [
        { field: "issued.raw", operator: "=", value: "2024-03-15" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        issued: { raw: "2024-03-15" },
      });
    });

    it("should set accessed.raw", () => {
      const operations: SetOperation[] = [
        { field: "accessed.raw", operator: "=", value: "2024-12-01" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({
        accessed: { raw: "2024-12-01" },
      });
    });

    it("should set id (citation key)", () => {
      const operations: SetOperation[] = [{ field: "id", operator: "=", value: "new-key" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({ id: "new-key" });
    });

    it("should set keyword array", () => {
      const operations: SetOperation[] = [
        { field: "keyword", operator: "=", value: "keyword1,keyword2" },
      ];

      const result = applySetOperations(operations);

      expect(result).toEqual({ keyword: ["keyword1", "keyword2"] });
    });

    it("should add to keyword array", () => {
      const operations: SetOperation[] = [{ field: "keyword", operator: "+=", value: "newkw" }];

      const result = applySetOperations(operations);

      expect(result).toEqual({ keyword: { $add: "newkw" } });
    });

    it("should throw on protected field (custom.uuid)", () => {
      const operations: SetOperation[] = [
        { field: "custom.uuid", operator: "=", value: "new-uuid" },
      ];

      expect(() => applySetOperations(operations)).toThrow("Cannot set protected field");
    });

    it("should throw on protected field (custom.created_at)", () => {
      const operations: SetOperation[] = [
        { field: "custom.created_at", operator: "=", value: "2024-01-01" },
      ];

      expect(() => applySetOperations(operations)).toThrow("Cannot set protected field");
    });

    it("should throw on protected field (custom.timestamp)", () => {
      const operations: SetOperation[] = [
        { field: "custom.timestamp", operator: "=", value: "2024-01-01" },
      ];

      expect(() => applySetOperations(operations)).toThrow("Cannot set protected field");
    });

    it("should throw on unsupported field", () => {
      const operations: SetOperation[] = [
        { field: "unsupported_field", operator: "=", value: "value" },
      ];

      expect(() => applySetOperations(operations)).toThrow("Unsupported field");
    });
  });
});
