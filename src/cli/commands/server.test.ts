import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config/schema.js";
import { serverStart, serverStatus, serverStop } from "./server.js";
import type { ServerStartOptions } from "./server.js";

// Mock child_process.spawn for daemon mode tests
vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
    pid: 12345,
  })),
}));

// Create a minimal test config
function createTestConfig(libraryPath: string): Config {
  return {
    library: libraryPath,
    logLevel: "info",
    backup: { maxGenerations: 5, maxAgeDays: 30, directory: os.tmpdir() },
    watch: {
      debounceMs: 500,
      pollIntervalMs: 5000,
      retryIntervalMs: 200,
      maxRetries: 10,
    },
    server: { autoStart: false, autoStopMinutes: 0 },
    citation: {
      defaultStyle: "apa",
      cslDirectory: [],
      defaultLocale: "en-US",
      defaultFormat: "text",
    },
    pubmed: {},
    fulltext: { directory: os.tmpdir() },
  };
}

describe("server command", () => {
  let testPortfilePath: string;
  let mockStdout: string[];
  let mockStderr: string[];
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    // Create unique temp directory for each test
    const tmpDir = os.tmpdir();
    const uniqueDir = path.join(tmpDir, `test-server-${Date.now()}-${Math.random()}`);
    testPortfilePath = path.join(uniqueDir, "server.port");

    mockStdout = [];
    mockStderr = [];

    // Mock stdout/stderr
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    // @ts-expect-error - mocking stdout.write
    process.stdout.write = vi.fn((chunk: string) => {
      mockStdout.push(chunk);
      return true;
    });

    // @ts-expect-error - mocking stderr.write
    process.stderr.write = vi.fn((chunk: string) => {
      mockStderr.push(chunk);
      return true;
    });
  });

  afterEach(async () => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;

    // Clean up test portfile
    try {
      await fs.rm(path.dirname(testPortfilePath), { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("serverStart", () => {
    it("should start server in daemon mode by spawning child process", async () => {
      const libraryPath = "/path/to/library.json";
      const options: ServerStartOptions = {
        daemon: true,
        library: libraryPath,
        portfilePath: testPortfilePath,
        config: createTestConfig(libraryPath),
      };

      await serverStart(options);

      // Verify spawn was called with correct arguments
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(["server", "start", "--library", libraryPath]),
        expect.objectContaining({
          detached: true,
          stdio: "ignore",
        })
      );

      // Verify output message
      const output = mockStdout.join("");
      expect(output).toContain("Server started in background");
    });

    it("should pass port to daemon process when specified", async () => {
      const libraryPath = "/path/to/library.json";
      const options: ServerStartOptions = {
        port: 4000,
        daemon: true,
        library: libraryPath,
        portfilePath: testPortfilePath,
        config: createTestConfig(libraryPath),
      };

      await serverStart(options);

      // Verify spawn was called with port argument
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(["--port", "4000"]),
        expect.any(Object)
      );
    });

    it("should throw error if server already running", async () => {
      // Create existing portfile with valid PID (current process)
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: process.pid, library: "/path/to/library.json" }),
        "utf-8"
      );

      const libraryPath = "/path/to/library.json";
      const options: ServerStartOptions = {
        daemon: true,
        library: libraryPath,
        portfilePath: testPortfilePath,
        config: createTestConfig(libraryPath),
      };

      await expect(serverStart(options)).rejects.toThrow("Server is already running");
    });
  });

  describe("serverStop", () => {
    it("should stop server and remove portfile", async () => {
      // Create portfile with mock PID (use process.pid for testing)
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: process.pid, library: "/path/to/library.json" }),
        "utf-8"
      );

      await serverStop(testPortfilePath);

      // Verify portfile was removed
      const portfileExists = await fs.access(testPortfilePath).then(
        () => true,
        () => false
      );
      expect(portfileExists).toBe(false);

      const output = mockStdout.join("");
      expect(output).toContain("Server stopped");
    });

    it("should throw error if server not running (no portfile)", async () => {
      await expect(serverStop(testPortfilePath)).rejects.toThrow("Server is not running");
    });

    it("should throw error if server not running (process not found)", async () => {
      // Create portfile with non-existent PID
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: 999999, library: "/path/to/library.json" }),
        "utf-8"
      );

      await expect(serverStop(testPortfilePath)).rejects.toThrow("Server is not running");
    });
  });

  describe("serverStatus", () => {
    it("should return server info if running", async () => {
      // Create portfile with current process PID
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({
          port: 3000,
          pid: process.pid,
          library: "/path/to/library.json",
          started_at: "2024-01-01T00:00:00.000Z",
        }),
        "utf-8"
      );

      const status = await serverStatus(testPortfilePath);

      expect(status).not.toBeNull();
      expect(status?.port).toBe(3000);
      expect(status?.pid).toBe(process.pid);
      expect(status?.library).toBe("/path/to/library.json");
      expect(status?.started_at).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should return null if server not running", async () => {
      const status = await serverStatus(testPortfilePath);
      expect(status).toBeNull();
    });

    it("should return null if portfile exists but process not found", async () => {
      // Create portfile with non-existent PID
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: 999999, library: "/path/to/library.json" }),
        "utf-8"
      );

      const status = await serverStatus(testPortfilePath);
      expect(status).toBeNull();
    });
  });
});
