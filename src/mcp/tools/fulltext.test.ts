import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import {
  type FulltextAttachToolParams,
  type FulltextDetachToolParams,
  type FulltextFetchToolParams,
  type FulltextGetToolParams,
  registerFulltextAttachTool,
  registerFulltextDetachTool,
  registerFulltextFetchTool,
  registerFulltextGetTool,
} from "./fulltext.js";

describe("MCP fulltext tools", () => {
  let tempDir: string;
  let libraryPath: string;
  let attachmentsDir: string;
  let libraryOperations: ILibraryOperations;
  let config: Config;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-fulltext-test-"));
    libraryPath = path.join(tempDir, "references.json");
    attachmentsDir = path.join(tempDir, "attachments");
    await fs.mkdir(attachmentsDir, { recursive: true });

    // Create library with test references using new attachments format
    const testTimestamp = "2024-01-01T00:00:00.000Z";
    const jonesUuid = "test-uuid-5678-0000-000000000000";
    const jonesDirectory = "jones2023-test-uuid";
    const refs = [
      {
        id: "smith2024",
        type: "article-journal",
        title: "Machine Learning Applications",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "test-uuid-1234-0000-000000000000",
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
          uuid: jonesUuid,
          created_at: testTimestamp,
          timestamp: testTimestamp,
          attachments: {
            directory: jonesDirectory,
            files: [{ filename: "fulltext.md", role: "fulltext", format: "markdown" }],
          },
        },
      },
    ];
    await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);

    // Create existing fulltext file in attachments directory structure
    const jonesDir = path.join(attachmentsDir, jonesDirectory);
    await fs.mkdir(jonesDir, { recursive: true });
    await fs.writeFile(
      path.join(jonesDir, "fulltext.md"),
      "# Test content\n\nThis is test markdown content.",
      "utf-8"
    );

    // Create mock config with attachments section
    config = {
      library: libraryPath,
      attachments: {
        directory: attachmentsDir,
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

    it("should use preferred_type from config", async () => {
      // Create a reference with both PDF and markdown
      const bothUuid = "test-uuid-both-0000-000000000000";
      const bothDirectory = "both2024-test-uuid";
      const refs = [
        {
          id: "both2024",
          type: "article-journal",
          title: "Both Types Article",
          custom: {
            uuid: bothUuid,
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            attachments: {
              directory: bothDirectory,
              files: [
                { filename: "fulltext.pdf", role: "fulltext" },
                { filename: "fulltext.md", role: "fulltext" },
              ],
            },
          },
        },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(refs), "utf-8");
      const library = await Library.load(libraryPath);
      const ops = new OperationsLibrary(library);

      // Create both files
      const bothDir = path.join(attachmentsDir, bothDirectory);
      await fs.mkdir(bothDir, { recursive: true });
      await fs.writeFile(path.join(bothDir, "fulltext.pdf"), "%PDF-1.4 test");
      await fs.writeFile(path.join(bothDir, "fulltext.md"), "# Markdown Content");

      // Config with preferredType = "markdown"
      const configWithPref = {
        ...config,
        fulltext: {
          ...config.fulltext,
          preferredType: "markdown" as const,
        },
      };

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
        () => ops,
        () => configWithPref
      );

      const result = await capturedCallback?.({ id: "both2024" });

      // With preferredType=markdown, markdown content should come first
      expect(result.content.length).toBeGreaterThanOrEqual(1);
      expect(result.content[0].text).toContain("Markdown Content");
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

  describe("registerFulltextFetchTool", () => {
    it("should include diagnostic details in error response", async () => {
      // Mock fulltextFetch to return a failure with diagnostics
      vi.spyOn(
        await import("../../features/operations/fulltext/index.js"),
        "fulltextFetch"
      ).mockResolvedValue({
        success: false,
        error: "No OA sources found for smith2024",
        checkedSources: ["pmc", "unpaywall"],
        discoveryErrors: [{ source: "core", error: "Invalid API key" }],
        attempts: [
          {
            source: "unpaywall",
            phase: "download" as const,
            url: "https://example.com/paper.pdf",
            fileType: "pdf" as const,
            error: "HTTP 403 Forbidden",
          },
        ],
        hint: "https://doi.org/10.1234/test",
      });

      let capturedCallback:
        | ((
            args: FulltextFetchToolParams
          ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>)
        | undefined;

      const mockServer = {
        registerTool: (
          _name: string,
          _config: unknown,
          cb: NonNullable<typeof capturedCallback>
        ) => {
          capturedCallback = cb;
        },
      };

      registerFulltextFetchTool(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      const result = await capturedCallback?.({ id: "smith2024" });

      expect(result?.isError).toBe(true);
      const text = result?.content[0].text ?? "";
      expect(text).toContain("No OA sources found for smith2024");
      expect(text).toContain("Checked: pmc, unpaywall");
      expect(text).toContain("core: Invalid API key");
      expect(text).toContain("unpaywall: PDF download");
      expect(text).toContain("HTTP 403 Forbidden");
      expect(text).toContain("Hint: https://doi.org/10.1234/test");
    });
  });
});
