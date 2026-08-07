import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { type ListToolParams, registerListTool } from "./list.js";

// Mock config with MCP settings
const mockConfig = { mcp: { defaultLimit: 20 } } as Config;
const getConfig = () => mockConfig;

describe("MCP list tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

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
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
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

      registerListTool(mockServer as never, () => libraryOperations, getConfig);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("list");
      expect(registeredTools[0].config.description).toContain("List");
    });
  });

  describe("list tool callback", () => {
    it("should return all references as raw CslItem[]", async () => {
      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({});

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(2);
      expect(response.limit).toBe(20); // from mockConfig
      expect(response.offset).toBe(0);
      expect(response.items).toHaveLength(2);
      // Items are raw CslItem objects
      const ids = response.items.map((item: { id: string }) => item.id);
      expect(ids).toContain("smith2024");
      expect(ids).toContain("jones2023");
    });

    it("should return CslItem[] with all fields", async () => {
      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => libraryOperations, getConfig);

      const result = await capturedCallback?.({});

      // Single content block with metadata and items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.items).toHaveLength(2);
      // Verify CslItem structure
      const smithItem = response.items.find((item: { id: string }) => item.id === "smith2024");
      expect(smithItem).toBeDefined();
      expect(smithItem.type).toBe("article-journal");
      expect(smithItem.title).toBe("Machine Learning Applications");
      expect(smithItem.author).toHaveLength(1);
    });

    it("should return empty array for empty library", async () => {
      const emptyLibraryPath = path.join(tempDir, "empty.json");
      await fs.writeFile(emptyLibraryPath, "[]", "utf-8");
      const emptyLibrary = await Library.load(emptyLibraryPath);
      const emptyLibraryOps = new OperationsLibrary(emptyLibrary);

      let capturedCallback: (
        args: ListToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerListTool(mockServer as never, () => emptyLibraryOps, getConfig);

      const result = await capturedCallback?.({});

      // Single content block with metadata and empty items
      expect(result.content).toHaveLength(1);
      const response = JSON.parse(result.content[0].text);
      expect(response.total).toBe(0);
      expect(response.items).toHaveLength(0);
    });
  });
});

describe("MCP list tool superseded handling", () => {
  let tempDir: string;
  let libraryOperations: ILibraryOperations;

  /** Capture the tool callback the way the other tests in this file do. */
  async function callList(
    args: ListToolParams
  ): Promise<{ total: number; items: { id: string }[] }> {
    let capturedCallback:
      | ((args: ListToolParams) => Promise<{ content: Array<{ text: string }> }>)
      | undefined;
    const mockServer = {
      registerTool: (_name: string, _config: unknown, cb: NonNullable<typeof capturedCallback>) => {
        capturedCallback = cb;
      },
    };
    registerListTool(mockServer as never, () => libraryOperations, getConfig);
    const result = await capturedCallback?.(args);
    return JSON.parse(result?.content[0]?.text ?? "{}");
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-list-superseded-"));
    const libraryPath = path.join(tempDir, "references.json");
    await fs.writeFile(
      libraryPath,
      JSON.stringify([
        {
          id: "Carless2023-yt",
          type: "article-journal",
          title: "Version of record",
          custom: {
            uuid: "22222222-2222-4222-8222-222222222222",
            created_at: "2026-01-01T00:00:00.000Z",
            timestamp: "2026-01-01T00:00:00.000Z",
          },
        },
        {
          id: "Carless2020-yj",
          type: "article-journal",
          title: "Online first",
          custom: {
            uuid: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-01-01T00:00:00.000Z",
            timestamp: "2026-01-01T00:00:00.000Z",
            superseded_by: "22222222-2222-4222-8222-222222222222",
            superseded_reason: "duplicate",
            superseded_at: "2026-08-07T00:00:00.000Z",
          },
        },
      ]),
      "utf-8"
    );
    libraryOperations = new OperationsLibrary(await Library.load(libraryPath));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("omits superseded references by default", async () => {
    const response = await callList({});

    expect(response.items.map((i) => i.id)).toEqual(["Carless2023-yt"]);
    expect(response.total).toBe(1);
  });

  // An agent that needs the full library must have a way to ask for it.
  it("includes them with includeSuperseded", async () => {
    const response = await callList({ includeSuperseded: true });

    expect(response.items.map((i) => i.id).sort()).toEqual(["Carless2020-yj", "Carless2023-yt"]);
    expect(response.total).toBe(2);
  });

  it("carries the pointer through so the agent can follow it", async () => {
    const response = await callList({ includeSuperseded: true });
    const superseded = response.items.find((i) => i.id === "Carless2020-yj") as {
      custom?: { superseded_by?: string };
    };

    expect(superseded.custom?.superseded_by).toBe("22222222-2222-4222-8222-222222222222");
  });
});
