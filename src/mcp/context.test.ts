import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpContext } from "./context.js";

describe("McpContext", () => {
  let tempDir: string;
  let libraryPath: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-context-test-"));
    libraryPath = path.join(tempDir, "references.json");
    configPath = path.join(tempDir, "config.toml");

    // Create empty library file
    await fs.writeFile(libraryPath, "[]", "utf-8");

    // Create config file (library is a string, not an object)
    await fs.writeFile(
      configPath,
      `library = "${libraryPath.replace(/\\/g, "/")}"
`,
      "utf-8"
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("createMcpContext", () => {
    it("should create context with library, config, and file watcher", async () => {
      const ctx = await createMcpContext({ configPath });

      try {
        expect(ctx).toBeDefined();
        expect(ctx.library).toBeDefined();
        expect(ctx.config).toBeDefined();
        expect(ctx.fileWatcher).toBeDefined();
      } finally {
        await ctx.dispose();
      }
    });

    it("should load library from config path", async () => {
      // Add a reference to the library
      const ref = {
        id: "test2024",
        type: "article-journal",
        title: "Test Article",
      };
      await fs.writeFile(libraryPath, JSON.stringify([ref]), "utf-8");

      const ctx = await createMcpContext({ configPath });

      try {
        const refs = ctx.library.getAll();
        expect(refs).toHaveLength(1);
        expect(refs[0].getId()).toBe("test2024");
      } finally {
        await ctx.dispose();
      }
    });

    it("should allow library path override", async () => {
      const overridePath = path.join(tempDir, "override.json");
      const ref = {
        id: "override2024",
        type: "article-journal",
        title: "Override",
      };
      await fs.writeFile(overridePath, JSON.stringify([ref]), "utf-8");

      const ctx = await createMcpContext({
        configPath,
        libraryPath: overridePath,
      });

      try {
        const refs = ctx.library.getAll();
        expect(refs).toHaveLength(1);
        expect(refs[0].getId()).toBe("override2024");
      } finally {
        await ctx.dispose();
      }
    });

    it("should initialize file watcher for library file", async () => {
      const ctx = await createMcpContext({ configPath });

      try {
        // FileWatcher should be watching the library file
        expect(ctx.fileWatcher).toBeDefined();
      } finally {
        await ctx.dispose();
      }
    });

    it("should dispose file watcher on dispose()", async () => {
      const ctx = await createMcpContext({ configPath });
      await ctx.dispose();

      // After dispose, the file watcher should be stopped
      // This mainly ensures no errors occur during dispose
      expect(true).toBe(true);
    });
  });

  describe("McpContext type", () => {
    it("should have library property of type Library", async () => {
      const ctx = await createMcpContext({ configPath });

      try {
        // Verify Library interface
        expect(typeof ctx.library.getAll).toBe("function");
        expect(typeof ctx.library.findById).toBe("function");
        expect(typeof ctx.library.add).toBe("function");
      } finally {
        await ctx.dispose();
      }
    });

    it("should have config property of type Config", async () => {
      const ctx = await createMcpContext({ configPath });

      try {
        // Verify Config has library (string path)
        expect(typeof ctx.config.library).toBe("string");
      } finally {
        await ctx.dispose();
      }
    });
  });
});
