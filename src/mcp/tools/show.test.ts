import { describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { createShowToolHandler } from "./show.js";

function makeItem(id: string, overrides: Partial<CslItem> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    ...overrides,
  };
}

function createMockLibrary(items: CslItem[]): ILibraryOperations {
  return {
    find: vi.fn(async (identifier: string, options?: { idType?: string }) => {
      if (options?.idType === "uuid") {
        return items.find((i) => i.custom?.uuid === identifier);
      }
      return items.find((i) => i.id === identifier);
    }),
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    search: vi.fn(),
    list: vi.fn(),
    cite: vi.fn(),
    import: vi.fn(),
    check: vi.fn(),
    attachAdd: vi.fn(),
    attachList: vi.fn(),
    attachGet: vi.fn(),
    attachDetach: vi.fn(),
    attachSync: vi.fn(),
    attachOpen: vi.fn(),
  } as unknown as ILibraryOperations;
}

describe("show MCP tool", () => {
  it("returns normalized JSON for identifier lookup", async () => {
    const items = [
      makeItem("smith2023", {
        title: "Test Title",
        DOI: "10.1000/test",
        custom: { uuid: "abc-123" },
      }),
    ];
    const library = createMockLibrary(items);
    const handler = createShowToolHandler(
      () => library,
      () => ({}) as never
    );

    const result = await handler({ identifier: "smith2023" });

    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe("smith2023");
    expect(parsed.title).toBe("Test Title");
    expect(parsed.doi).toBe("10.1000/test");
    expect(parsed.raw).toBeDefined();
  });

  it("returns normalized JSON for uuid lookup", async () => {
    const items = [
      makeItem("smith2023", {
        title: "Test Title",
        custom: { uuid: "uuid-456" },
      }),
    ];
    const library = createMockLibrary(items);
    const handler = createShowToolHandler(
      () => library,
      () => ({}) as never
    );

    const result = await handler({ uuid: "uuid-456" });

    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe("smith2023");
    expect(parsed.uuid).toBe("uuid-456");
  });

  it("returns error when reference not found", async () => {
    const library = createMockLibrary([]);
    const handler = createShowToolHandler(
      () => library,
      () => ({}) as never
    );

    const result = await handler({ identifier: "nonexistent" });

    const text = result.content[0].text;
    expect(text).toContain("Reference not found");
  });
});
