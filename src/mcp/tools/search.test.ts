import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { type SearchToolParams, registerSearchTool } from "./search.js";

describe("MCP search tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-search-test-"));
    libraryPath = path.join(tempDir, "references.json");

    // Create library with test references
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
      },
      {
        id: "jones2023",
        type: "article-journal",
        title: "Deep Learning in Healthcare",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
      },
      {
        id: "brown2022",
        type: "book",
        title: "Introduction to AI",
        author: [{ family: "Brown", given: "Alice" }],
        issued: { "date-parts": [[2022]] },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerSearchTool", () => {
    it("should register tool with correct name and description", () => {
      const registeredTools: Array<{
        name: string;
        config: { description?: string };
      }> = [];

      const mockServer = {
        registerTool: (name: string, config: { description?: string }, _cb: unknown) => {
          registeredTools.push({ name, config });
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("search");
      expect(registeredTools[0].config.description).toContain("Search");
    });
  });

  describe("search tool callback", () => {
    it("should return matching references for query", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ query: "machine learning" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("smith2024");
      expect(result.content[0].text).toContain("Machine Learning Applications");
    });

    it("should return all references when query is empty", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ query: "" });

      expect(result.content).toHaveLength(3);
    });

    it("should return empty array when no matches found", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ query: "nonexistent" });

      expect(result.content).toHaveLength(0);
    });

    it("should support author search", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ query: "author:jones" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("jones2023");
    });

    it("should support year search", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ query: "year:2022" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("brown2022");
    });
  });
});
