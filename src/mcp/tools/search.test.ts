import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { type SearchToolParams, registerSearchTool } from "./search.js";

// Mock config with MCP settings
const mockConfig = { mcp: { defaultLimit: 20 } } as Config;
const getConfig = () => mockConfig;

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

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("search");
      expect(registeredTools[0].config.description).toContain("Search");
    });
  });

  describe("search tool callback", () => {
    it("should return matching references as raw CslItem[]", async () => {
      let capturedCallback: (
        args: SearchToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({ query: "machine learning" });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(1);
      expect(response.items).toHaveLength(1);
      // Items are raw CslItem objects
      expect(response.items[0].id).toBe("smith2024");
      expect(response.items[0].title).toBe("Machine Learning Applications");
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

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({ query: "" });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(3);
      expect(response.items).toHaveLength(3);
      // All items are CslItem objects
      const ids = response.items.map((item: { id: string }) => item.id);
      expect(ids).toContain("smith2024");
      expect(ids).toContain("jones2023");
      expect(ids).toContain("brown2022");
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

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({ query: "nonexistent" });

      // Single content block with metadata and empty items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(0);
      expect(response.items).toHaveLength(0);
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

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({ query: "author:jones" });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].id).toBe("jones2023");
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

      registerSearchTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({ query: "year:2022" });

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].id).toBe("brown2022");
    });
  });
});
