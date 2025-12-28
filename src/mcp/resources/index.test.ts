import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import { registerAllResources } from "./index.js";

describe("MCP resources registration", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-resources-test-"));
    libraryPath = path.join(tempDir, "references.json");
    await fs.writeFile(libraryPath, "[]", "utf-8");
    const library = await Library.load(libraryPath);
    libraryOperations = new OperationsLibrary(library);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerAllResources", () => {
    it("should register all resources (references, reference, styles)", () => {
      const registeredResources: Array<{ name: string; uri: string | ResourceTemplate }> = [];

      const mockServer = {
        registerResource: (
          name: string,
          uriOrTemplate: string | ResourceTemplate,
          _config: unknown,
          _cb: unknown
        ) => {
          registeredResources.push({ name, uri: uriOrTemplate });
        },
      };

      registerAllResources(mockServer as never, () => libraryOperations);

      expect(registeredResources).toHaveLength(3);

      const names = registeredResources.map((r) => r.name);
      expect(names).toContain("references");
      expect(names).toContain("reference");
      expect(names).toContain("styles");

      // Check URIs
      const referencesResource = registeredResources.find((r) => r.name === "references");
      expect(referencesResource?.uri).toBe("library://references");

      const referenceResource = registeredResources.find((r) => r.name === "reference");
      expect(referenceResource?.uri).toBeInstanceOf(ResourceTemplate);

      const stylesResource = registeredResources.find((r) => r.name === "styles");
      expect(stylesResource?.uri).toBe("library://styles");
    });
  });
});
