import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { SearchResult } from "../../features/operations/search.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type SearchCommandOptions,
  type SearchCommandResult,
  executeInteractiveSearch,
  executeSearch,
  executeSideEffectAction,
  formatSearchOutput,
} from "./search.js";

describe("search command", () => {
  const mockItems: CslItem[] = [
    {
      id: "ref1",
      type: "article-journal",
      title: "Test Article 1",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: { uuid: "uuid-1" },
    },
    {
      id: "ref2",
      type: "article-journal",
      title: "Test Article 2",
      author: [{ family: "Doe", given: "Jane" }],
      issued: { "date-parts": [[2024]] },
      custom: { uuid: "uuid-2" },
    },
  ];

  describe("executeSearch", () => {
    const mockSearch = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          search: mockSearch,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call context.library.search with query (no format)", async () => {
      const mockResult: SearchResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test" };
      const context = createContext();

      const result = await executeSearch(options, context);

      // format is no longer passed to search - it's handled in formatSearchOutput
      expect(mockSearch).toHaveBeenCalledWith({ query: "test" });
      expect(result).toEqual(mockResult);
    });

    it("should pass sort and pagination options", async () => {
      const mockResult: SearchResult = {
        items: mockItems,
        total: 2,
        limit: 10,
        offset: 0,
        nextOffset: null,
      };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = {
        query: "test",
        sort: "title",
        order: "asc",
        limit: 10,
        offset: 0,
      };
      const context = createContext();

      await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({
        query: "test",
        sort: "title",
        order: "asc",
        limit: 10,
        offset: 0,
      });
    });

    describe("option validation", () => {
      it("should throw error for conflicting output options", async () => {
        const options: SearchCommandOptions = { query: "test", json: true, bibtex: true };
        const context = createContext();

        await expect(executeSearch(options, context)).rejects.toThrow(
          "Multiple output formats specified"
        );
      });
    });
  });

  describe("formatSearchOutput", () => {
    it("should format items as pretty by default", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "" });

      expect(output).toContain("[ref1]");
      expect(output).toContain("Test Article 1");
      expect(output).toContain("[ref2]");
      expect(output).toContain("Test Article 2");
    });

    it("should format items as JSON when json option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", json: true });
      const parsed = JSON.parse(output);

      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("ref1");
      expect(parsed.total).toBe(2);
    });

    it("should format items as IDs when idsOnly option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", idsOnly: true });

      expect(output).toBe("ref1\nref2");
    });

    it("should format items as UUIDs when uuidOnly option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", uuidOnly: true });

      expect(output).toBe("uuid-1\nuuid-2");
    });

    it("should format items as BibTeX when bibtex option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", bibtex: true });

      expect(output).toContain("@article{ref1,");
      expect(output).toContain("@article{ref2,");
    });

    it("should return empty string for empty items", () => {
      const result: SearchCommandResult = {
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "" });

      expect(output).toBe("");
    });

    it("should format items as pandoc keys when pandocKey option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", pandocKey: true });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as latex keys when latexKey option is true", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", latexKey: true });

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should format items as pandoc keys when key option is true (default)", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", key: true });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as pandoc keys when output is pandoc-key", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", output: "pandoc-key" });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as latex keys when output is latex-key", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", output: "latex-key" });

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should format items as latex keys when key option is true with latex defaultKeyFormat", () => {
      const result: SearchCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatSearchOutput(result, { query: "", key: true }, "latex");

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should add header line when limit is applied", () => {
      const result: SearchCommandResult = {
        items: [mockItems[0]],
        total: 2,
        limit: 1,
        offset: 0,
        nextOffset: 1,
      };

      const output = formatSearchOutput(result, { query: "" });

      expect(output).toContain("# Showing 1-1 of 2 references");
    });
  });

  describe("executeInteractiveSearch", () => {
    const mockGetAll = vi.fn();
    const mockSearch = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          getAll: mockGetAll,
          search: mockSearch,
        },
      }) as unknown as ExecutionContext;

    const mockConfig = {
      cli: {
        tui: {
          limit: 20,
          debounceMs: 200,
        },
      },
    } as Parameters<typeof executeInteractiveSearch>[2];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should throw error when tui option conflicts with output format options", async () => {
      const context = createContext();

      // Test with --json
      await expect(
        executeInteractiveSearch({ query: "", tui: true, json: true }, context, mockConfig)
      ).rejects.toThrow("TUI mode cannot be combined with output format options");

      // Test with --bibtex
      await expect(
        executeInteractiveSearch({ query: "", tui: true, bibtex: true }, context, mockConfig)
      ).rejects.toThrow("TUI mode cannot be combined with output format options");

      // Test with --ids-only
      await expect(
        executeInteractiveSearch({ query: "", tui: true, idsOnly: true }, context, mockConfig)
      ).rejects.toThrow("TUI mode cannot be combined with output format options");

      // Test with --uuid-only
      await expect(
        executeInteractiveSearch({ query: "", tui: true, uuidOnly: true }, context, mockConfig)
      ).rejects.toThrow("TUI mode cannot be combined with output format options");
    });
  });

  describe("executeSideEffectAction", () => {
    const createItem = (id: string, overrides?: Partial<CslItem>): CslItem => ({
      id,
      type: "article-journal",
      title: `Test ${id}`,
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: {
        uuid: `uuid-${id}`,
        created_at: "2024-01-01T00:00:00Z",
        timestamp: "2024-01-01T00:00:00Z",
      },
      ...overrides,
    });

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {},
      }) as unknown as ExecutionContext;

    const createConfig = (overrides?: Partial<Config>): Config =>
      ({
        attachments: { directory: "/tmp/test-attachments" },
        cli: { edit: { defaultFormat: "yaml" } },
        ...overrides,
      }) as unknown as Config;

    let stderrSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.clearAllMocks();
      vi.restoreAllMocks();
      stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });

    it("should call resolveDefaultUrl and openWithSystemApp for open-url action", async () => {
      const mockOpenWithSystemApp = vi.fn().mockResolvedValue(undefined);
      const mockResolveDefaultUrl = vi.fn().mockReturnValue("https://doi.org/10.1000/test");

      vi.doMock("../../features/operations/url.js", () => ({
        resolveDefaultUrl: mockResolveDefaultUrl,
      }));
      vi.doMock("../../utils/opener.js", () => ({
        openWithSystemApp: mockOpenWithSystemApp,
      }));

      // Re-import to pick up mocks
      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1", { DOI: "10.1000/test" });
      await fn("open-url", [item], createContext(), createConfig());

      expect(mockResolveDefaultUrl).toHaveBeenCalledWith(item);
      expect(mockOpenWithSystemApp).toHaveBeenCalledWith("https://doi.org/10.1000/test");

      vi.doUnmock("../../features/operations/url.js");
      vi.doUnmock("../../utils/opener.js");
    });

    it("should write error to stderr when open-url has no URL", async () => {
      vi.doMock("../../features/operations/url.js", () => ({
        resolveDefaultUrl: vi.fn().mockReturnValue(undefined),
      }));
      vi.doMock("../../utils/opener.js", () => ({
        openWithSystemApp: vi.fn(),
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1");
      await fn("open-url", [item], createContext(), createConfig());

      expect(stderrSpy).toHaveBeenCalledWith("No URL available for ref1\n");

      vi.doUnmock("../../features/operations/url.js");
      vi.doUnmock("../../utils/opener.js");
    });

    it("should call executeFulltextOpen and show error for open-fulltext action", async () => {
      const mockExecuteFulltextOpen = vi
        .fn()
        .mockResolvedValue({ success: false, error: "No fulltext attached to reference: ref1" });

      vi.doMock("./fulltext.js", () => ({
        executeFulltextOpen: mockExecuteFulltextOpen,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1");
      const context = createContext();
      const config = createConfig();
      await fn("open-fulltext", [item], context, config);

      expect(mockExecuteFulltextOpen).toHaveBeenCalledWith(
        { identifier: "ref1", fulltextDirectory: "/tmp/test-attachments" },
        context
      );
      expect(stderrSpy).toHaveBeenCalledWith("No fulltext attached to reference: ref1\n");

      vi.doUnmock("./fulltext.js");
    });

    it("should call executeAttachOpen for manage-attachments action", async () => {
      const mockExecuteAttachOpen = vi.fn().mockResolvedValue(undefined);

      vi.doMock("./attach.js", () => ({
        executeAttachOpen: mockExecuteAttachOpen,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1");
      const context = createContext();
      const config = createConfig();
      await fn("manage-attachments", [item], context, config);

      expect(mockExecuteAttachOpen).toHaveBeenCalledWith(
        { identifier: "ref1", attachmentsDirectory: "/tmp/test-attachments" },
        context
      );

      vi.doUnmock("./attach.js");
    });

    it("should call executeEditCommand for edit action", async () => {
      const mockExecuteEditCommand = vi.fn().mockResolvedValue(undefined);

      vi.doMock("./edit.js", () => ({
        executeEditCommand: mockExecuteEditCommand,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const items = [createItem("ref1"), createItem("ref2")];
      const context = createContext();
      const config = createConfig();
      await fn("edit", items, context, config);

      expect(mockExecuteEditCommand).toHaveBeenCalledWith(
        { identifiers: ["ref1", "ref2"], format: "yaml" },
        context
      );

      vi.doUnmock("./edit.js");
    });

    it("should call confirmRemoveIfNeeded and executeRemove for remove action", async () => {
      const mockExecuteRemove = vi
        .fn()
        .mockResolvedValue({ removed: true, removedItem: createItem("ref1") });
      const mockConfirmRemoveIfNeeded = vi.fn().mockResolvedValue(true);
      const mockGetFulltextAttachmentTypes = vi.fn().mockReturnValue([]);
      const mockFormatRemoveOutput = vi.fn().mockReturnValue("Removed: [ref1] Test ref1");

      vi.doMock("./remove.js", () => ({
        executeRemove: mockExecuteRemove,
        confirmRemoveIfNeeded: mockConfirmRemoveIfNeeded,
        getFulltextAttachmentTypes: mockGetFulltextAttachmentTypes,
        formatRemoveOutput: mockFormatRemoveOutput,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1");
      const context = createContext();
      const config = createConfig();
      await fn("remove", [item], context, config);

      expect(mockConfirmRemoveIfNeeded).toHaveBeenCalledWith(item, false, false);
      expect(mockExecuteRemove).toHaveBeenCalledWith(
        { identifier: "ref1", fulltextDirectory: "/tmp/test-attachments", deleteFulltext: false },
        context
      );
      expect(stderrSpy).toHaveBeenCalledWith("Removed: [ref1] Test ref1\n");

      vi.doUnmock("./remove.js");
    });

    it("should skip removal when confirmation is declined", async () => {
      const mockExecuteRemove = vi.fn();
      const mockConfirmRemoveIfNeeded = vi.fn().mockResolvedValue(false);
      const mockGetFulltextAttachmentTypes = vi.fn().mockReturnValue([]);
      const mockFormatRemoveOutput = vi.fn();

      vi.doMock("./remove.js", () => ({
        executeRemove: mockExecuteRemove,
        confirmRemoveIfNeeded: mockConfirmRemoveIfNeeded,
        getFulltextAttachmentTypes: mockGetFulltextAttachmentTypes,
        formatRemoveOutput: mockFormatRemoveOutput,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const item = createItem("ref1");
      await fn("remove", [item], createContext(), createConfig());

      expect(mockConfirmRemoveIfNeeded).toHaveBeenCalled();
      expect(mockExecuteRemove).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledWith("Cancelled.\n");

      vi.doUnmock("./remove.js");
    });

    it("should process multiple items sequentially for remove action", async () => {
      const callOrder: string[] = [];
      const mockConfirmRemoveIfNeeded = vi.fn().mockImplementation(async (item: CslItem) => {
        callOrder.push(`confirm-${item.id}`);
        return true;
      });
      const mockExecuteRemove = vi.fn().mockImplementation(async (opts: { identifier: string }) => {
        callOrder.push(`remove-${opts.identifier}`);
        return { removed: true, removedItem: createItem(opts.identifier) };
      });
      const mockGetFulltextAttachmentTypes = vi.fn().mockReturnValue([]);
      const mockFormatRemoveOutput = vi.fn().mockReturnValue("Removed");

      vi.doMock("./remove.js", () => ({
        executeRemove: mockExecuteRemove,
        confirmRemoveIfNeeded: mockConfirmRemoveIfNeeded,
        getFulltextAttachmentTypes: mockGetFulltextAttachmentTypes,
        formatRemoveOutput: mockFormatRemoveOutput,
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      const items = [createItem("ref1"), createItem("ref2"), createItem("ref3")];
      await fn("remove", items, createContext(), createConfig());

      expect(callOrder).toEqual([
        "confirm-ref1",
        "remove-ref1",
        "confirm-ref2",
        "remove-ref2",
        "confirm-ref3",
        "remove-ref3",
      ]);

      vi.doUnmock("./remove.js");
    });

    it("should return early for single-item actions when items array is empty", async () => {
      const mockResolveDefaultUrl = vi.fn();
      vi.doMock("../../features/operations/url.js", () => ({
        resolveDefaultUrl: mockResolveDefaultUrl,
      }));
      vi.doMock("../../utils/opener.js", () => ({
        openWithSystemApp: vi.fn(),
      }));

      const { executeSideEffectAction: fn } = await import("./search.js");

      await fn("open-url", [], createContext(), createConfig());
      expect(mockResolveDefaultUrl).not.toHaveBeenCalled();

      vi.doUnmock("../../features/operations/url.js");
      vi.doUnmock("../../utils/opener.js");
    });

    it("should do nothing for unhandled action types", async () => {
      // "cancel" and other non-side-effect actions should just return
      await executeSideEffectAction(
        "cancel",
        [createItem("ref1")],
        createContext(),
        createConfig()
      );
      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });
});
