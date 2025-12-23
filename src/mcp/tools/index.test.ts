import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import { registerMvpTools } from "./index.js";

describe("MCP MVP tools registration", () => {
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

  describe("registerMvpTools", () => {
    it("should register all MVP tools (search, list, cite)", () => {
      const registeredTools: string[] = [];

      const mockServer = {
        registerTool: (name: string, _config: unknown, _cb: unknown) => {
          registeredTools.push(name);
        },
      };

      registerMvpTools(mockServer as never, () => library);

      expect(registeredTools).toContain("search");
      expect(registeredTools).toContain("list");
      expect(registeredTools).toContain("cite");
      expect(registeredTools).toHaveLength(3);
    });
  });
});
