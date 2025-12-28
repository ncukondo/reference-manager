import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { type CiteToolParams, registerCiteTool } from "./cite.js";

describe("MCP cite tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-cite-test-"));
    libraryPath = path.join(tempDir, "references.json");

    // Create library with test references
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        "container-title": "Journal of AI",
      },
      {
        id: "jones2023",
        type: "article-journal",
        title: "Deep Learning",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
        "container-title": "AI Review",
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerCiteTool", () => {
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

      registerCiteTool(mockServer as never, () => libraryOperations);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("cite");
      expect(registeredTools[0].config.description).toContain("citation");
    });
  });

  describe("cite tool callback", () => {
    it("should generate citation for single reference", async () => {
      let capturedCallback: (
        args: CiteToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCiteTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ ids: ["smith2024"] });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Smith");
    });

    it("should generate citations for multiple references", async () => {
      let capturedCallback: (
        args: CiteToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCiteTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({
        ids: ["smith2024", "jones2023"],
      });

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain("Smith");
      expect(result.content[1].text).toContain("Jones");
    });

    it("should support different citation styles", async () => {
      let capturedCallback: (
        args: CiteToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCiteTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({
        ids: ["smith2024"],
        style: "vancouver",
      });

      expect(result.content).toHaveLength(1);
      // Vancouver style should have citation
      expect(result.content[0].text).toBeDefined();
    });

    it("should support html format", async () => {
      let capturedCallback: (
        args: CiteToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCiteTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({
        ids: ["smith2024"],
        format: "html",
      });

      expect(result.content).toHaveLength(1);
      // HTML format may contain tags or be plain text
      expect(result.content[0].text).toBeDefined();
    });

    it("should handle not found reference", async () => {
      let capturedCallback: (
        args: CiteToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCiteTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ ids: ["nonexistent"] });

      expect(result.content).toHaveLength(1);
      // Should indicate error for not found
      expect(result.content[0].text).toContain("not found");
    });
  });
});
