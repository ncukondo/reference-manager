import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config/schema.js";
import { runShutdown, serverStart, serverStatus, serverStop } from "./server.js";
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
    let killSpy: ReturnType<typeof vi.spyOn>;

    // Default mock: the initial signal-0 liveness probe succeeds (hits the
    // real process.kill, which finds the test runner's own PID); once SIGTERM
    // is delivered we flip to reporting ESRCH so the exit-wait loop can
    // confirm shutdown within a single poll iteration. Tests that need a
    // different shape (EPERM, never-exiting, already-gone) override via
    // killSpy.mockImplementation().
    beforeEach(() => {
      const realKill = process.kill.bind(process);
      let sigtermSent = false;
      killSpy = vi.spyOn(process, "kill").mockImplementation(((
        pid: number,
        signal?: string | number
      ) => {
        if (signal === 0 || signal === undefined) {
          if (sigtermSent) {
            const err = new Error("no such process") as NodeJS.ErrnoException;
            err.code = "ESRCH";
            throw err;
          }
          return realKill(pid, signal as number | undefined);
        }
        sigtermSent = true;
        return true;
      }) as typeof process.kill);
    });

    afterEach(() => {
      killSpy.mockRestore();
    });

    // Short timeouts keep serverStop tests snappy — the polling defaults
    // (100ms / 5s) would add seconds of delay to every case.
    const fastWaitOptions = { exitPollIntervalMs: 5, exitWaitTimeoutMs: 100 };

    it("should stop server and remove portfile", async () => {
      // Create portfile with mock PID (use process.pid for testing)
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: process.pid, library: "/path/to/library.json" }),
        "utf-8"
      );

      await serverStop(testPortfilePath, fastWaitOptions);

      // Verify portfile was removed
      const portfileExists = await fs.access(testPortfilePath).then(
        () => true,
        () => false
      );
      expect(portfileExists).toBe(false);

      const output = mockStdout.join("");
      expect(output).toContain("Server stopped");
    });

    it("should send SIGTERM to the server process before removing the portfile", async () => {
      const serverPid = process.pid;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: serverPid, library: "/path/to/library.json" }),
        "utf-8"
      );

      await serverStop(testPortfilePath, fastWaitOptions);

      expect(killSpy).toHaveBeenCalledWith(serverPid, "SIGTERM");
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

    it("should warn on stderr when SIGTERM fails with a non-ESRCH error (e.g. EPERM)", async () => {
      const serverPid = process.pid;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: serverPid, library: "/path/to/library.json" }),
        "utf-8"
      );

      // Simulate a permission error (e.g. process owned by a different user).
      killSpy.mockImplementation(((_pid: number, signal?: string | number) => {
        if (signal === 0 || signal === undefined) {
          // Let liveness probe succeed so serverStatus returns a non-null value.
          return true;
        }
        const err = new Error("permission denied") as NodeJS.ErrnoException;
        err.code = "EPERM";
        throw err;
      }) as typeof process.kill);

      await serverStop(testPortfilePath, fastWaitOptions);

      const stderrOutput = mockStderr.join("");
      expect(stderrOutput).toContain("EPERM");

      // Portfile should still be cleaned up so the CLI is not left in a stuck state.
      const portfileExists = await fs.access(testPortfilePath).then(
        () => true,
        () => false
      );
      expect(portfileExists).toBe(false);
    });

    it("should stay silent when SIGTERM fails with ESRCH (process already gone)", async () => {
      const serverPid = process.pid;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: serverPid, library: "/path/to/library.json" }),
        "utf-8"
      );

      killSpy.mockImplementation(((_pid: number, signal?: string | number) => {
        if (signal === 0 || signal === undefined) {
          return true;
        }
        const err = new Error("no such process") as NodeJS.ErrnoException;
        err.code = "ESRCH";
        throw err;
      }) as typeof process.kill);

      await serverStop(testPortfilePath, fastWaitOptions);

      expect(mockStderr.join("")).toBe("");
    });

    // --- review2 #4: exit-wait polling ---------------------------------------
    // Before this change, serverStop() wrote "Server stopped successfully" the
    // moment it sent SIGTERM, with no confirmation that the server process
    // actually exited. A hung shutdown (e.g. a blocked file flush) would be
    // falsely reported as success. These tests cover the new behavior: after
    // SIGTERM, serverStop polls `process.kill(pid, 0)` until it throws ESRCH
    // (success) or a short timeout elapses (stderr warning).

    it("should report success after SIGTERM once the server PID exits", async () => {
      const serverPid = process.pid;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: serverPid, library: "/path/to/library.json" }),
        "utf-8"
      );

      // Simulate: the server exits in response to SIGTERM. The first liveness
      // probe (serverStatus() -> isProcessRunning()) must still succeed so the
      // "not running" branch is not taken; after SIGTERM is sent, subsequent
      // signal-0 probes throw ESRCH to signal that the process is gone.
      let sigtermSent = false;
      killSpy.mockImplementation(((_pid: number, signal?: string | number) => {
        if (signal === 0 || signal === undefined) {
          if (!sigtermSent) return true;
          const err = new Error("no such process") as NodeJS.ErrnoException;
          err.code = "ESRCH";
          throw err;
        }
        sigtermSent = true;
        return true;
      }) as typeof process.kill);

      await serverStop(testPortfilePath, { exitPollIntervalMs: 5, exitWaitTimeoutMs: 200 });

      expect(mockStdout.join("")).toContain("Server stopped successfully");
      expect(mockStderr.join("")).toBe("");
    });

    it("should warn on stderr when the server PID does not exit before timeout", async () => {
      const serverPid = process.pid;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        testPortfilePath,
        JSON.stringify({ port: 3000, pid: serverPid, library: "/path/to/library.json" }),
        "utf-8"
      );

      // Simulate a hung shutdown: SIGTERM "delivers" (no throw) but the
      // process keeps responding to signal-0 probes, so the exit-wait loop
      // runs to its timeout.
      killSpy.mockImplementation(((_pid: number, signal?: string | number) => {
        if (signal === 0 || signal === undefined) {
          return true;
        }
        return true;
      }) as typeof process.kill);

      await serverStop(testPortfilePath, { exitPollIntervalMs: 5, exitWaitTimeoutMs: 30 });

      const stderr = mockStderr.join("");
      expect(stderr).toContain("did not exit");
      expect(stderr).toContain(String(serverPid));
      // Success message must NOT appear when shutdown is not confirmed —
      // that was the bug we are fixing.
      expect(mockStdout.join("")).not.toContain("Server stopped successfully");
    });
  });

  describe("runShutdown", () => {
    // runShutdown is the extracted cleanup handler invoked on SIGINT/SIGTERM.
    // It must NOT clobber process.exitCode — if dispose() flagged a shutdown
    // failure (e.g. library.save() rejected), that non-zero code needs to
    // survive to process exit. See review2 #1.

    it("should preserve process.exitCode=1 when dispose sets it to signal save failure", async () => {
      const originalExitCode = process.exitCode;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(testPortfilePath, "{}", "utf-8");

      const fakeServer = { close: vi.fn() };
      const dispose = vi.fn(async () => {
        process.exitCode = 1;
      });

      try {
        process.exitCode = undefined;
        await runShutdown(fakeServer, dispose, testPortfilePath);
        expect(process.exitCode).toBe(1);
        expect(dispose).toHaveBeenCalledTimes(1);
        expect(fakeServer.close).toHaveBeenCalledTimes(1);
      } finally {
        process.exitCode = originalExitCode;
      }
    });

    it("should leave process.exitCode untouched on clean shutdown", async () => {
      const originalExitCode = process.exitCode;
      const dir = path.dirname(testPortfilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(testPortfilePath, "{}", "utf-8");

      const fakeServer = { close: vi.fn() };
      const dispose = vi.fn(async () => {});

      try {
        process.exitCode = undefined;
        await runShutdown(fakeServer, dispose, testPortfilePath);
        // Node exits with 0 when exitCode is left undefined — there is no
        // need to explicitly set SUCCESS here, and doing so would erase any
        // non-zero code a concurrent failure path may have set.
        expect(process.exitCode).toBeUndefined();
      } finally {
        process.exitCode = originalExitCode;
      }
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
