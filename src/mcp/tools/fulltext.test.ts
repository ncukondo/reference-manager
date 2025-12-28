import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import {
  type FulltextAttachToolParams,
  type FulltextDetachToolParams,
  type FulltextGetToolParams,
  registerFulltextAttachTool,
  registerFulltextDetachTool,
  registerFulltextGetTool,
} from "./fulltext.js";

describe("MCP fulltext tools", () => {
  let tempDir: string;
  let libraryPath: string;
  let fulltextDir: string;
  let libraryOperations: ILibraryOperations;
  let config: Config;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-fulltext-test-"));
    libraryPath = path.join(tempDir, "references.json");
    fulltextDir = path.join(tempDir, "fulltext");
    await fs.mkdir(fulltextDir, { recursive: true });

    // Create library with test reference
    const testTimestamp = "2024-01-01T00:00:00.000Z";
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "test-uuid-1234",
          created_at: testTimestamp,
          timestamp: testTimestamp,
        },
      },
      {
        id: "jones2023",
        type: "article-journal",
        title: "Deep Learning in Healthcare",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2023]] },
        custom: {
          uuid: "test-uuid-5678",
          created_at: testTimestamp,
          timestamp: testTimestamp,
          fulltext: {
            markdown: "jones2023-test-uuid-5678.md",
          },
        },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);

    // Create existing fulltext file
    await fs.writeFile(
      path.join(fulltextDir, "jones2023-test-uuid-5678.md"),
      "# Test content\n\nThis is test markdown content.",
      "utf-8"
    );

    // Create mock config
    config = {
      library: libraryPath,
      fulltext: {
        directory: fulltextDir,
      },
    } as Config;
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerFulltextAttachTool", () => {
    it("should register tool with correct name and description", () => {
      const registeredTools: Array<{
        name: string;
        config: { description?: string };
      }> = [];

      const mockServer = {
        registerTool: (name: string, toolConfig: { description?: string }, _cb: unknown) => {
          registeredTools.push({ name, config: toolConfig });
        },
      };

      registerFulltextAttachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("fulltext_attach");
      expect(registeredTools[0].config.description).toContain("Attach");
    });

    it("should attach PDF file to reference", async () => {
      // Create a test PDF file
      const testPdfPath = path.join(tempDir, "test.pdf");
      await fs.writeFile(testPdfPath, "%PDF-1.4 test pdf content");

      let capturedCallback: (
        args: FulltextAttachToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextAttachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "smith2024", path: testPdfPath });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Attached");
      expect(result.content[0].text).toContain("pdf");
    });

    it("should return error when reference not found", async () => {
      const testPdfPath = path.join(tempDir, "test.pdf");
      await fs.writeFile(testPdfPath, "%PDF-1.4 test pdf content");

      let capturedCallback: (
        args: FulltextAttachToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextAttachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "nonexistent", path: testPdfPath });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not found");
    });
  });

  describe("registerFulltextGetTool", () => {
    it("should register tool with correct name and description", () => {
      const registeredTools: Array<{
        name: string;
        config: { description?: string };
      }> = [];

      const mockServer = {
        registerTool: (name: string, toolConfig: { description?: string }, _cb: unknown) => {
          registeredTools.push({ name, config: toolConfig });
        },
      };

      registerFulltextGetTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("fulltext_get");
      expect(registeredTools[0].config.description).toContain("Get");
    });

    it("should return markdown content directly", async () => {
      let capturedCallback: (
        args: FulltextGetToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextGetTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "jones2023" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      // Should contain the markdown content
      expect(result.content[0].text).toContain("Test content");
    });

    it("should return error when no fulltext attached", async () => {
      let capturedCallback: (
        args: FulltextGetToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextGetTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "smith2024" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No fulltext");
    });
  });

  describe("registerFulltextDetachTool", () => {
    it("should register tool with correct name and description", () => {
      const registeredTools: Array<{
        name: string;
        config: { description?: string };
      }> = [];

      const mockServer = {
        registerTool: (name: string, toolConfig: { description?: string }, _cb: unknown) => {
          registeredTools.push({ name, config: toolConfig });
        },
      };

      registerFulltextDetachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("fulltext_detach");
      expect(registeredTools[0].config.description).toContain("Detach");
    });

    it("should detach fulltext from reference", async () => {
      let capturedCallback: (
        args: FulltextDetachToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextDetachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "jones2023" });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("Detached");
    });

    it("should return error when no fulltext attached", async () => {
      let capturedCallback: (
        args: FulltextDetachToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerFulltextDetachTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "smith2024" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No fulltext");
    });
  });
});
