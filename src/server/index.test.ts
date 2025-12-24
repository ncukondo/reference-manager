import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../config/schema.js";
import { Library } from "../core/library.js";
import { createServer, startServerWithFileWatcher } from "./index.js";

describe("Server", () => {
  let testLibraryPath: string;
  let testPortfilePath: string;
  let library: Library;
  let config: Config;

  beforeAll(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-server-${Date.now()}.json`);
    testPortfilePath = path.join(tmpDir, `test-server-${Date.now()}.port`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create minimal config
    config = {
      library: testLibraryPath,
      logLevel: "info",
      backup: { maxGenerations: 5, maxAgeDays: 30, directory: os.tmpdir() },
      watch: {
        debounceMs: 1000,
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
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.unlink(testLibraryPath);
      await fs.unlink(testPortfilePath);
    } catch {
      // Ignore
    }
  });

  it("should create a Hono app", () => {
    const app = createServer(library, config);
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should have health route at /health", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  it("should have references routes at /api/references", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/api/references");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should have add route at /api/add", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/api/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: [] }),
    });
    const res = await app.fetch(req);

    // Empty inputs should return 400
    expect(res.status).toBe(400);
  });
});

describe("startServerWithFileWatcher", () => {
  let tempDir: string;
  let libraryPath: string;
  let config: Config;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "server-file-watcher-test-"));
    libraryPath = path.join(tempDir, "references.json");

    // Create empty library file
    await fs.writeFile(libraryPath, "[]", "utf-8");

    // Create config
    config = {
      library: libraryPath,
      logLevel: "info",
      backup: { maxGenerations: 5, maxAgeDays: 30, directory: tempDir },
      watch: {
        debounceMs: 100,
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
      fulltext: { directory: tempDir },
    };
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should create server with file watcher", async () => {
    const result = await startServerWithFileWatcher(libraryPath, config);

    try {
      expect(result.app).toBeDefined();
      expect(result.library).toBeDefined();
      expect(result.fileWatcher).toBeDefined();
      expect(typeof result.dispose).toBe("function");
    } finally {
      await result.dispose();
    }
  });

  it("should start file watcher watching the library file", async () => {
    const result = await startServerWithFileWatcher(libraryPath, config);

    try {
      expect(result.fileWatcher.isWatching()).toBe(true);
      expect(result.fileWatcher.getPath()).toBe(libraryPath);
    } finally {
      await result.dispose();
    }
  });

  it("should reload library on external file change", async () => {
    // Initial library with one reference
    const initialRef = {
      id: "initial2024",
      type: "article-journal",
      title: "Initial Article",
    };
    await fs.writeFile(libraryPath, JSON.stringify([initialRef]), "utf-8");

    const result = await startServerWithFileWatcher(libraryPath, config);

    try {
      expect(await result.library.getAll()).toHaveLength(1);
      expect(await result.library.find("initial2024")).toBeDefined();

      // Simulate external file change
      const newRef = {
        id: "external2024",
        type: "article-journal",
        title: "Externally Added",
      };
      await fs.writeFile(libraryPath, JSON.stringify([newRef]), "utf-8");

      // Emit change event manually (simulating file watcher)
      result.fileWatcher.emit("change");

      // Wait for async reload
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Library should be reloaded with new content
      expect(await result.library.getAll()).toHaveLength(1);
      expect(await result.library.find("external2024")).toBeDefined();
      expect(await result.library.find("initial2024")).toBeUndefined();
    } finally {
      await result.dispose();
    }
  });

  it("should skip reload for self-write (hash matches)", async () => {
    const ref = {
      id: "test2024",
      type: "article-journal",
      title: "Test Article",
    };
    await fs.writeFile(libraryPath, JSON.stringify([ref]), "utf-8");

    const result = await startServerWithFileWatcher(libraryPath, config);

    try {
      // Add a reference and save (self-write)
      const newItem = {
        id: "added2024",
        type: "article-journal" as const,
        title: "Added Item",
      };
      await result.library.add(newItem);
      await result.library.save();

      expect(await result.library.getAll()).toHaveLength(2);

      // Emit change event (as if file watcher detected the self-write)
      result.fileWatcher.emit("change");

      // Wait for async reload attempt
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Library should NOT be reloaded (self-write detected)
      // Both references should still be present
      expect(await result.library.getAll()).toHaveLength(2);
      expect(await result.library.find("test2024")).toBeDefined();
      expect(await result.library.find("added2024")).toBeDefined();
    } finally {
      await result.dispose();
    }
  });

  it("should stop file watcher on dispose", async () => {
    const result = await startServerWithFileWatcher(libraryPath, config);

    expect(result.fileWatcher.isWatching()).toBe(true);

    await result.dispose();

    expect(result.fileWatcher.isWatching()).toBe(false);
  });

  it("should serve requests with reloaded library data", async () => {
    const initialRef = {
      id: "server2024",
      type: "article-journal",
      title: "Server Test",
    };
    await fs.writeFile(libraryPath, JSON.stringify([initialRef]), "utf-8");

    const result = await startServerWithFileWatcher(libraryPath, config);

    try {
      // Verify initial data via API
      const req1 = new Request("http://localhost/api/references");
      const res1 = await result.app.fetch(req1);
      const data1 = await res1.json();
      expect(data1).toHaveLength(1);
      expect(data1[0].id).toBe("server2024");

      // Simulate external file change
      const newRef = {
        id: "updated2024",
        type: "article-journal",
        title: "Updated Article",
      };
      await fs.writeFile(libraryPath, JSON.stringify([newRef]), "utf-8");

      // Emit change event
      result.fileWatcher.emit("change");
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify updated data via API
      const req2 = new Request("http://localhost/api/references");
      const res2 = await result.app.fetch(req2);
      const data2 = await res2.json();
      expect(data2).toHaveLength(1);
      expect(data2[0].id).toBe("updated2024");
    } finally {
      await result.dispose();
    }
  });
});
