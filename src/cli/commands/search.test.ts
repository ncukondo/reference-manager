import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "../../core/library.js";
import type { SearchResult } from "../../features/operations/search.js";
import type { ServerClient } from "../server-client.js";
import {
  type SearchCommandOptions,
  type SearchCommandResult,
  executeSearch,
  formatSearchOutput,
} from "./search.js";

// Mock dependencies
vi.mock("../../features/operations/search.js", () => ({
  searchReferences: vi.fn(),
}));

describe("search command", () => {
  describe("executeSearch", () => {
    const mockLibrary = {} as Library;
    const mockServerClient = {
      search: vi.fn(),
    } as unknown as ServerClient;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("via server", () => {
      it("should call server search when server is provided", async () => {
        const mockResult: SearchResult = {
          items: ["[ref1] Test Article"],
        };
        vi.mocked(mockServerClient.search).mockResolvedValue(mockResult);

        const options: SearchCommandOptions = { query: "test" };

        const result = await executeSearch(options, mockLibrary, mockServerClient);

        expect(mockServerClient.search).toHaveBeenCalledWith({ query: "test", format: "pretty" });
        expect(result).toEqual(mockResult);
      });

      it("should pass json format option to server", async () => {
        const mockResult: SearchResult = { items: ['{"id":"ref1"}'] };
        vi.mocked(mockServerClient.search).mockResolvedValue(mockResult);

        const options: SearchCommandOptions = { query: "test", json: true };

        await executeSearch(options, mockLibrary, mockServerClient);

        expect(mockServerClient.search).toHaveBeenCalledWith({ query: "test", format: "json" });
      });

      it("should pass ids-only format option to server", async () => {
        const mockResult: SearchResult = { items: ["ref1", "ref2"] };
        vi.mocked(mockServerClient.search).mockResolvedValue(mockResult);

        const options: SearchCommandOptions = { query: "test", idsOnly: true };

        await executeSearch(options, mockLibrary, mockServerClient);

        expect(mockServerClient.search).toHaveBeenCalledWith({ query: "test", format: "ids-only" });
      });

      it("should pass uuid format option to server", async () => {
        const mockResult: SearchResult = { items: ["uuid-1", "uuid-2"] };
        vi.mocked(mockServerClient.search).mockResolvedValue(mockResult);

        const options: SearchCommandOptions = { query: "test", uuid: true };

        await executeSearch(options, mockLibrary, mockServerClient);

        expect(mockServerClient.search).toHaveBeenCalledWith({ query: "test", format: "uuid" });
      });

      it("should pass bibtex format option to server", async () => {
        const mockResult: SearchResult = { items: ["@article{ref1,}"] };
        vi.mocked(mockServerClient.search).mockResolvedValue(mockResult);

        const options: SearchCommandOptions = { query: "test", bibtex: true };

        await executeSearch(options, mockLibrary, mockServerClient);

        expect(mockServerClient.search).toHaveBeenCalledWith({ query: "test", format: "bibtex" });
      });
    });

    describe("via library", () => {
      it("should call searchReferences when server is not provided", async () => {
        const { searchReferences } = await import("../../features/operations/search.js");
        const mockResult: SearchResult = {
          items: ["[ref1] Test Article"],
        };
        vi.mocked(searchReferences).mockReturnValue(mockResult);

        const options: SearchCommandOptions = { query: "machine learning" };

        const result = await executeSearch(options, mockLibrary, undefined);

        expect(searchReferences).toHaveBeenCalledWith(mockLibrary, {
          query: "machine learning",
          format: "pretty",
        });
        expect(result).toEqual(mockResult);
      });
    });

    describe("option validation", () => {
      it("should throw error for conflicting output options", async () => {
        const options: SearchCommandOptions = { query: "test", json: true, bibtex: true };

        await expect(executeSearch(options, mockLibrary, undefined)).rejects.toThrow(
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
});
