import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListResult } from "../../features/operations/list.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type ListCommandOptions,
  type ListCommandResult,
  executeList,
  formatListOutput,
} from "./list.js";

describe("list command", () => {
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

    it("should call context.library.list with pretty format by default", async () => {
      const mockResult: ListResult = {
        items: ["[ref1] Test Article"],
      };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = {};
      const context = createContext();

      const result = await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({ format: "pretty" });
      expect(result).toEqual(mockResult);
    });

    it("should pass json format option", async () => {
      const mockResult: ListResult = { items: ['{"id":"ref1"}'] };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = { json: true };
      const context = createContext();

      await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({ format: "json" });
    });

    it("should pass ids-only format option", async () => {
      const mockResult: ListResult = { items: ["ref1", "ref2"] };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = { idsOnly: true };
      const context = createContext();

      await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({ format: "ids-only" });
    });

    it("should pass uuid format option", async () => {
      const mockResult: ListResult = { items: ["uuid-1", "uuid-2"] };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = { uuid: true };
      const context = createContext();

      await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({ format: "uuid" });
    });

    it("should pass bibtex format option", async () => {
      const mockResult: ListResult = { items: ["@article{ref1,}"] };
      mockList.mockResolvedValue(mockResult);

      const options: ListCommandOptions = { bibtex: true };
      const context = createContext();

      await executeList(options, context);

      expect(mockList).toHaveBeenCalledWith({ format: "bibtex" });
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
    it("should join items with newlines", () => {
      const result: ListCommandResult = {
        items: ["line1", "line2", "line3"],
      };

      const output = formatListOutput(result);

      expect(output).toBe("line1\nline2\nline3");
    });

    it("should return empty string for empty items", () => {
      const result: ListCommandResult = {
        items: [],
      };

      const output = formatListOutput(result);

      expect(output).toBe("");
    });
  });
});
