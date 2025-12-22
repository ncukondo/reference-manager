import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { RemoveResult } from "../../features/operations/remove.js";
import { formatRemoveOutput } from "./remove.js";

describe("remove command", () => {
  describe("formatRemoveOutput", () => {
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

    it("should format successful removal with item", () => {
      const result: RemoveResult = {
        removed: true,
        item: createItem("Smith-2020", "Test Article"),
      };

      const output = formatRemoveOutput(result, "Smith-2020");

      expect(output).toBe("Removed: [Smith-2020] Test Article");
    });

    it("should format successful removal without title", () => {
      const item = createItem("Smith-2020", "");
      item.title = undefined;
      const result: RemoveResult = {
        removed: true,
        item,
      };

      const output = formatRemoveOutput(result, "Smith-2020");

      expect(output).toBe("Removed: [Smith-2020] (no title)");
    });

    it("should format not found result", () => {
      const result: RemoveResult = {
        removed: false,
      };

      const output = formatRemoveOutput(result, "NonExistent");

      expect(output).toBe("Reference not found: NonExistent");
    });

    it("should format removal without item details", () => {
      const result: RemoveResult = {
        removed: true,
      };

      const output = formatRemoveOutput(result, "test-uuid");

      expect(output).toBe("Removed reference: test-uuid");
    });
  });
});
