import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { SearchResult } from "../../features/operations/search.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type SearchCommandOptions,
  type SearchCommandResult,
  executeInteractiveSearch,
  executeSearch,
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
});
