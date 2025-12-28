import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { type RemoveToolParams, registerRemoveTool } from "./remove.js";

describe("MCP remove tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-remove-test-"));
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
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerRemoveTool", () => {
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

      registerRemoveTool(mockServer as never, () => libraryOperations);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("remove");
      expect(registeredTools[0].config.description).toContain("Remove");
    });
  });

  describe("remove tool callback", () => {
    it("should require force: true to remove", async () => {
      let capturedCallback: (
        args: RemoveToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerRemoveTool(mockServer as never, () => libraryOperations);

      // Try to remove without force
      const result = await capturedCallback?.({ id: "smith2024", force: false });

      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("force");
      expect(text.toLowerCase()).toContain("true");

      // Verify reference still exists
      expect(await libraryOperations.find("smith2024")).toBeDefined();
    });

    it("should remove reference when force is true", async () => {
      let capturedCallback: (
        args: RemoveToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerRemoveTool(mockServer as never, () => libraryOperations);

      // Remove with force
      const result = await capturedCallback?.({ id: "smith2024", force: true });

      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("Removed");
      expect(text).toContain("smith2024");

      // Verify reference is gone
      expect(await libraryOperations.find("smith2024")).toBeUndefined();
    });

    it("should report when reference not found", async () => {
      let capturedCallback: (
        args: RemoveToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerRemoveTool(mockServer as never, () => libraryOperations);

      // Try to remove non-existent reference
      const result = await capturedCallback?.({ id: "nonexistent", force: true });

      const text = result.content.map((c) => c.text).join("\n");
      expect(text.toLowerCase()).toContain("not found");
    });

    it("should include removed reference title in response", async () => {
      let capturedCallback: (
        args: RemoveToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerRemoveTool(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.({ id: "jones2023", force: true });

      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("Deep Learning in Healthcare");
    });
  });
});
