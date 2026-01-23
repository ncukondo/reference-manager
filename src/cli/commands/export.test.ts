import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type ExportCommandOptions,
  type ExportCommandResult,
  executeExport,
  formatExportOutput,
  getExportExitCode,
} from "./export.js";

describe("export command", () => {
  const mockItem: CslItem = {
    id: "smith-2024",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2024]] },
    custom: { uuid: "uuid-smith" },
  };

  describe("executeExport", () => {
    const mockFind = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        library: {
          find: mockFind,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should export single reference by citation key", async () => {
      mockFind.mockResolvedValue(mockItem);

      const options: ExportCommandOptions = {
        ids: ["smith-2024"],
      };
      const context = createContext();

      const result = await executeExport(options, context);

      expect(mockFind).toHaveBeenCalledWith("smith-2024", { idType: "id" });
      expect(result.items).toEqual([mockItem]);
      expect(result.notFound).toEqual([]);
    });

    it("should export single reference by UUID with --uuid flag", async () => {
      mockFind.mockResolvedValue(mockItem);

      const options: ExportCommandOptions = {
        ids: ["uuid-smith"],
        uuid: true,
      };
      const context = createContext();

      const result = await executeExport(options, context);

      expect(mockFind).toHaveBeenCalledWith("uuid-smith", { idType: "uuid" });
      expect(result.items).toEqual([mockItem]);
      expect(result.notFound).toEqual([]);
    });

    it("should return not found error when reference does not exist", async () => {
      mockFind.mockResolvedValue(undefined);

      const options: ExportCommandOptions = {
        ids: ["nonexistent"],
      };
      const context = createContext();

      const result = await executeExport(options, context);

      expect(mockFind).toHaveBeenCalledWith("nonexistent", { idType: "id" });
      expect(result.items).toEqual([]);
      expect(result.notFound).toEqual(["nonexistent"]);
    });

    it("should export multiple references", async () => {
      const mockItem2: CslItem = {
        id: "jones-2023",
        type: "article-journal",
        title: "Another Article",
        author: [{ family: "Jones", given: "Jane" }],
        issued: { "date-parts": [[2023]] },
        custom: { uuid: "uuid-jones" },
      };

      mockFind.mockImplementation((id: string) => {
        if (id === "smith-2024") return Promise.resolve(mockItem);
        if (id === "jones-2023") return Promise.resolve(mockItem2);
        return Promise.resolve(undefined);
      });

      const options: ExportCommandOptions = {
        ids: ["smith-2024", "jones-2023"],
      };
      const context = createContext();

      const result = await executeExport(options, context);

      expect(mockFind).toHaveBeenCalledTimes(2);
      expect(result.items).toEqual([mockItem, mockItem2]);
      expect(result.notFound).toEqual([]);
    });

    it("should handle partial failures (some IDs not found)", async () => {
      mockFind.mockImplementation((id: string) => {
        if (id === "smith-2024") return Promise.resolve(mockItem);
        return Promise.resolve(undefined);
      });

      const options: ExportCommandOptions = {
        ids: ["smith-2024", "nonexistent"],
      };
      const context = createContext();

      const result = await executeExport(options, context);

      expect(result.items).toEqual([mockItem]);
      expect(result.notFound).toEqual(["nonexistent"]);
    });

    describe("--all option", () => {
      const mockGetAll = vi.fn();

      const createContextWithGetAll = (): ExecutionContext =>
        ({
          mode: "local",
          library: {
            find: mockFind,
            getAll: mockGetAll,
          },
        }) as unknown as ExecutionContext;

      beforeEach(() => {
        mockGetAll.mockReset();
      });

      it("should export all references with --all", async () => {
        const mockItem2: CslItem = {
          id: "jones-2023",
          type: "article-journal",
          title: "Another Article",
          custom: { uuid: "uuid-jones" },
        };
        mockGetAll.mockResolvedValue([mockItem, mockItem2]);

        const options: ExportCommandOptions = {
          all: true,
        };
        const context = createContextWithGetAll();

        const result = await executeExport(options, context);

        expect(mockGetAll).toHaveBeenCalled();
        expect(mockFind).not.toHaveBeenCalled();
        expect(result.items).toEqual([mockItem, mockItem2]);
        expect(result.notFound).toEqual([]);
      });

      it("should return empty array for empty library with --all", async () => {
        mockGetAll.mockResolvedValue([]);

        const options: ExportCommandOptions = {
          all: true,
        };
        const context = createContextWithGetAll();

        const result = await executeExport(options, context);

        expect(result.items).toEqual([]);
        expect(result.notFound).toEqual([]);
      });
    });

    describe("--search option", () => {
      const mockSearch = vi.fn();

      const createContextWithSearch = (): ExecutionContext =>
        ({
          mode: "local",
          library: {
            find: mockFind,
            search: mockSearch,
          },
        }) as unknown as ExecutionContext;

      beforeEach(() => {
        mockSearch.mockReset();
      });

      it("should export references matching search query", async () => {
        const mockItem2: CslItem = {
          id: "smith-2023",
          type: "article-journal",
          title: "Smith's Article",
          custom: { uuid: "uuid-smith2" },
        };
        mockSearch.mockResolvedValue({
          items: [mockItem, mockItem2],
          total: 2,
          limit: 0,
          offset: 0,
          nextOffset: null,
        });

        const options: ExportCommandOptions = {
          search: "author:smith",
        };
        const context = createContextWithSearch();

        const result = await executeExport(options, context);

        expect(mockSearch).toHaveBeenCalledWith({ query: "author:smith", limit: 0 });
        expect(mockFind).not.toHaveBeenCalled();
        expect(result.items).toEqual([mockItem, mockItem2]);
        expect(result.notFound).toEqual([]);
      });

      it("should return empty array when no matches found", async () => {
        mockSearch.mockResolvedValue({
          items: [],
          total: 0,
          limit: 0,
          offset: 0,
          nextOffset: null,
        });

        const options: ExportCommandOptions = {
          search: "nonexistent:query",
        };
        const context = createContextWithSearch();

        const result = await executeExport(options, context);

        expect(result.items).toEqual([]);
        expect(result.notFound).toEqual([]);
      });
    });
  });

  describe("formatExportOutput", () => {
    it("should output single item as object (not array)", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        ids: ["smith-2024"],
        output: "json",
      };

      const output = formatExportOutput(result, options);
      const parsed = JSON.parse(output);

      // Single item should be object, not array
      expect(parsed).not.toBeInstanceOf(Array);
      expect(parsed.id).toBe("smith-2024");
    });

    it("should output multiple items as array", () => {
      const mockItem2: CslItem = {
        id: "jones-2023",
        type: "article-journal",
        title: "Another Article",
        custom: { uuid: "uuid-jones" },
      };
      const result: ExportCommandResult = {
        items: [mockItem, mockItem2],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        ids: ["smith-2024", "jones-2023"],
        output: "json",
      };

      const output = formatExportOutput(result, options);
      const parsed = JSON.parse(output);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("smith-2024");
      expect(parsed[1].id).toBe("jones-2023");
    });

    it("should always output as array for --all", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        all: true,
        output: "json",
      };

      const output = formatExportOutput(result, options);
      const parsed = JSON.parse(output);

      // Even with single item, --all should output array
      expect(Array.isArray(parsed)).toBe(true);
    });

    it("should always output as array for --search", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        search: "author:smith",
        output: "json",
      };

      const output = formatExportOutput(result, options);
      const parsed = JSON.parse(output);

      // Even with single item, --search should output array
      expect(Array.isArray(parsed)).toBe(true);
    });

    it("should output as YAML with --format yaml", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        ids: ["smith-2024"],
        output: "yaml",
      };

      const output = formatExportOutput(result, options);

      // YAML should contain the title
      expect(output).toContain("title: Test Article");
      expect(output).toContain("id: smith-2024");
      // Should not be JSON format
      expect(output).not.toContain("{");
    });

    it("should output multiple items as YAML array", () => {
      const mockItem2: CslItem = {
        id: "jones-2023",
        type: "article-journal",
        title: "Another Article",
        custom: { uuid: "uuid-jones" },
      };
      const result: ExportCommandResult = {
        items: [mockItem, mockItem2],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        all: true,
        output: "yaml",
      };

      const output = formatExportOutput(result, options);

      // YAML array starts with -
      expect(output).toContain("- id: smith-2024");
      expect(output).toContain("- id: jones-2023");
    });

    it("should output as BibTeX with --format bibtex", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        ids: ["smith-2024"],
        output: "bibtex",
      };

      const output = formatExportOutput(result, options);

      // BibTeX format characteristics
      expect(output).toContain("@article{smith-2024");
      expect(output).toContain("title = {Test Article}");
      expect(output).toContain("author = {Smith, John}");
    });

    it("should output multiple items as BibTeX entries", () => {
      const mockItem2: CslItem = {
        id: "jones-2023",
        type: "article-journal",
        title: "Another Article",
        author: [{ family: "Jones", given: "Jane" }],
        custom: { uuid: "uuid-jones" },
      };
      const result: ExportCommandResult = {
        items: [mockItem, mockItem2],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        all: true,
        output: "bibtex",
      };

      const output = formatExportOutput(result, options);

      expect(output).toContain("@article{smith-2024");
      expect(output).toContain("@article{jones-2023");
    });
  });

  describe("validation", () => {
    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        library: {
          find: vi.fn(),
          getAll: vi.fn(),
          search: vi.fn(),
        },
      }) as unknown as ExecutionContext;

    it("should throw error when no selection mode is specified", async () => {
      const options: ExportCommandOptions = {};
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow("No references specified");
    });

    it("should throw error when empty ids array is provided without other options", async () => {
      const options: ExportCommandOptions = { ids: [] };
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow("No references specified");
    });

    it("should throw error when --all and --search are used together", async () => {
      const options: ExportCommandOptions = { all: true, search: "query" };
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow(
        "Cannot use --all, --search, and IDs together"
      );
    });

    it("should throw error when --all and ids are used together", async () => {
      const options: ExportCommandOptions = { all: true, ids: ["smith-2024"] };
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow(
        "Cannot use --all, --search, and IDs together"
      );
    });

    it("should throw error when --search and ids are used together", async () => {
      const options: ExportCommandOptions = { search: "query", ids: ["smith-2024"] };
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow(
        "Cannot use --all, --search, and IDs together"
      );
    });

    it("should throw error when all three modes are used together", async () => {
      const options: ExportCommandOptions = { all: true, search: "query", ids: ["smith-2024"] };
      const context = createContext();

      await expect(executeExport(options, context)).rejects.toThrow(
        "Cannot use --all, --search, and IDs together"
      );
    });
  });

  describe("getExportExitCode", () => {
    it("should return 0 when all items found", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };

      expect(getExportExitCode(result)).toBe(0);
    });

    it("should return 1 when some items not found", () => {
      const result: ExportCommandResult = {
        items: [],
        notFound: ["nonexistent"],
      };

      expect(getExportExitCode(result)).toBe(1);
    });
  });
});
