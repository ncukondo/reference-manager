import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { UpdateOperationResult } from "../../features/operations/update.js";
import { type SetOperation, formatUpdateOutput, parseSetOption } from "./update.js";

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
});
