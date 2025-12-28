import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { registerAllTools } from "./index.js";

describe("MCP tools registration", () => {
  let tempDir: string;
  let libraryPath: string;
  let fulltextDir: string;
  let libraryOperations: ILibraryOperations;
  let config: Config;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-tools-test-"));
    libraryPath = path.join(tempDir, "references.json");
    fulltextDir = path.join(tempDir, "fulltext");
    await fs.writeFile(libraryPath, "[]", "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
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

  describe("registerAllTools", () => {
    it("should register all tools (search, list, cite, add, remove, fulltext_*)", () => {
      const registeredTools: string[] = [];

      const mockServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredTools.push(name);
        },
      };

      registerAllTools(
        mockServer as never,
        () => libraryOperations,
        () => config
      );

      expect(registeredTools).toContain("search");
      expect(registeredTools).toContain("list");
      expect(registeredTools).toContain("cite");
      expect(registeredTools).toContain("add");
      expect(registeredTools).toContain("remove");
      expect(registeredTools).toContain("fulltext_attach");
      expect(registeredTools).toContain("fulltext_get");
      expect(registeredTools).toContain("fulltext_detach");
      expect(registeredTools).toHaveLength(8);
    });
  });
});
