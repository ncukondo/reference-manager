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
  });

  describe("formatExportOutput", () => {
    it("should output single item as object (not array)", () => {
      const result: ExportCommandResult = {
        items: [mockItem],
        notFound: [],
      };
      const options: ExportCommandOptions = {
        ids: ["smith-2024"],
        format: "json",
      };

      const output = formatExportOutput(result, options);
      const parsed = JSON.parse(output);

      // Single item should be object, not array
      expect(parsed).not.toBeInstanceOf(Array);
      expect(parsed.id).toBe("smith-2024");
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
