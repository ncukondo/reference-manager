import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { update } from "./update.js";

describe("update command", () => {
  const createItem = (id: string, uuid: string, title: string): CslItem => ({
    id,
    type: "article",
    title,
    custom: {
      uuid,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  it("should update reference by ID", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "uuid-1", "Original Title"),
      createItem("Jones-2021", "uuid-2", "Another Title"),
    ];

    const result = await update(items, "Smith-2020", { title: "Updated Title" }, { byUuid: false });

    expect(result.updated).toBe(true);
    expect(result.item?.title).toBe("Updated Title");
    expect(result.item?.id).toBe("Smith-2020");
  });

  it("should update reference by UUID", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "uuid-1", "Original Title"),
      createItem("Jones-2021", "uuid-2", "Another Title"),
    ];

    const result = await update(items, "uuid-1", { title: "Updated Title" }, { byUuid: true });

    expect(result.updated).toBe(true);
    expect(result.item?.title).toBe("Updated Title");
    expect(result.item?.custom.uuid).toBe("uuid-1");
  });

  it("should perform partial update", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1", "Original Title")];

    const result = await update(
      items,
      "Smith-2020",
      { abstract: "New abstract" },
      { byUuid: false }
    );

    expect(result.updated).toBe(true);
    expect(result.item?.title).toBe("Original Title"); // Unchanged
    expect(result.item?.abstract).toBe("New abstract"); // Updated
  });

  it("should return not found when ID doesn't exist", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1", "Original Title")];

    const result = await update(items, "NonExistent", { title: "Updated" }, { byUuid: false });

    expect(result.updated).toBe(false);
    expect(result.item).toBeUndefined();
  });

  it("should update timestamp automatically", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1", "Original Title")];

    const result = await update(items, "Smith-2020", { title: "Updated" }, { byUuid: false });

    expect(result.updated).toBe(true);
    expect(result.item?.custom.timestamp).not.toBe("2024-01-01T00:00:00.000Z");
  });

  it("should preserve created_at", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "uuid-1", "Original Title")];

    const result = await update(items, "Smith-2020", { title: "Updated" }, { byUuid: false });

    expect(result.updated).toBe(true);
    expect(result.item?.custom.created_at).toBe("2024-01-01T00:00:00.000Z");
  });
});
