import { describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import { addReference } from "./add-reference.js";

function createMockLibrary(): ILibrary & {
  add: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
} {
  return {
    getAll: vi.fn(),
    find: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
  } as unknown as ILibrary & {
    add: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
}

describe("addReference", () => {
  it("should add the item and persist the library", async () => {
    const library = createMockLibrary();
    const input: CslItem = {
      id: "new2025",
      type: "article-journal",
      title: "New Article",
    };
    const saved: CslItem = {
      ...input,
      custom: { uuid: "uuid-1", created_at: "", timestamp: "" },
    };
    library.add.mockResolvedValue(saved);

    const result = await addReference(library, { item: input });

    expect(library.add).toHaveBeenCalledWith(input);
    expect(library.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ added: true, item: saved });
  });

  it("should call library.add before library.save", async () => {
    const library = createMockLibrary();
    const order: string[] = [];
    library.add.mockImplementation(async (item: CslItem) => {
      order.push("add");
      return item;
    });
    library.save.mockImplementation(async () => {
      order.push("save");
    });

    await addReference(library, {
      item: { id: "x", type: "article-journal", title: "t" },
    });

    expect(order).toEqual(["add", "save"]);
  });

  it("should not call save when add throws", async () => {
    const library = createMockLibrary();
    library.add.mockRejectedValue(new Error("invalid item"));

    await expect(
      addReference(library, {
        item: { id: "x", type: "article-journal", title: "t" },
      })
    ).rejects.toThrow("invalid item");

    expect(library.save).not.toHaveBeenCalled();
  });
});
