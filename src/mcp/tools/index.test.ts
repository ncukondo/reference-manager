import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import { registerAllTools } from "./index.js";

describe("MCP tools registration", () => {
  let tempDir: string;
  let libraryPath: string;
  let library: Library;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-tools-test-"));
    libraryPath = path.join(tempDir, "references.json");
    await fs.writeFile(libraryPath, "[]", "utf-8");
    library = await Library.load(libraryPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerAllTools", () => {
    it("should register all tools (search, list, cite, add, remove)", () => {
      const registeredTools: string[] = [];

      const mockServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredTools.push(name);
        },
      };

      registerAllTools(mockServer as never, () => library);

      expect(registeredTools).toContain("search");
      expect(registeredTools).toContain("list");
      expect(registeredTools).toContain("cite");
      expect(registeredTools).toContain("add");
      expect(registeredTools).toContain("remove");
      expect(registeredTools).toHaveLength(5);
    });
  });
});
