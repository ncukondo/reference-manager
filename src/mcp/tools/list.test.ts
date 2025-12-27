import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import { type ListToolParams, registerListTool } from "./list.js";

describe("MCP list tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let library: Library;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-list-test-"));
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
        title: "Deep Learning",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    library = await Library.load(libraryPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerListTool", () => {
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

      registerListTool(mockServer as never, () => library);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("list");
      expect(registeredTools[0].config.description).toContain("List");
    });
  });

  describe("list tool callback", () => {
    it("should return all references in pretty format by default", async () => {
      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => library);

      const result = await capturedCallback?.({});

      expect(result.content).toHaveLength(2);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("smith2024");
    });

    it("should return references in json format", async () => {
      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => library);

      const result = await capturedCallback?.({ format: "json" });

      expect(result.content).toHaveLength(2);
      // Verify JSON is valid
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe("smith2024");
    });

    it("should return references in bibtex format", async () => {
      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => library);

      const result = await capturedCallback?.({ format: "bibtex" });

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain("@");
    });

    it("should return empty array for empty library", async () => {
      const emptyLibraryPath = path.join(tempDir, "empty.json");
      await fs.writeFile(emptyLibraryPath, "[]", "utf-8");
      const emptyLibrary = await Library.load(emptyLibraryPath);

      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => emptyLibrary);

      const result = await capturedCallback?.({});

      expect(result.content).toHaveLength(0);
    });
  });
});
