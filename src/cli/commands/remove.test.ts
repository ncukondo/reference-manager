import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { remove } from "./remove.js";

describe("remove command", () => {
  const createItem = (id: string, uuid: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  it("should remove reference by ID", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "uuid-1"),
      createItem("Jones-2021", "uuid-2"),
    ];

    const result = await remove(items, "Smith-2020", { byUuid: false });

    expect(result.removed).toBe(true);
    expect(result.item?.id).toBe("Smith-2020");
    expect(result.remaining).toHaveLength(1);
    expect(result.remaining[0].id).toBe("Jones-2021");
  });

  it("should remove reference by UUID", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "uuid-1"),
      createItem("Jones-2021", "uuid-2"),
    ];

    const result = await remove(items, "uuid-1", { byUuid: true });

    expect(result.removed).toBe(true);
    expect(result.item?.custom.uuid).toBe("uuid-1");
    expect(result.remaining).toHaveLength(1);
  });

  it("should return not found when ID doesn't exist", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1")];

    const result = await remove(items, "NonExistent", { byUuid: false });

    expect(result.removed).toBe(false);
    expect(result.item).toBeUndefined();
    expect(result.remaining).toHaveLength(1);
  });

  it("should return not found when UUID doesn't exist", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1")];

    const result = await remove(items, "uuid-nonexistent", { byUuid: true });

    expect(result.removed).toBe(false);
    expect(result.item).toBeUndefined();
  });
});
