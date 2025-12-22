import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "../../core/library.js";
import type { ListResult } from "../../features/operations/list.js";
import type { LocalExecutionContext, ServerExecutionContext } from "../execution-context.js";
import type { ServerClient } from "../server-client.js";
import {
  type ListCommandOptions,
  type ListCommandResult,
  executeList,
  formatListOutput,
} from "./list.js";

// Mock dependencies
vi.mock("../../features/operations/list.js", () => ({
  listReferences: vi.fn(),
}));

describe("list command", () => {
  describe("executeList", () => {
    const mockLibrary = {} as Library;
    const mockServerClient = {
      list: vi.fn(),
    } as unknown as ServerClient;

    const serverContext: ServerExecutionContext = {
      type: "server",
      client: mockServerClient,
    };

    const localContext: LocalExecutionContext = {
      type: "local",
      library: mockLibrary,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("via server", () => {
      it("should call server list when context is server", async () => {
        const mockResult: ListResult = {
          items: ["[ref1] Test Article"],
        };
        vi.mocked(mockServerClient.list).mockResolvedValue(mockResult);

        const options: ListCommandOptions = {};

        const result = await executeList(options, serverContext);

        expect(mockServerClient.list).toHaveBeenCalledWith({ format: "pretty" });
        expect(result).toEqual(mockResult);
      });

      it("should pass json format option to server", async () => {
        const mockResult: ListResult = { items: ['{"id":"ref1"}'] };
        vi.mocked(mockServerClient.list).mockResolvedValue(mockResult);

        const options: ListCommandOptions = { json: true };

        await executeList(options, serverContext);

        expect(mockServerClient.list).toHaveBeenCalledWith({ format: "json" });
      });

      it("should pass ids-only format option to server", async () => {
        const mockResult: ListResult = { items: ["ref1", "ref2"] };
        vi.mocked(mockServerClient.list).mockResolvedValue(mockResult);

        const options: ListCommandOptions = { idsOnly: true };

        await executeList(options, serverContext);

        expect(mockServerClient.list).toHaveBeenCalledWith({ format: "ids-only" });
      });

      it("should pass uuid format option to server", async () => {
        const mockResult: ListResult = { items: ["uuid-1", "uuid-2"] };
        vi.mocked(mockServerClient.list).mockResolvedValue(mockResult);

        const options: ListCommandOptions = { uuid: true };

        await executeList(options, serverContext);

        expect(mockServerClient.list).toHaveBeenCalledWith({ format: "uuid" });
      });

      it("should pass bibtex format option to server", async () => {
        const mockResult: ListResult = { items: ["@article{ref1,}"] };
        vi.mocked(mockServerClient.list).mockResolvedValue(mockResult);

        const options: ListCommandOptions = { bibtex: true };

        await executeList(options, serverContext);

        expect(mockServerClient.list).toHaveBeenCalledWith({ format: "bibtex" });
      });
    });

    describe("via library", () => {
      it("should call listReferences when context is local", async () => {
        const { listReferences } = await import("../../features/operations/list.js");
        const mockResult: ListResult = {
          items: ["[ref1] Test Article"],
        };
        vi.mocked(listReferences).mockReturnValue(mockResult);

        const options: ListCommandOptions = {};

        const result = await executeList(options, localContext);

        expect(listReferences).toHaveBeenCalledWith(mockLibrary, { format: "pretty" });
        expect(result).toEqual(mockResult);
      });
    });

    describe("option validation", () => {
      it("should throw error for conflicting output options", async () => {
        const options: ListCommandOptions = { json: true, bibtex: true };

        await expect(executeList(options, localContext)).rejects.toThrow(
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
