import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { OperationsLibrary } from "../../features/operations/operations-library.js";
import {
  registerReferenceResource,
  registerReferencesResource,
  registerStylesResource,
} from "./library.js";

describe("MCP library resources", () => {
  let tempDir: string;
  let libraryPath: string;
  let libraryOperations: ILibraryOperations;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-resources-test-"));
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

  describe("registerReferencesResource", () => {
    it("should register resource with correct name and URI", () => {
      const registeredResources: Array<{
        name: string;
        uri: string;
        config: { description?: string; mimeType?: string };
      }> = [];

      const mockServer = {
        registerResource: (
          name: string,
          uri: string,
          config: { description?: string; mimeType?: string },
          _cb: unknown
        ) => {
          registeredResources.push({ name, uri, config });
        },
      };

      registerReferencesResource(mockServer as never, () => libraryOperations);

      expect(registeredResources).toHaveLength(1);
      expect(registeredResources[0].name).toBe("references");
      expect(registeredResources[0].uri).toBe("library://references");
      expect(registeredResources[0].config.mimeType).toBe("application/json");
    });

    it("should return all references as CSL-JSON", async () => {
      let capturedCallback: (
        uri: URL
      ) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          _uri: string,
          _config: unknown,
          cb: typeof capturedCallback
        ) => {
          capturedCallback = cb;
        },
      };

      registerReferencesResource(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.(new URL("library://references"));

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("library://references");
      expect(result.contents[0].mimeType).toBe("application/json");

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("smith2024");
      expect(parsed[1].id).toBe("jones2023");
    });

    it("should return empty array when library is empty", async () => {
      // Create empty library
      const emptyLibraryPath = path.join(tempDir, "empty.json");
      await fs.writeFile(emptyLibraryPath, "[]", "utf-8");
      const emptyLibrary = await Library.load(emptyLibraryPath);

      let capturedCallback: (
        uri: URL
      ) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          _uri: string,
          _config: unknown,
          cb: typeof capturedCallback
        ) => {
          capturedCallback = cb;
        },
      };

      registerReferencesResource(mockServer as never, () => emptyLibrary);

      const result = await capturedCallback?.(new URL("library://references"));

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed).toHaveLength(0);
    });
  });

  describe("registerReferenceResource", () => {
    it("should register resource with URI template", () => {
      const registeredResources: Array<{
        name: string;
        template: ResourceTemplate;
        config: { description?: string; mimeType?: string };
      }> = [];

      const mockServer = {
        registerResource: (
          name: string,
          template: ResourceTemplate,
          config: { description?: string; mimeType?: string },
          _cb: unknown
        ) => {
          registeredResources.push({ name, template, config });
        },
      };

      registerReferenceResource(mockServer as never, () => libraryOperations);

      expect(registeredResources).toHaveLength(1);
      expect(registeredResources[0].name).toBe("reference");
      expect(registeredResources[0].template).toBeInstanceOf(ResourceTemplate);
      expect(registeredResources[0].config.mimeType).toBe("application/json");
    });

    it("should return single reference by ID", async () => {
      let capturedCallback: (
        uri: URL,
        variables: { id: string }
      ) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          _template: ResourceTemplate,
          _config: unknown,
          cb: typeof capturedCallback
        ) => {
          capturedCallback = cb;
        },
      };

      registerReferenceResource(mockServer as never, () => libraryOperations);

      const result = await capturedCallback?.(new URL("library://reference/smith2024"), {
        id: "smith2024",
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("library://reference/smith2024");
      expect(result.contents[0].mimeType).toBe("application/json");

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed.id).toBe("smith2024");
      expect(parsed.title).toBe("Machine Learning Applications");
    });

    it("should throw error when reference not found", async () => {
      let capturedCallback: (
        uri: URL,
        variables: { id: string }
      ) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          _template: ResourceTemplate,
          _config: unknown,
          cb: typeof capturedCallback
        ) => {
          capturedCallback = cb;
        },
      };

      registerReferenceResource(mockServer as never, () => libraryOperations);

      await expect(
        capturedCallback?.(new URL("library://reference/nonexistent"), {
          id: "nonexistent",
        })
      ).rejects.toThrow("Reference not found: nonexistent");
    });

    it("should list all available references", async () => {
      let capturedListCallback: () => Promise<{ resources: Array<{ uri: string; name: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          template: ResourceTemplate,
          _config: unknown,
          _cb: unknown
        ) => {
          if (template.listCallback) {
            capturedListCallback = template.listCallback as typeof capturedListCallback;
          }
        },
      };

      registerReferenceResource(mockServer as never, () => libraryOperations);

      const result = await capturedListCallback?.();

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].uri).toBe("library://reference/smith2024");
      expect(result.resources[0].name).toBe("smith2024");
      expect(result.resources[1].uri).toBe("library://reference/jones2023");
      expect(result.resources[1].name).toBe("jones2023");
    });
  });

  describe("registerStylesResource", () => {
    it("should register resource with correct name and URI", () => {
      const registeredResources: Array<{
        name: string;
        uri: string;
        config: { description?: string; mimeType?: string };
      }> = [];

      const mockServer = {
        registerResource: (
          name: string,
          uri: string,
          config: { description?: string; mimeType?: string },
          _cb: unknown
        ) => {
          registeredResources.push({ name, uri, config });
        },
      };

      registerStylesResource(mockServer as never);

      expect(registeredResources).toHaveLength(1);
      expect(registeredResources[0].name).toBe("styles");
      expect(registeredResources[0].uri).toBe("library://styles");
      expect(registeredResources[0].config.mimeType).toBe("application/json");
    });

    it("should return available citation styles", async () => {
      let capturedCallback: (
        uri: URL
      ) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

      const mockServer = {
        registerResource: (
          _name: string,
          _uri: string,
          _config: unknown,
          cb: typeof capturedCallback
        ) => {
          capturedCallback = cb;
        },
      };

      registerStylesResource(mockServer as never);

      const result = await capturedCallback?.(new URL("library://styles"));

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("library://styles");
      expect(result.contents[0].mimeType).toBe("application/json");

      const parsed = JSON.parse(result.contents[0].text);
      expect(parsed.builtin).toContain("apa");
      expect(parsed.builtin).toContain("vancouver");
      expect(parsed.builtin).toContain("harvard");
    });
  });
});
