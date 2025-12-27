import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type McpStartOptions, mcpStart } from "./mcp.js";

describe("MCP command", () => {
  let tempDir: string;
  let libraryPath: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-cmd-test-"));
    libraryPath = path.join(tempDir, "references.json");
    configPath = path.join(tempDir, "config.toml");

    // Create empty library
    await fs.writeFile(libraryPath, "[]", "utf-8");

    // Create config file
    const configContent = `
library = "${libraryPath.replace(/\\/g, "/")}"

[fulltext]
directory = "${path.join(tempDir, "fulltext").replace(/\\/g, "/")}"

[watch]
debounceMs = 1000
maxRetries = 3
retryIntervalMs = 1000
`;
    await fs.writeFile(configPath, configContent, "utf-8");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("mcpStart", () => {
    it("should create MCP server with default options", async () => {
      // Use custom stdin/stdout to avoid blocking on stdio
      const { PassThrough } = await import("node:stream");
      const mockStdin = new PassThrough();
      const mockStdout = new PassThrough();

      const options: McpStartOptions = {
        configPath,
        stdin: mockStdin,
        stdout: mockStdout,
      };

      const result = await mcpStart(options);

      expect(result).toBeDefined();
      expect(result.serverInfo.name).toBe("@ncukondo/reference-manager");
      expect(typeof result.serverInfo.version).toBe("string");

      // Cleanup
      await result.dispose();
      mockStdin.end();
      mockStdout.end();
    });

    it("should accept custom library path", async () => {
      const { PassThrough } = await import("node:stream");
      const mockStdin = new PassThrough();
      const mockStdout = new PassThrough();

      const customLibraryPath = path.join(tempDir, "custom.json");
      await fs.writeFile(customLibraryPath, "[]", "utf-8");

      const options: McpStartOptions = {
        configPath,
        libraryPath: customLibraryPath,
        stdin: mockStdin,
        stdout: mockStdout,
      };

      const result = await mcpStart(options);

      expect(result).toBeDefined();

      // Cleanup
      await result.dispose();
      mockStdin.end();
      mockStdout.end();
    });
  });
});
