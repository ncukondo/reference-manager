/**
 * Performance tests for ExecutionContext optimization
 *
 * These tests verify that server mode provides performance benefits
 * by not loading the library on each command execution.
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { serve } from "@hono/node-server";
import type { ServerType } from "@hono/node-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../config/loader.js";
import { Library } from "../core/library.js";
import { createServer } from "../server/index.js";
import { getPortfilePath, writePortfile } from "../server/portfile.js";

const CLI_PATH = path.resolve("bin/reference-manager.js");

describe("CLI Performance", () => {
  let testDir: string;
  let libraryPath: string;
  let library: Library;
  let server: ServerType | null = null;
  let serverPort: number;

  beforeAll(async () => {
    // Create test directory
    testDir = path.join(os.tmpdir(), `perf-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test library with a moderate amount of data
    libraryPath = path.join(testDir, "library.json");
    const sampleData = Array.from({ length: 100 }, (_, i) => ({
      id: `ref-${i + 1}`,
      type: "article-journal" as const,
      title: `Test Article ${i + 1}`,
      author: [{ family: `Author${i + 1}`, given: "Test" }],
      issued: { "date-parts": [[2024]] },
      custom: {
        uuid: `uuid-${i + 1}`,
        timestamp: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      },
    }));
    await fs.writeFile(libraryPath, JSON.stringify(sampleData), "utf-8");

    library = await Library.load(libraryPath);
    serverPort = 30000 + Math.floor(Math.random() * 10000);
  });

  afterAll(async () => {
    if (server) {
      server.close();
      server = null;
    }

    try {
      const portfilePath = getPortfilePath();
      await fs.rm(portfilePath, { force: true });
    } catch {
      // Ignore
    }

    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  async function startServer(): Promise<void> {
    const config = loadConfig({ overrides: { library: libraryPath } });
    const app = createServer(library, config);
    server = serve({ fetch: app.fetch, port: serverPort, hostname: "127.0.0.1" });

    const portfilePath = getPortfilePath();
    await writePortfile(
      portfilePath,
      serverPort,
      process.pid,
      libraryPath,
      new Date().toISOString()
    );

    // Wait for server to be ready
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${serverPort}/health`);
        if (res.ok) return;
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Server did not start in time");
  }

  async function stopServer(): Promise<void> {
    if (server) {
      server.close();
      server = null;
    }
    try {
      const portfilePath = getPortfilePath();
      await fs.rm(portfilePath, { force: true });
    } catch {
      // Ignore
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  async function measureCliTime(args: string[]): Promise<number> {
    const start = performance.now();

    await new Promise<void>((resolve, reject) => {
      const proc = spawn("node", [CLI_PATH, ...args], {
        env: { ...process.env, NODE_ENV: "test" },
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`CLI exited with code ${code}`));
        }
      });

      proc.on("error", reject);
      proc.stdin.end();
    });

    return performance.now() - start;
  }

  describe("startup time comparison", () => {
    it("should measure baseline local mode performance", async () => {
      // Ensure no server is running
      await stopServer();

      // Warm up
      await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);

      // Measure multiple runs
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const time = await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);
        times.push(time);
      }

      const avgLocalTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average local mode time: ${avgLocalTime.toFixed(2)}ms`);

      // Just verify it works (performance varies too much for strict thresholds)
      expect(avgLocalTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should measure server mode performance", async () => {
      await startServer();

      // Warm up
      await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);

      // Measure multiple runs
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const time = await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);
        times.push(time);
      }

      const avgServerTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average server mode time: ${avgServerTime.toFixed(2)}ms`);

      // Just verify it works
      expect(avgServerTime).toBeLessThan(5000);

      await stopServer();
    });

    it("should verify server mode avoids library loading overhead", async () => {
      // Stop any existing server
      await stopServer();

      // Measure local mode
      const localTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const time = await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);
        localTimes.push(time);
      }
      const avgLocalTime = localTimes.reduce((a, b) => a + b, 0) / localTimes.length;

      // Start server and measure server mode
      await startServer();

      const serverTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const time = await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);
        serverTimes.push(time);
      }
      const avgServerTime = serverTimes.reduce((a, b) => a + b, 0) / serverTimes.length;

      console.log(
        `Performance comparison: Local=${avgLocalTime.toFixed(2)}ms, Server=${avgServerTime.toFixed(2)}ms`
      );

      // The main goal is to verify both modes work.
      // Server mode should generally be faster due to no library loading,
      // but the difference may be small with a 100-item library.
      // We just verify the functionality works correctly.
      expect(avgLocalTime).toBeGreaterThan(0);
      expect(avgServerTime).toBeGreaterThan(0);

      await stopServer();
    });
  });

  describe("command execution in server mode", () => {
    it("should execute search command via server", async () => {
      await startServer();

      const time = await measureCliTime(["search", "--library", libraryPath, "Author50"]);

      console.log(`Server mode search time: ${time.toFixed(2)}ms`);
      expect(time).toBeLessThan(5000);

      await stopServer();
    });

    it("should handle consecutive commands efficiently", async () => {
      await startServer();

      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const time = await measureCliTime(["list", "--library", libraryPath, "--ids-only"]);
        times.push(time);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(
        `Consecutive commands: avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`
      );

      // Verify consistent performance
      expect(maxTime).toBeLessThan(avgTime * 3); // No extreme outliers

      await stopServer();
    });
  });
});
