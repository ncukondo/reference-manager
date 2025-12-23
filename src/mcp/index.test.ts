import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { Readable, Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import { createMcpServer } from "./index.js";

describe("McpServer", () => {
  let tempDir: string;
  let libraryPath: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-server-test-"));
    libraryPath = path.join(tempDir, "references.json");
    configPath = path.join(tempDir, "config.toml");

    // Create empty library file
    await fs.writeFile(libraryPath, "[]", "utf-8");

    // Create config file
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

  describe("createMcpServer", () => {
    it("should create server with name and version from package.json", async () => {
      const mockStdin = new Readable({ read() {} });
      const mockStdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      const { serverInfo, dispose } = await createMcpServer({
        configPath,
        stdin: mockStdin,
        stdout: mockStdout,
      });

      try {
        // Server info should match package.json
        expect(serverInfo.name).toBe(packageJson.name);
        expect(serverInfo.version).toBe(packageJson.version);
      } finally {
        await dispose();
        mockStdin.destroy();
        mockStdout.destroy();
      }
    });

    it("should connect to stdio transport", async () => {
      const mockStdin = new Readable({ read() {} });
      const mockStdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      const { server, dispose } = await createMcpServer({
        configPath,
        stdin: mockStdin,
        stdout: mockStdout,
      });

      try {
        // Server should be connected
        expect(server.isConnected()).toBe(true);
      } finally {
        await dispose();
        mockStdin.destroy();
        mockStdout.destroy();
      }
    });

    it("should provide context with library and config", async () => {
      const mockStdin = new Readable({ read() {} });
      const mockStdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      const { context, dispose } = await createMcpServer({
        configPath,
        stdin: mockStdin,
        stdout: mockStdout,
      });

      try {
        expect(context.library).toBeDefined();
        expect(context.config).toBeDefined();
        expect(context.fileWatcher).toBeDefined();
      } finally {
        await dispose();
        mockStdin.destroy();
        mockStdout.destroy();
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

      const mockStdin = new Readable({ read() {} });
      const mockStdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      const { context, dispose } = await createMcpServer({
        configPath,
        libraryPath: overridePath,
        stdin: mockStdin,
        stdout: mockStdout,
      });

      try {
        const refs = context.library.getAll();
        expect(refs).toHaveLength(1);
        expect(refs[0].getId()).toBe("override2024");
      } finally {
        await dispose();
        mockStdin.destroy();
        mockStdout.destroy();
      }
    });

    it("should dispose server and context on dispose()", async () => {
      const mockStdin = new Readable({ read() {} });
      const mockStdout = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      const { server, dispose } = await createMcpServer({
        configPath,
        stdin: mockStdin,
        stdout: mockStdout,
      });

      await dispose();

      // After dispose, server should be disconnected
      expect(server.isConnected()).toBe(false);

      mockStdin.destroy();
      mockStdout.destroy();
    });
  });
});
