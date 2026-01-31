import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ListResult } from "../../features/operations/list.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type ListCommandOptions,
  type ListCommandResult,
  executeList,
  formatListOutput,
} from "./list.js";

describe("list command", () => {
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

  describe("executeList", () => {
    const mockList = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          list: mockList,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call context.library.list without format", async () => {
      const mockResult: ListResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = {};
      const context = createContext();

      const result = await executeList(options, context);

      // format is no longer passed to list - it's handled in formatListOutput
      expect(mockList).toHaveBeenCalledWith({});
      expect(result).toEqual(mockResult);
    });

    it("should pass sort and pagination options", async () => {
      const mockResult: ListResult = {
        items: mockItems,
        total: 2,
        limit: 10,
        offset: 0,
        nextOffset: null,
      };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = {
        sort: "title",
        order: "asc",
        limit: 10,
        offset: 0,
      };
      const context = createContext();

      await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({
        sort: "title",
        order: "asc",
        limit: 10,
        offset: 0,
      });
    });

    describe("option validation", () => {
      it("should throw error for conflicting output options", async () => {
        const options: ListCommandOptions = { json: true, bibtex: true };
        const context = createContext();

        await expect(executeList(options, context)).rejects.toThrow(
          "Multiple output formats specified"
        );
      });
    });
  });

  describe("formatListOutput", () => {
    it("should format items as pretty by default", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, {});

      expect(output).toContain("[ref1]");
      expect(output).toContain("Test Article 1");
      expect(output).toContain("[ref2]");
      expect(output).toContain("Test Article 2");
    });

    it("should format items as JSON when json option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { json: true });
      const parsed = JSON.parse(output);

      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0].id).toBe("ref1");
      expect(parsed.total).toBe(2);
    });

    it("should format items as IDs when idsOnly option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { idsOnly: true });

      expect(output).toBe("ref1\nref2");
    });

    it("should format items as UUIDs when uuidOnly option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { uuidOnly: true });

      expect(output).toBe("uuid-1\nuuid-2");
    });

    it("should format items as BibTeX when bibtex option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { bibtex: true });

      expect(output).toContain("@article{ref1,");
      expect(output).toContain("@article{ref2,");
    });

    it("should return empty string for empty items", () => {
      const result: ListCommandResult = {
        items: [],
        total: 0,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, {});

      expect(output).toBe("");
    });

    it("should format items as pandoc keys when pandocKey option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { pandocKey: true });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as latex keys when latexKey option is true", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { latexKey: true });

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should format items as pandoc keys when key option is true (default)", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { key: true });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as pandoc keys when output is pandoc-key", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { output: "pandoc-key" });

      expect(output).toBe("@ref1\n@ref2");
    });

    it("should format items as latex keys when output is latex-key", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { output: "latex-key" });

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should format items as latex keys when key option is true with latex defaultKeyFormat", () => {
      const result: ListCommandResult = {
        items: mockItems,
        total: 2,
        limit: 0,
        offset: 0,
        nextOffset: null,
      };

      const output = formatListOutput(result, { key: true }, "latex");

      expect(output).toBe("\\cite{ref1}\n\\cite{ref2}");
    });

    it("should add header line when limit is applied", () => {
      const result: ListCommandResult = {
        items: [mockItems[0]],
        total: 2,
        limit: 1,
        offset: 0,
        nextOffset: 1,
      };

      const output = formatListOutput(result, {});

      expect(output).toContain("# Showing 1-1 of 2 references");
    });
  });
});
