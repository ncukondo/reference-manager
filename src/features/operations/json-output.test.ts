import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { AddReferencesResult, AddedItem, FailedItem, SkippedItem } from "./add.js";
import { formatAddJsonOutput, formatRemoveJsonOutput } from "./json-output.js";
import type { RemoveResult } from "./remove.js";

describe("JSON output formatters", () => {
  describe("formatAddJsonOutput", () => {
    const createAddedItem = (
      id: string,
      uuid: string,
      title: string,
      options?: { idChanged?: boolean; originalId?: string }
    ): AddedItem => ({
      id,
      uuid,
      title,
      ...(options?.idChanged && { idChanged: true, originalId: options.originalId }),
    });

    const createCslItem = (id: string, uuid: string, title: string): CslItem => ({
      id,
      type: "article",
      title,
      custom: {
        uuid,
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    });

    describe("basic output", () => {
      it("should format empty result", () => {
        const result: AddReferencesResult = {
          added: [],
          failed: [],
          skipped: [],
        };

        const output = formatAddJsonOutput(result, {});

        expect(output).toEqual({
          summary: { total: 0, added: 0, skipped: 0, failed: 0 },
          added: [],
          skipped: [],
          failed: [],
        });
      });

      it("should format result with added items", () => {
        const result: AddReferencesResult = {
          added: [
            createAddedItem("smith-2024", "uuid-1", "Article One"),
            createAddedItem("jones-2024", "uuid-2", "Article Two"),
          ],
          failed: [],
          skipped: [],
        };

        const sources = new Map([
          ["smith-2024", "10.1234/a"],
          ["jones-2024", "12345678"],
        ]);

        const output = formatAddJsonOutput(result, { sources });

        expect(output.summary).toEqual({
          total: 2,
          added: 2,
          skipped: 0,
          failed: 0,
        });
        expect(output.added).toHaveLength(2);
        expect(output.added[0]).toEqual({
          source: "10.1234/a",
          id: "smith-2024",
          uuid: "uuid-1",
          title: "Article One",
        });
      });

      it("should format result with ID collision", () => {
        const result: AddReferencesResult = {
          added: [
            createAddedItem("smith-2024a", "uuid-1", "Article", {
              idChanged: true,
              originalId: "smith-2024",
            }),
          ],
          failed: [],
          skipped: [],
        };

        const output = formatAddJsonOutput(result, {});

        expect(output.added[0]).toMatchObject({
          id: "smith-2024a",
          idChanged: true,
          originalId: "smith-2024",
        });
      });

      it("should format result with skipped items", () => {
        const skipped: SkippedItem[] = [
          { source: "10.1234/existing", existingId: "existing-2024", duplicateType: "doi" },
        ];
        const result: AddReferencesResult = {
          added: [],
          failed: [],
          skipped,
        };

        const output = formatAddJsonOutput(result, {});

        expect(output.summary.skipped).toBe(1);
        expect(output.skipped[0]).toEqual({
          source: "10.1234/existing",
          reason: "duplicate",
          existingId: "existing-2024",
          duplicateType: "doi",
        });
      });

      it("should format result with failed items", () => {
        const failed: FailedItem[] = [
          { source: "99999999", error: "Not found", reason: "not_found" },
        ];
        const result: AddReferencesResult = {
          added: [],
          failed,
          skipped: [],
        };

        const output = formatAddJsonOutput(result, {});

        expect(output.summary.failed).toBe(1);
        expect(output.failed[0]).toEqual({
          source: "99999999",
          reason: "not_found",
          error: "Not found",
        });
      });

      it("should format mixed result", () => {
        const result: AddReferencesResult = {
          added: [createAddedItem("new-2024", "uuid-1", "New Article")],
          failed: [{ source: "bad-pmid", error: "Invalid", reason: "parse_error" }],
          skipped: [{ source: "10.1234/dup", existingId: "dup-2024", duplicateType: "doi" }],
        };

        const output = formatAddJsonOutput(result, {});

        expect(output.summary).toEqual({
          total: 3,
          added: 1,
          skipped: 1,
          failed: 1,
        });
      });
    });

    describe("--full option", () => {
      it("should include item when full=true", () => {
        const item = createCslItem("smith-2024", "uuid-1", "Full Article");
        const result: AddReferencesResult = {
          added: [createAddedItem("smith-2024", "uuid-1", "Full Article")],
          failed: [],
          skipped: [],
        };

        const items = new Map([["smith-2024", item]]);
        const output = formatAddJsonOutput(result, { full: true, items });

        expect(output.added[0].item).toEqual(item);
      });

      it("should not include item when full=false", () => {
        const result: AddReferencesResult = {
          added: [createAddedItem("smith-2024", "uuid-1", "Article")],
          failed: [],
          skipped: [],
        };

        const output = formatAddJsonOutput(result, { full: false });

        expect(output.added[0].item).toBeUndefined();
      });
    });
  });

  describe("formatRemoveJsonOutput", () => {
    const createCslItem = (id: string, uuid: string, title: string): CslItem => ({
      id,
      type: "article",
      title,
      custom: {
        uuid,
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    });

    describe("success case", () => {
      it("should format successful removal", () => {
        const removedItem = createCslItem("smith-2024", "uuid-1", "Removed Article");
        const result: RemoveResult = {
          removed: true,
          removedItem,
        };

        const output = formatRemoveJsonOutput(result, "smith-2024", {});

        expect(output).toEqual({
          success: true,
          id: "smith-2024",
          uuid: "uuid-1",
          title: "Removed Article",
        });
      });

      it("should include item when full=true", () => {
        const removedItem = createCslItem("smith-2024", "uuid-1", "Removed Article");
        const result: RemoveResult = {
          removed: true,
          removedItem,
        };

        const output = formatRemoveJsonOutput(result, "smith-2024", { full: true });

        expect(output.item).toEqual(removedItem);
      });

      it("should not include item when full=false", () => {
        const removedItem = createCslItem("smith-2024", "uuid-1", "Removed Article");
        const result: RemoveResult = {
          removed: true,
          removedItem,
        };

        const output = formatRemoveJsonOutput(result, "smith-2024", { full: false });

        expect(output.item).toBeUndefined();
      });
    });

    describe("failure case", () => {
      it("should format not found error", () => {
        const result: RemoveResult = {
          removed: false,
        };

        const output = formatRemoveJsonOutput(result, "nonexistent", {});

        expect(output).toEqual({
          success: false,
          id: "nonexistent",
          error: "Reference not found: nonexistent",
        });
      });
    });
  });
});
