import { beforeEach, describe, expect, it, vi } from "vitest";
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

    it("should call context.library.search with query and pretty format by default", async () => {
      const mockResult: SearchResult = {
        items: ["[ref1] Test Article"],
      };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test" };
      const context = createContext();

      const result = await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({ query: "test", format: "pretty" });
      expect(result).toEqual(mockResult);
    });

    it("should pass json format option", async () => {
      const mockResult: SearchResult = { items: ['{"id":"ref1"}'] };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test", json: true };
      const context = createContext();

      await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({ query: "test", format: "json" });
    });

    it("should pass ids-only format option", async () => {
      const mockResult: SearchResult = { items: ["ref1", "ref2"] };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test", idsOnly: true };
      const context = createContext();

      await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({ query: "test", format: "ids-only" });
    });

    it("should pass uuid format option", async () => {
      const mockResult: SearchResult = { items: ["uuid-1", "uuid-2"] };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test", uuid: true };
      const context = createContext();

      await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({ query: "test", format: "uuid" });
    });

    it("should pass bibtex format option", async () => {
      const mockResult: SearchResult = { items: ["@article{ref1,}"] };
      mockSearch.mockResolvedValue(mockResult);

      const options: SearchCommandOptions = { query: "test", bibtex: true };
      const context = createContext();

      await executeSearch(options, context);

      expect(mockSearch).toHaveBeenCalledWith({ query: "test", format: "bibtex" });
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
    it("should join items with newlines", () => {
      const result: SearchCommandResult = {
        items: ["line1", "line2", "line3"],
      };

      const output = formatSearchOutput(result);

      expect(output).toBe("line1\nline2\nline3");
    });

    it("should return empty string for empty items", () => {
      const result: SearchCommandResult = {
        items: [],
      };

      const output = formatSearchOutput(result);

      expect(output).toBe("");
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
        interactive: {
          limit: 20,
          debounceMs: 200,
        },
      },
    } as Parameters<typeof executeInteractiveSearch>[2];

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should throw error when interactive option conflicts with output format options", async () => {
      const context = createContext();

      // Test with --json
      await expect(
        executeInteractiveSearch({ query: "", interactive: true, json: true }, context, mockConfig)
      ).rejects.toThrow("Interactive mode cannot be combined with output format options");

      // Test with --bibtex
      await expect(
        executeInteractiveSearch(
          { query: "", interactive: true, bibtex: true },
          context,
          mockConfig
        )
      ).rejects.toThrow("Interactive mode cannot be combined with output format options");

      // Test with --ids-only
      await expect(
        executeInteractiveSearch(
          { query: "", interactive: true, idsOnly: true },
          context,
          mockConfig
        )
      ).rejects.toThrow("Interactive mode cannot be combined with output format options");

      // Test with --uuid
      await expect(
        executeInteractiveSearch({ query: "", interactive: true, uuid: true }, context, mockConfig)
      ).rejects.toThrow("Interactive mode cannot be combined with output format options");
    });
  });
});
