import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { findDuplicates, markGroupDuplicates } from "./duplicates.js";

function item(id: string, overrides: Partial<CslItem> = {}): CslItem {
  const { custom, ...rest } = overrides;
  return {
    id,
    type: "article-journal",
    title: id,
    custom: { uuid: `uuid-${id}`, created_at: "2026-01-01T00:00:00.000Z", ...custom },
    ...rest,
  };
}

describe("findDuplicates", () => {
  function libraryWith(items: CslItem[]): ILibrary {
    return { getAll: vi.fn().mockResolvedValue(items) } as unknown as ILibrary;
  }

  it("reports groups and how many references were examined", async () => {
    const result = await findDuplicates(
      libraryWith([item("A", { DOI: "10.1/x" }), item("B", { DOI: "10.1/x" }), item("C")])
    );

    expect(result.scanned).toBe(3);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.items.map((i) => i.id).sort()).toEqual(["A", "B"]);
  });

  it("reports nothing for a clean library", async () => {
    const result = await findDuplicates(libraryWith([item("A", { DOI: "10.1/x" }), item("B")]));

    expect(result.groups).toEqual([]);
    expect(result.scanned).toBe(2);
  });

  it("passes the key selection through", async () => {
    const library = libraryWith([
      item("A", { DOI: "10.1/x", PMID: "5" }),
      item("B", { PMID: "5" }),
    ]);

    expect((await findDuplicates(library, { by: ["doi"] })).groups).toEqual([]);
    expect((await findDuplicates(library, { by: ["pmid"] })).groups).toHaveLength(1);
  });
});

describe("markGroupDuplicates", () => {
  let library: ILibrary;
  let items: CslItem[];

  function useLibrary(initial: CslItem[]): void {
    items = initial;
    library = {
      find: vi.fn(async (identifier: string) => items.find((i) => i.id === identifier)),
      getAll: vi.fn(async () => items),
      update: vi.fn(async (id: string, updates: Partial<CslItem>) => {
        const index = items.findIndex((i) => i.id === id);
        if (index === -1) return { updated: false };
        const updated = {
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

  it("points every other member at the keeper", async () => {
    const keeper = item("Keep");
    useLibrary([keeper, item("Old1"), item("Old2")]);

    const result = await markGroupDuplicates(library, keeper, [
      items[1] as CslItem,
      items[2] as CslItem,
    ]);

    expect(result.marked).toEqual(["Old1", "Old2"]);
    expect(result.failed).toEqual([]);
    expect(items[1]?.custom?.superseded_by).toBe("uuid-Keep");
    expect(items[2]?.custom?.superseded_by).toBe("uuid-Keep");
  });

  it("defaults the reason to duplicate", async () => {
    const keeper = item("Keep");
    useLibrary([keeper, item("Old")]);

    await markGroupDuplicates(library, keeper, [items[1] as CslItem]);

    expect(items[1]?.custom?.superseded_reason).toBe("duplicate");
  });

  it("records the given reason", async () => {
    const keeper = item("Keep");
    useLibrary([keeper, item("Old")]);

    await markGroupDuplicates(library, keeper, [items[1] as CslItem], "published_version");

    expect(items[1]?.custom?.superseded_reason).toBe("published_version");
  });

  // The caller may pass the whole group rather than the group minus the keeper.
  it("skips the keeper when it appears among the others", async () => {
    const keeper = item("Keep");
    useLibrary([keeper, item("Old")]);

    const result = await markGroupDuplicates(library, keeper, [keeper, items[1] as CslItem]);

    expect(result.marked).toEqual(["Old"]);
    expect(items[0]?.custom?.superseded_by).toBeUndefined();
  });

  // The group came from a scan of a snapshot; the library may have moved on since.
  it("reports a member that could not be marked instead of throwing", async () => {
    const keeper = item("Keep");
    useLibrary([keeper]);

    const result = await markGroupDuplicates(library, keeper, [item("Gone")]);

    expect(result.marked).toEqual([]);
    expect(result.failed).toEqual([{ id: "Gone", error: "not_found" }]);
  });

  // deprecateReference's cycle check still applies — a stale group cannot write a pointer that
  // `ref deprecate` would have refused.
  it("reports a member whose marking would create a cycle", async () => {
    const keeper = item("Keep", { custom: { uuid: "uuid-Keep", superseded_by: "uuid-Old" } });
    const old = item("Old");
    useLibrary([keeper, old]);

    const result = await markGroupDuplicates(library, keeper, [old]);

    expect(result.marked).toEqual([]);
    expect(result.failed).toEqual([{ id: "Old", error: "cycle" }]);
  });
});
