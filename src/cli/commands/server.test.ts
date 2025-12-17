import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serverStart, serverStatus, serverStop } from "./server.js";
import type { ServerStartOptions } from "./server.js";

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
    it("should start server in daemon mode and create portfile", async () => {
      const options: ServerStartOptions = {
        daemon: true,
        library: "/path/to/library.json",
        portfilePath: testPortfilePath,
      };

      await serverStart(options);

      // Verify portfile was created
      const portfileExists = await fs.access(testPortfilePath).then(
        () => true,
        () => false
      );
      expect(portfileExists).toBe(true);

      // Verify portfile content
      const content = await fs.readFile(testPortfilePath, "utf-8");
      const data = JSON.parse(content);
      expect(data).toHaveProperty("port");
      expect(data).toHaveProperty("pid");
      expect(data.library).toBe("/path/to/library.json");
    });

    it("should start server on specified port", async () => {
      const options: ServerStartOptions = {
        port: 4000,
        daemon: true,
        library: "/path/to/library.json",
        portfilePath: testPortfilePath,
      };

      await serverStart(options);

      const content = await fs.readFile(testPortfilePath, "utf-8");
      const data = JSON.parse(content);
      expect(data.port).toBe(4000);
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

      const options: ServerStartOptions = {
        daemon: true,
        library: "/path/to/library.json",
        portfilePath: testPortfilePath,
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
