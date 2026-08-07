import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { deprecateReference } from "./deprecate.js";

function item(id: string, uuid: string, custom: Record<string, unknown> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    title: id,
    custom: {
      uuid,
      created_at: "2026-01-01T00:00:00.000Z",
      timestamp: "2026-01-01T00:00:00.000Z",
      ...custom,
    },
  };
}

function mark(uuid: string, reason = "duplicate"): Record<string, unknown> {
  return {
    superseded_by: uuid,
    superseded_reason: reason,
    superseded_at: "2026-08-07T00:00:00.000Z",
  };
}

describe("deprecateReference", () => {
  let library: ILibrary;
  let items: CslItem[];

  /** Wire a mock library whose find/getAll/update act on `items`. */
  function useLibrary(initial: CslItem[]): void {
    items = initial;
    library = {
      find: vi.fn(async (identifier: string, options?: { idType?: string }) =>
        options?.idType === "uuid"
          ? items.find((i) => i.custom?.uuid === identifier)
          : items.find((i) => i.id === identifier)
      ),
      getAll: vi.fn(async () => items),
      update: vi.fn(async (id: string, updates: Partial<CslItem>) => {
        const index = items.findIndex((i) => i.id === id);
        if (index === -1) return { updated: false };
        // Mirror Library.buildUpdatedItem: custom is merged, not replaced.
        const updated: CslItem = {
          ...items[index],
          ...updates,
          custom: { ...items[index]?.custom, ...updates.custom },
        } as CslItem;
        items[index] = updated;
        return { updated: true, item: updated };
      }),
      save: vi.fn(async () => undefined),
    } as unknown as ILibrary;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setting a mark", () => {
    beforeEach(() => {
      useLibrary([item("A", "uuid-a"), item("B", "uuid-b")]);
    });

    it("points the reference at its successor's uuid", async () => {
      const result = await deprecateReference(library, {
        identifier: "A",
        target: "B",
        reason: "duplicate",
      });

      expect(result.applied).toBe(true);
      expect(result.item?.custom?.superseded_by).toBe("uuid-b");
      expect(result.item?.custom?.superseded_reason).toBe("duplicate");
      expect(result.target?.id).toBe("B");
      expect(library.save).toHaveBeenCalled();
    });

    it("stamps superseded_at with an ISO timestamp", async () => {
      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.item?.custom?.superseded_at).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it("defaults the reason to other", async () => {
      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.item?.custom?.superseded_reason).toBe("other");
    });

    it("resolves both identifiers as uuids when idType is uuid", async () => {
      const result = await deprecateReference(library, {
        identifier: "uuid-a",
        target: "uuid-b",
        idType: "uuid",
      });

      expect(result.applied).toBe(true);
      expect(result.item?.id).toBe("A");
      expect(result.target?.id).toBe("B");
    });

    it("overwrites an existing mark", async () => {
      useLibrary([item("A", "uuid-a", mark("uuid-b")), item("B", "uuid-b"), item("C", "uuid-c")]);

      const result = await deprecateReference(library, {
        identifier: "A",
        target: "C",
        reason: "published_version",
      });

      expect(result.item?.custom?.superseded_by).toBe("uuid-c");
      expect(result.item?.custom?.superseded_reason).toBe("published_version");
    });

    it("preserves unrelated custom fields", async () => {
      useLibrary([item("A", "uuid-a", { tags: ["keep"] }), item("B", "uuid-b")]);

      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.item?.custom?.tags).toEqual(["keep"]);
      expect(result.item?.custom?.uuid).toBe("uuid-a");
    });
  });

  describe("validation", () => {
    beforeEach(() => {
      useLibrary([item("A", "uuid-a"), item("B", "uuid-b")]);
    });

    it("rejects an unknown reference", async () => {
      const result = await deprecateReference(library, { identifier: "missing", target: "B" });

      expect(result).toEqual({ applied: false, errorType: "not_found" });
      expect(library.save).not.toHaveBeenCalled();
    });

    it("rejects an unknown successor", async () => {
      const result = await deprecateReference(library, { identifier: "A", target: "missing" });

      expect(result.applied).toBe(false);
      expect(result.errorType).toBe("target_not_found");
      expect(library.save).not.toHaveBeenCalled();
    });

    it("rejects a self-reference", async () => {
      const result = await deprecateReference(library, { identifier: "A", target: "A" });

      expect(result.applied).toBe(false);
      expect(result.errorType).toBe("self_reference");
      expect(library.save).not.toHaveBeenCalled();
    });

    it("rejects a successor with no uuid", async () => {
      useLibrary([item("A", "uuid-a"), { id: "B", type: "article-journal" }]);

      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.applied).toBe(false);
      expect(result.errorType).toBe("target_has_no_uuid");
    });

    // B is already superseded by A, so pointing A at B would make the pair unciteable.
    it("rejects a two-record cycle", async () => {
      useLibrary([item("A", "uuid-a"), item("B", "uuid-b", mark("uuid-a"))]);

      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.applied).toBe(false);
      expect(result.errorType).toBe("cycle");
      expect(library.save).not.toHaveBeenCalled();
    });

    it("rejects a longer cycle", async () => {
      useLibrary([
        item("A", "uuid-a"),
        item("B", "uuid-b", mark("uuid-c")),
        item("C", "uuid-c", mark("uuid-a")),
      ]);

      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.applied).toBe(false);
      expect(result.errorType).toBe("cycle");
    });

    it("allows pointing at a record that is itself superseded by an unrelated one", async () => {
      useLibrary([item("A", "uuid-a"), item("B", "uuid-b", mark("uuid-c")), item("C", "uuid-c")]);

      const result = await deprecateReference(library, { identifier: "A", target: "B" });

      expect(result.applied).toBe(true);
      expect(result.item?.custom?.superseded_by).toBe("uuid-b");
    });
  });

  describe("clearing a mark", () => {
    it("removes all three fields", async () => {
      useLibrary([item("A", "uuid-a", mark("uuid-b")), item("B", "uuid-b")]);

      const result = await deprecateReference(library, { identifier: "A", unset: true });

      expect(result.applied).toBe(true);
      expect(result.item?.custom?.superseded_by).toBeUndefined();
      expect(result.item?.custom?.superseded_reason).toBeUndefined();
      expect(result.item?.custom?.superseded_at).toBeUndefined();
      expect(library.save).toHaveBeenCalled();
    });

    it("preserves unrelated custom fields", async () => {
      useLibrary([item("A", "uuid-a", { ...mark("uuid-b"), tags: ["keep"] }), item("B", "uuid-b")]);

      const result = await deprecateReference(library, { identifier: "A", unset: true });

      expect(result.item?.custom?.tags).toEqual(["keep"]);
      expect(result.item?.custom?.uuid).toBe("uuid-a");
    });

    it("is a no-op on an unmarked reference", async () => {
      useLibrary([item("A", "uuid-a")]);

      const result = await deprecateReference(library, { identifier: "A", unset: true });

      expect(result.applied).toBe(false);
      expect(result.noop).toBe(true);
      expect(library.save).not.toHaveBeenCalled();
    });

    it("rejects an unknown reference", async () => {
      useLibrary([item("A", "uuid-a")]);

      const result = await deprecateReference(library, { identifier: "missing", unset: true });

      expect(result.errorType).toBe("not_found");
    });
  });
});
