import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Library } from "../../core/library.js";
import { type AddToolParams, registerAddTool } from "./add.js";

describe("MCP add tool", () => {
  let tempDir: string;
  let libraryPath: string;
  let library: Library;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-add-test-"));
    libraryPath = path.join(tempDir, "references.json");

    // Create empty library
    await fs.writeFile(libraryPath, JSON.stringify([]), "utf-8");
    library = await Library.load(libraryPath);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("registerAddTool", () => {
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

      registerAddTool(mockServer as never, () => library);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("add");
      expect(registeredTools[0].config.description).toContain("Add");
    });
  });

  describe("add tool callback", () => {
    it("should accept string input", async () => {
      let capturedCallback: (
        args: AddToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerAddTool(mockServer as never, () => library);

      // Add CSL-JSON directly
      const cslJson = JSON.stringify({
        id: "test2024",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Test", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      });

      const result = await capturedCallback?.({ input: cslJson });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe("text");
    });

    it("should accept array input", async () => {
      let capturedCallback: (
        args: AddToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerAddTool(mockServer as never, () => library);

      // Add multiple CSL-JSON entries
      const cslJson1 = JSON.stringify({
        id: "first2024",
        type: "article-journal",
        title: "First Article",
        author: [{ family: "First", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      });
      const cslJson2 = JSON.stringify({
        id: "second2024",
        type: "article-journal",
        title: "Second Article",
        author: [{ family: "Second", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      });

      const result = await capturedCallback?.({ input: [cslJson1, cslJson2] });

      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should report added references", async () => {
      let capturedCallback: (
        args: AddToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerAddTool(mockServer as never, () => library);

      const cslJson = JSON.stringify({
        id: "report2024",
        type: "article-journal",
        title: "Report Test",
        author: [{ family: "Report", given: "Tester" }],
        issued: { "date-parts": [[2024]] },
      });

      const result = await capturedCallback?.({ input: cslJson });

      // Should report the added reference
      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("Added");
    });

    it("should report failed inputs", async () => {
      let capturedCallback: (
        args: AddToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerAddTool(mockServer as never, () => library);

      // Invalid input that can't be parsed
      const result = await capturedCallback?.({ input: "invalid-not-a-reference" });

      // Should report the failure
      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("Failed");
    });

    it("should report skipped duplicates", async () => {
      // Pre-add a reference
      const existingRef = {
        id: "existing2024",
        type: "article-journal" as const,
        title: "Existing Article",
        author: [{ family: "Existing", given: "Author" }],
        issued: { "date-parts": [[2024]] as [[number]] },
      };
      await fs.writeFile(libraryPath, JSON.stringify([existingRef]), "utf-8");
      library = await Library.load(libraryPath);

      let capturedCallback: (
        args: AddToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerAddTool(mockServer as never, () => library);

      // Try to add duplicate
      const duplicateCsl = JSON.stringify({
        id: "different-id",
        type: "article-journal",
        title: "Existing Article", // Same title = duplicate
        author: [{ family: "Existing", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      });

      const result = await capturedCallback?.({ input: duplicateCsl });

      // Should report the skip
      const text = result.content.map((c) => c.text).join("\n");
      expect(text).toContain("Skipped");
    });
  });
});
