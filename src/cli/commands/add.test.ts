import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { add } from "./add.js";

describe("add command", () => {
  const createItem = (id: string, doi?: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    DOI: doi,
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  it("should add a new reference when no duplicate", async () => {
    const existing: CslItem[] = [];
    const newItem = createItem("Smith-2020", "10.1234/new");

    const result = await add(existing, newItem, { force: false });

    expect(result.added).toBe(true);
    expect(result.item.id).toBe("Smith-2020");
    expect(result.idChanged).toBe(false);
  });

  it("should reject duplicate when force is false", async () => {
    const existing: CslItem[] = [createItem("Smith-2020", "10.1234/existing")];
    const newItem = createItem("Jones-2021", "10.1234/existing");

    const result = await add(existing, newItem, { force: false });

    expect(result.added).toBe(false);
    expect(result.duplicate).toBeDefined();
    expect(result.duplicate?.type).toBe("doi");
  });

  it("should add duplicate when force is true", async () => {
    const existing: CslItem[] = [createItem("Smith-2020", "10.1234/existing")];
    const newItem = createItem("Jones-2021", "10.1234/existing");

    const result = await add(existing, newItem, { force: true });

    expect(result.added).toBe(true);
    expect(result.item.id).toBe("Jones-2021");
  });

  it("should handle ID collision by appending suffix", async () => {
    const existing: CslItem[] = [createItem("Smith-2020", "10.1234/existing")];
    const newItem = createItem("Smith-2020", "10.1234/new");

    const result = await add(existing, newItem, { force: false });

    expect(result.added).toBe(true);
    expect(result.item.id).toBe("Smith-2020a");
    expect(result.idChanged).toBe(true);
    expect(result.originalId).toBe("Smith-2020");
  });

  it("should handle multiple ID collisions", async () => {
    const existing: CslItem[] = [
      createItem("Smith-2020", "10.1234/a"),
      createItem("Smith-2020a", "10.1234/b"),
      createItem("Smith-2020b", "10.1234/c"),
    ];
    const newItem = createItem("Smith-2020", "10.1234/new");

    const result = await add(existing, newItem, { force: false });

    expect(result.added).toBe(true);
    expect(result.item.id).toBe("Smith-2020c");
    expect(result.idChanged).toBe(true);
  });
});
